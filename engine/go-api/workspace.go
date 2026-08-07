package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

type Project struct {
	Slug        string `json:"slug"`
	Name        string `json:"name"`
	Language    string `json:"language"`
	Description string `json:"description"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

type FileNode struct {
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	Type     string     `json:"type"`
	Children []FileNode `json:"children,omitempty"`
}

type WorkspaceStore struct {
	root string
}

func NewWorkspaceStore(root string) *WorkspaceStore {
	_ = os.MkdirAll(root, 0o755)
	return &WorkspaceStore{root: root}
}

func (s *WorkspaceStore) metaPath(slug string) string {
	return filepath.Join(s.root, slug, "project.json")
}

func (s *WorkspaceStore) projectDir(slug string) (string, error) {
	if slug == "" || strings.Contains(slug, "..") || strings.ContainsAny(slug, "/\\") {
		return "", errors.New("invalid slug")
	}
	return filepath.Join(s.root, slug), nil
}

func (s *WorkspaceStore) List() ([]Project, error) {
	entries, err := os.ReadDir(s.root)
	if err != nil {
		return nil, err
	}
	out := []Project{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		p, err := s.Get(e.Name())
		if err != nil {
			continue
		}
		out = append(out, *p)
	}
	return out, nil
}

func (s *WorkspaceStore) Get(slug string) (*Project, error) {
	b, err := os.ReadFile(s.metaPath(slug))
	if err != nil {
		return nil, errors.New("project not found")
	}
	var p Project
	if err := json.Unmarshal(b, &p); err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *WorkspaceStore) Create(name, language, description string) (*Project, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("name required")
	}
	tmpl, ok := templates[language]
	if !ok {
		return nil, errors.New("unsupported language")
	}
	slug := slugify(name)
	dir, err := s.projectDir(slug)
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(dir); err == nil {
		return nil, errors.New("project already exists")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	p := &Project{
		Slug:        slug,
		Name:        name,
		Language:    language,
		Description: description,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if p.Description == "" {
		p.Description = tmpl.Description
	}
	for path, content := range tmpl.Files {
		full := filepath.Join(dir, path)
		if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
			return nil, err
		}
		if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
			return nil, err
		}
	}
	b, _ := json.MarshalIndent(p, "", "  ")
	if err := os.WriteFile(s.metaPath(slug), b, 0o644); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *WorkspaceStore) ListTree(slug string) ([]FileNode, error) {
	dir, err := s.projectDir(slug)
	if err != nil {
		return nil, err
	}
	return walkTree(dir, "")
}

func walkTree(root, rel string) ([]FileNode, error) {
	dir := root
	if rel != "" {
		dir = filepath.Join(root, rel)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	nodes := []FileNode{}
	for _, e := range entries {
		name := e.Name()
		if name == "project.json" || strings.HasPrefix(name, ".") {
			continue
		}
		childRel := name
		if rel != "" {
			childRel = filepath.ToSlash(filepath.Join(rel, name))
		}
		if e.IsDir() {
			kids, err := walkTree(root, childRel)
			if err != nil {
				return nil, err
			}
			nodes = append(nodes, FileNode{Name: name, Path: childRel, Type: "directory", Children: kids})
		} else {
			nodes = append(nodes, FileNode{Name: name, Path: childRel, Type: "file"})
		}
	}
	return nodes, nil
}

func (s *WorkspaceStore) safeFile(slug, rel string) (string, error) {
	dir, err := s.projectDir(slug)
	if err != nil {
		return "", err
	}
	clean := filepath.Clean("/" + rel)
	clean = strings.TrimPrefix(clean, "/")
	if clean == "" || clean == "project.json" || strings.Contains(clean, "..") {
		return "", errors.New("invalid path")
	}
	full := filepath.Join(dir, clean)
	if !strings.HasPrefix(full, dir+string(os.PathSeparator)) && full != dir {
		return "", errors.New("path escape")
	}
	return full, nil
}

func (s *WorkspaceStore) ReadFile(slug, rel string) (string, error) {
	full, err := s.safeFile(slug, rel)
	if err != nil {
		return "", err
	}
	b, err := os.ReadFile(full)
	if err != nil {
		return "", errors.New("file not found")
	}
	return string(b), nil
}

func (s *WorkspaceStore) WriteFile(slug, rel, content string) error {
	full, err := s.safeFile(slug, rel)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(full, []byte(content), 0o644); err != nil {
		return err
	}
	if p, err := s.Get(slug); err == nil {
		p.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		b, _ := json.MarshalIndent(p, "", "  ")
		_ = os.WriteFile(s.metaPath(slug), b, 0o644)
	}
	return nil
}

func (s *WorkspaceStore) EnsureSeed() error {
	projects, _ := s.List()
	if len(projects) > 0 {
		return nil
	}
	seeds := []struct{ name, lang, desc string }{
		{"Hello Python", "python", "Sample Python repl"},
		{"Hello JavaScript", "javascript", "Sample Node.js repl"},
		{"Hello Web", "html", "Sample HTML / CSS / JS repl"},
	}
	for _, seed := range seeds {
		if _, err := s.Create(seed.name, seed.lang, seed.desc); err != nil {
			return err
		}
	}
	return nil
}

func slugify(name string) string {
	name = strings.ToLower(strings.TrimSpace(name))
	re := regexp.MustCompile(`[^a-z0-9]+`)
	slug := re.ReplaceAllString(name, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "repl"
	}
	return slug
}

type templateDef struct {
	ID          string
	Label       string
	Description string
	Entry       string
	Files       map[string]string
}

var templates = map[string]templateDef{
	"python": {
		ID: "python", Label: "Python", Description: "Run Python in a sandboxed console", Entry: "main.py",
		Files: map[string]string{
			"main.py":   "# Welcome to Aether\nprint(\"Hello from Aether!\")\nprint(2 + 2)\n",
			"README.md": "# Python Repl\n\nEdit `main.py` and press **Run**.\n",
		},
	},
	"javascript": {
		ID: "javascript", Label: "JavaScript (Node)", Description: "Run JavaScript with Node.js", Entry: "index.js",
		Files: map[string]string{
			"index.js":  "// Welcome to Aether\nconsole.log(\"Hello from Aether!\");\nconsole.log(\"2 + 2 =\", 2 + 2);\n",
			"README.md": "# JavaScript Repl\n\nEdit `index.js` and press **Run**.\n",
		},
	},
	"html": {
		ID: "html", Label: "HTML / CSS / JS", Description: "Static web page with live preview", Entry: "index.html",
		Files: map[string]string{
			"index.html": "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"/><title>Aether</title><link rel=\"stylesheet\" href=\"style.css\"/></head><body><h1>Hello, web</h1><script src=\"script.js\"></script></body></html>\n",
			"style.css":  "body{font-family:system-ui;background:#0c1118;color:#e8eef7;padding:2rem}\n",
			"script.js":  "console.log(\"Aether web repl\");\n",
			"README.md":  "# Web Repl\n\nEdit files and use **Preview**.\n",
		},
	},
}

func templatesPublic() []map[string]string {
	order := []string{"python", "javascript", "html"}
	out := make([]map[string]string, 0, len(order))
	for _, id := range order {
		t := templates[id]
		out = append(out, map[string]string{
			"id": t.ID, "label": t.Label, "description": t.Description, "entry": t.Entry,
		})
	}
	return out
}
