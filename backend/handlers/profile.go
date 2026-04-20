package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	db "github.com/graysonmalone/music-discovery-log/db/generated"
	"github.com/graysonmalone/music-discovery-log/middleware"
)

type ProfileHandler struct {
	Queries *db.Queries
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

	rows, err := h.Queries.CountEntriesByTag(r.Context(), userID)
	if err != nil {
		log.Printf("count entries error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	counts := tagCounts{}
	for _, row := range rows {
		switch row.Tag {
		case db.CollectionEntriesTagLoved:
			counts.Loved = int(row.Count)
		case db.CollectionEntriesTagWantToListen:
			counts.WantToListen = int(row.Count)
		case db.CollectionEntriesTagOverrated:
			counts.Overrated = int(row.Count)
		case db.CollectionEntriesTagPutOn:
			counts.PutOn = int(row.Count)
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
