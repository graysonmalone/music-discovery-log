package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/graysonmalone/music-discovery-log/middleware"
)

type Top3Handler struct {
	DB *sql.DB
}

type top3ItemResponse struct {
	ID         int32   `json:"id"`
	ItunesID   string  `json:"itunes_id"`
	EntityType string  `json:"entity_type"`
	Name       string  `json:"name"`
	ArtistName *string `json:"artist_name"`
	ArtworkURL *string `json:"artwork_url"`
	LikeCount  int     `json:"like_count"`
	Liked      bool    `json:"liked"`
}

type addTop3Request struct {
	ItunesID   string  `json:"itunes_id"`
	EntityType string  `json:"entity_type"`
	Name       string  `json:"name"`
	ArtistName *string `json:"artist_name"`
	ArtworkURL *string `json:"artwork_url"`
}

// getTop3ByUserID is a shared helper used by both Top3Handler and SocialHandler.
func getTop3ByUserID(ctx context.Context, db *sql.DB, ownerID int32, currentUserID int32) ([]top3ItemResponse, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT t.id, t.itunes_id, t.entity_type, t.name, t.artist_name, t.artwork_url,
		        (SELECT COUNT(*) FROM likes WHERE item_type = 'top3' AND item_id = t.id) AS like_count,
		        (SELECT COUNT(*) FROM likes WHERE item_type = 'top3' AND item_id = t.id AND user_id = ?) AS liked
		 FROM top3_entries t
		 WHERE t.user_id = ?
		 ORDER BY t.created_at ASC
		 LIMIT 3`,
		currentUserID, ownerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []top3ItemResponse{}
	for rows.Next() {
		var item top3ItemResponse
		var artistName sql.NullString
		var artworkURL sql.NullString
		var liked int
		if err := rows.Scan(&item.ID, &item.ItunesID, &item.EntityType, &item.Name,
			&artistName, &artworkURL, &item.LikeCount, &liked); err != nil {
			continue
		}
		if artistName.Valid {
			item.ArtistName = &artistName.String
		}
		if artworkURL.Valid {
			item.ArtworkURL = &artworkURL.String
		}
		item.Liked = liked > 0
		items = append(items, item)
	}
	return items, nil
}

// GetTop3 GET /api/top3
func (h *Top3Handler) GetTop3(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	items, err := getTop3ByUserID(r.Context(), h.DB, userID, userID)
	if err != nil {
		log.Printf("get top3 error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

// GetPublicTop3 GET /api/users/:id/top3
func (h *Top3Handler) GetPublicTop3(w http.ResponseWriter, r *http.Request) {
	currentUserID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	targetID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	items, err := getTop3ByUserID(r.Context(), h.DB, int32(targetID), currentUserID)
	if err != nil {
		log.Printf("get public top3 error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

// AddTop3 POST /api/top3
func (h *Top3Handler) AddTop3(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req addTop3Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
		return
	}
	if req.ItunesID == "" || req.Name == "" || req.EntityType == "" {
		http.Error(w, `{"error":"itunes_id, name, and entity_type are required"}`, http.StatusBadRequest)
		return
	}

	var count int
	h.DB.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM top3_entries WHERE user_id = ?`, userID).Scan(&count)
	if count >= 3 {
		http.Error(w, `{"error":"top 3 is full"}`, http.StatusBadRequest)
		return
	}

	var artistName sql.NullString
	var artworkURL sql.NullString
	if req.ArtistName != nil {
		artistName = sql.NullString{String: *req.ArtistName, Valid: true}
	}
	if req.ArtworkURL != nil {
		artworkURL = sql.NullString{String: *req.ArtworkURL, Valid: true}
	}

	_, err := h.DB.ExecContext(r.Context(),
		`INSERT IGNORE INTO top3_entries (user_id, itunes_id, entity_type, name, artist_name, artwork_url)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		userID, req.ItunesID, req.EntityType, req.Name, artistName, artworkURL,
	)
	if err != nil {
		log.Printf("add top3 error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "added"})
}

// RemoveTop3 DELETE /api/top3/:itunesId
func (h *Top3Handler) RemoveTop3(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	itunesID := chi.URLParam(r, "itunesId")
	if _, err := h.DB.ExecContext(r.Context(),
		`DELETE FROM top3_entries WHERE user_id = ? AND itunes_id = ?`,
		userID, itunesID,
	); err != nil {
		log.Printf("remove top3 error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "removed"})
}
