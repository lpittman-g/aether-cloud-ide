package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := loadConfig()
	store := NewWorkspaceStore(cfg.Workspace)
	if err := store.EnsureSeed(); err != nil {
		log.Printf("seed warning: %v", err)
	}

	var rdb *redis.Client
	if cfg.RedisURL != "" {
		opt, err := redis.ParseURL(cfg.RedisURL)
		if err == nil {
			rdb = redis.NewClient(opt)
			if err := rdb.Ping(context.Background()).Err(); err != nil {
				log.Printf("redis unavailable, continuing without: %v", err)
				rdb = nil
			} else {
				log.Printf("redis connected")
			}
		}
	}

	hub := NewHub(rdb)
	go hub.Run()

	s := &Server{
		cfg:   cfg,
		store: store,
		hub:   hub,
		rdb:   rdb,
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, middleware.Logger, middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.ClientOrigin, "http://localhost:3000", "*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	r.Get("/api/health", s.handleHealth)
	r.Get("/api/stack", s.handleStack)
	r.Get("/api/templates", s.handleTemplates)
	r.Get("/api/projects", s.handleListProjects)
	r.Post("/api/projects", s.handleCreateProject)
	r.Get("/api/projects/{slug}", s.handleGetProject)
	r.Get("/api/projects/{slug}/files", s.handleListFiles)
	r.Get("/api/projects/{slug}/files/*", s.handleReadFile)
	r.Put("/api/projects/{slug}/files/*", s.handleWriteFile)
	r.Post("/api/run", s.handleRun)
	r.Post("/api/agent", s.handleAgent)
	r.Get("/ws", s.handleWS)

	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("Aether Go engine listening on %s (workspace=%s sandbox=%s ai=%s)",
		addr, cfg.Workspace, cfg.SandboxBin, cfg.AIURL)
	log.Fatal(http.ListenAndServe(addr, r))
}

type Config struct {
	Port         int
	Workspace    string
	ClientOrigin string
	SandboxBin   string
	AIURL        string
	RedisURL     string
	DatabaseURL  string
}

func loadConfig() Config {
	port := 4000
	if v := os.Getenv("PORT"); v != "" {
		fmt.Sscanf(v, "%d", &port)
	}
	ws := os.Getenv("WORKSPACE_ROOT")
	if ws == "" {
		ws = filepath.Join("..", "..", "workspace")
	}
	abs, err := filepath.Abs(ws)
	if err == nil {
		ws = abs
	}
	sandbox := os.Getenv("AETHER_SANDBOX")
	if sandbox == "" {
		sandbox = filepath.Join("..", "sandbox-rust", "target", "release", "aether-sandbox")
		if _, err := os.Stat(sandbox); err != nil {
			sandbox = filepath.Join("..", "sandbox-rust", "target", "debug", "aether-sandbox")
		}
	}
	ai := os.Getenv("AETHER_AI_URL")
	if ai == "" {
		ai = "http://127.0.0.1:5001"
	}
	origin := os.Getenv("CLIENT_ORIGIN")
	if origin == "" {
		origin = "http://localhost:3000"
	}
	return Config{
		Port:         port,
		Workspace:    ws,
		ClientOrigin: origin,
		SandboxBin:   sandbox,
		AIURL:        ai,
		RedisURL:     firstEnv("REDIS_URL", "redis://127.0.0.1:6379/0"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
	}
}

func firstEnv(keys ...string) string {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			return v
		}
	}
	return ""
}

type Server struct {
	cfg   Config
	store *WorkspaceStore
	hub   *Hub
	rdb   *redis.Client
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	mode := "rust-sandbox"
	if _, err := os.Stat(s.cfg.SandboxBin); err != nil {
		mode = "process-fallback"
	}
	aiOK := false
	ctx, cancel := context.WithTimeout(r.Context(), 800*time.Millisecond)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, strings.TrimRight(s.cfg.AIURL, "/")+"/health", nil)
	if resp, err := http.DefaultClient.Do(req); err == nil {
		aiOK = resp.StatusCode == 200
		resp.Body.Close()
	}
	redisOK := false
	if s.rdb != nil {
		redisOK = s.rdb.Ping(r.Context()).Err() == nil
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"engine":    "go",
		"sandbox":   mode,
		"ai":        aiOK,
		"redis":     redisOK,
		"workspace": s.cfg.Workspace,
		"stack":     []string{"typescript", "go", "python", "rust", "wasm", "postgres", "redis", "docker"},
	})
}

func (s *Server) handleStack(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, stackPayload)
}

func (s *Server) handleTemplates(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"templates": templatesPublic()})
}

func (s *Server) handleListProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := s.store.List()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"projects": projects})
}

