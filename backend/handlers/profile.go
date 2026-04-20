package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	db "github.com/graysonmalone/music-discovery-log/db/generated"
	"github.com/graysonmalone/music-discovery-log/middleware"
)

type ProfileHandler struct {
	Queries *db.Queries
	DB      *sql.DB
}

type profileResponse struct {
	User   profileUser `json:"user"`
	Counts tagCounts   `json:"counts"`
}

type profileUser struct {
	ID        int32     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type tagCounts struct {
	Loved        int `json:"loved"`
	WantToListen int `json:"want_to_listen"`
	Overrated    int `json:"overrated"`
	PutOn        int `json:"put_on"`
}

func (h *ProfileHandler) UpdateName(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || len(req.Name) == 0 {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}
	if len(req.Name) > 100 {
		http.Error(w, `{"error":"name too long"}`, http.StatusBadRequest)
		return
	}

	_, err := h.DB.ExecContext(r.Context(), `UPDATE users SET name = ? WHERE id = ?`, req.Name, userID)
	if err != nil {
		log.Printf("update name error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"name": req.Name})
}

func (h *ProfileHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	user, err := h.Queries.GetUserByID(r.Context(), userID)
	if err != nil {
		log.Printf("get user error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	counts := tagCounts{}
	for _, tag := range []string{"loved", "want_to_listen", "overrated", "put_on"} {
		var count int
		h.DB.QueryRowContext(r.Context(),
			`SELECT COUNT(*) FROM collection_entries
			 WHERE user_id = ? AND JSON_CONTAINS(COALESCE(tags, JSON_ARRAY(tag)), JSON_QUOTE(?))`,
			userID, tag).Scan(&count)
		switch tag {
		case "loved":
			counts.Loved = count
		case "want_to_listen":
			counts.WantToListen = count
		case "overrated":
			counts.Overrated = count
		case "put_on":
			counts.PutOn = count
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profileResponse{
		User: profileUser{
			ID:        user.ID,
			Name:      user.Name,
			Email:     user.Email,
			CreatedAt: user.CreatedAt,
		},
		Counts: counts,
	})
}
