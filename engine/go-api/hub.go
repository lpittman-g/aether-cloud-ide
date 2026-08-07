package main

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type Hub struct {
	mu         sync.RWMutex
	clients    map[*Client]bool
	rooms      map[string]map[*Client]bool
	broadcast  chan roomMessage
	register   chan *Client
	unregister chan *Client
	rdb        *redis.Client
}

type roomMessage struct {
	room string
	data []byte
}

type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	room string
}

func NewHub(rdb *redis.Client) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		rooms:      make(map[string]map[*Client]bool),
		broadcast:  make(chan roomMessage, 64),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		rdb:        rdb,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = true
			h.mu.Unlock()
			_ = c.conn.WriteJSON(map[string]any{"type": "ready", "message": "Connected to Aether Go engine"})
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				if c.room != "" {
					delete(h.rooms[c.room], c)
				}
				close(c.send)
			}
			h.mu.Unlock()
		case msg := <-h.broadcast:
			h.mu.RLock()
			for c := range h.rooms[msg.room] {
				select {
				case c.send <- msg.data:
				default:
				}
			}
			h.mu.RUnlock()
			if h.rdb != nil {
				_ = h.rdb.Publish(context.Background(), "aether:room:"+msg.room, msg.data).Err()
			}
		}
	}
}

func (h *Hub) Join(c *Client, room string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if c.room != "" {
		delete(h.rooms[c.room], c)
	}
	c.room = room
	if h.rooms[room] == nil {
		h.rooms[room] = make(map[*Client]bool)
	}
	h.rooms[room][c] = true
}

func (h *Hub) Broadcast(room string, payload any) {
	b, err := json.Marshal(payload)
	if err != nil {
		return
	}
	h.broadcast <- roomMessage{room: room, data: b}
}

func (c *Client) writePump() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}

func (c *Client) readPump(s *Server) {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		var msg map[string]any
		if err := json.Unmarshal(data, &msg); err != nil {
			continue
		}
		typ, _ := msg["type"].(string)
		switch typ {
		case "join":
			room, _ := msg["room"].(string)
			if room != "" {
				c.hub.Join(c, room)
				_ = c.conn.WriteJSON(map[string]any{"type": "joined", "room": room})
			}
		case "run":
			lang, _ := msg["language"].(string)
			code, _ := msg["code"].(string)
			_ = c.conn.WriteJSON(map[string]any{"type": "run:start", "language": lang})
			result, err := s.execute(lang, code, "", &streamHandlers{
				onStdout: func(chunk string) {
					_ = c.conn.WriteJSON(map[string]any{"type": "run:stdout", "chunk": chunk})
				},
				onStderr: func(chunk string) {
					_ = c.conn.WriteJSON(map[string]any{"type": "run:stderr", "chunk": chunk})
				},
			})
			if err != nil {
				_ = c.conn.WriteJSON(map[string]any{"type": "run:error", "error": err.Error()})
				continue
			}
			_ = c.conn.WriteJSON(map[string]any{
				"type": "run:end", "exitCode": result.ExitCode, "mode": result.Mode, "timedOut": result.TimedOut,
			})
		case "cursor":
			if c.room != "" {
				c.hub.Broadcast(c.room, msg)
			}
		}
	}
}