func (s *Server) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string `json:"name"`
		Language    string `json:"language"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, 400, "invalid json")
		return
	}
	p, err := s.store.Create(body.Name, body.Language, body.Description)
	if err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"project": p})
}

func (s *Server) handleGetProject(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	p, err := s.store.Get(slug)
	if err != nil {
		writeErr(w, 404, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project": p})
}

func (s *Server) handleListFiles(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	tree, err := s.store.ListTree(slug)
	if err != nil {
		writeErr(w, 404, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tree": tree})
}

func (s *Server) handleReadFile(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	path := strings.TrimPrefix(chi.URLParam(r, "*"), "/")
	content, err := s.store.ReadFile(slug, path)
	if err != nil {
		writeErr(w, 404, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"path": path, "content": content})
}

func (s *Server) handleWriteFile(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	path := strings.TrimPrefix(chi.URLParam(r, "*"), "/")
	var body struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, 400, "invalid json")
		return
	}
	if err := s.store.WriteFile(slug, path, body.Content); err != nil {
		writeErr(w, 400, err.Error())
		return
	}
	s.hub.Broadcast(slug, map[string]any{
		"type": "file:update",
		"path": path,
	})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *Server) handleRun(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Language string `json:"language"`
		Code     string `json:"code"`
		Stdin    string `json:"stdin"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, 400, "invalid json")
		return
	}
	if strings.TrimSpace(body.Code) == "" {
		writeErr(w, 400, "Code is empty")
		return
	}
	result, err := s.execute(body.Language, body.Code, body.Stdin, nil)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleAgent(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeErr(w, 400, "invalid body")
		return
	}
	url := strings.TrimRight(s.cfg.AIURL, "/") + "/v1/agent"
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, url, strings.NewReader(string(body)))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":      false,
			"engine":  "python-ai",
			"message": "AI service offline — start engine/ai-python",
			"error":   err.Error(),
		})
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

func (s *Server) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	client := &Client{hub: s.hub, conn: conn, send: make(chan []byte, 32)}
	s.hub.register <- client
	go client.writePump()
	go client.readPump(s)
}

type RunResult struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exitCode"`
	Mode     string `json:"mode"`
	TimedOut bool   `json:"timedOut"`
}

type streamHandlers struct {
	onStdout func(string)
	onStderr func(string)
}

func (s *Server) execute(language, code, stdin string, h *streamHandlers) (*RunResult, error) {
	lang := strings.ToLower(language)
	if lang != "javascript" && lang != "python" {
		return nil, fmt.Errorf("unsupported language")
	}

	if _, err := os.Stat(s.cfg.SandboxBin); err == nil {
		return s.runRustSandbox(lang, code, stdin, h)
	}
	return s.runProcessFallback(lang, code, stdin, h)
}

func (s *Server) runRustSandbox(lang, code, stdin string, h *streamHandlers) (*RunResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, s.cfg.SandboxBin, "--language", lang)
	cmd.Stdin = strings.NewReader(code)
	if stdin != "" {
		// rust sandbox reads code from stdin; optional second channel via env
		cmd.Env = append(os.Environ(), "AETHER_STDIN="+stdin)
	}
	stdout, stderr, err := streamCmd(cmd, h)
	timedOut := ctx.Err() == context.DeadlineExceeded
	exit := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			exit = ee.ExitCode()
		} else if timedOut {
			exit = 124
		} else {
			return nil, err
		}
	}
	return &RunResult{Stdout: stdout, Stderr: stderr, ExitCode: exit, Mode: "rust", TimedOut: timedOut}, nil
}

func (s *Server) runProcessFallback(lang, code, stdin string, h *streamHandlers) (*RunResult, error) {
	dir, err := os.MkdirTemp("", "aether-run-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(dir)

	var file, bin string
	var args []string
	if lang == "python" {
		file = filepath.Join(dir, "main.py")
		bin = "python3"
		args = []string{file}
	} else {
		file = filepath.Join(dir, "main.js")
		bin = "node"
		args = []string{file}
	}
	if err := os.WriteFile(file, []byte(code), 0o600); err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Dir = dir
	if stdin != "" {
		cmd.Stdin = strings.NewReader(stdin)
	}
	stdout, stderr, err := streamCmd(cmd, h)
	timedOut := ctx.Err() == context.DeadlineExceeded
	exit := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			exit = ee.ExitCode()
		} else if timedOut {
			exit = 124
		} else {
			return nil, err
		}
	}
	return &RunResult{Stdout: stdout, Stderr: stderr, ExitCode: exit, Mode: "process", TimedOut: timedOut}, nil
}

func streamCmd(cmd *exec.Cmd, h *streamHandlers) (string, string, error) {
	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return "", "", err
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return "", "", err
	}
	if err := cmd.Start(); err != nil {
		return "", "", err
	}
	var stdout, stderr strings.Builder
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		buf := make([]byte, 1024)
		for {
			n, err := stdoutPipe.Read(buf)
			if n > 0 {
				chunk := string(buf[:n])
				stdout.WriteString(chunk)
				if h != nil && h.onStdout != nil {
					h.onStdout(chunk)
				}
			}
			if err != nil {
				return
			}
		}
	}()
	go func() {
		defer wg.Done()
		buf := make([]byte, 1024)
		for {
			n, err := stderrPipe.Read(buf)
			if n > 0 {
				chunk := string(buf[:n])
				stderr.WriteString(chunk)
				if h != nil && h.onStderr != nil {
					h.onStderr(chunk)
				}
			}
			if err != nil {
				return
			}
		}
	}()
	wg.Wait()
	err = cmd.Wait()
	return stdout.String(), stderr.String(), err
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
