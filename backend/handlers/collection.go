package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	db "github.com/graysonmalone/music-discovery-log/db/generated"
	"github.com/graysonmalone/music-discovery-log/middleware"
)

type CollectionHandler struct {
	Queries *db.Queries
	DB      *sql.DB
}

type entryResponse struct {
	ID            int32     `json:"id"`
	UserID        int32     `json:"user_id"`
	MusicbrainzID string    `json:"musicbrainz_id"`
	EntityType    string    `json:"entity_type"`
	Name          string    `json:"name"`
	ArtistName    *string   `json:"artist_name"`
	Tag           string    `json:"tag"`
	Tags          []string  `json:"tags"`
	Take          *string   `json:"take"`
	SavedAt       time.Time `json:"saved_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type createEntryRequest struct {
	MusicbrainzID string   `json:"musicbrainz_id"`
	EntityType    string   `json:"entity_type"`
	Name          string   `json:"name"`
	ArtistName    *string  `json:"artist_name"`
	Tags          []string `json:"tags"`
	Take          *string  `json:"take"`
}

type updateEntryRequest struct {
	Tags []string `json:"tags"`
	Take *string  `json:"take"`
}

// parseTags unmarshals the JSON tags column, falling back to [fallback] if empty/null.
func parseTags(tagsJSON sql.NullString, fallback string) []string {
	if tagsJSON.Valid && tagsJSON.String != "" {
		var tags []string
		if err := json.Unmarshal([]byte(tagsJSON.String), &tags); err == nil && len(tags) > 0 {
			return tags
		}
	}
	if fallback != "" {
		return []string{fallback}
	}
	return []string{}
}

const entrySelectCols = `id, user_id, musicbrainz_id, entity_type, name, artist_name, tag, tags, take, saved_at, updated_at`

func scanEntryRow(row interface{ Scan(...interface{}) error }) (entryResponse, error) {
	var e entryResponse
	var artistName, tagsJSON, take sql.NullString
	err := row.Scan(&e.ID, &e.UserID, &e.MusicbrainzID, &e.EntityType, &e.Name,
		&artistName, &e.Tag, &tagsJSON, &take, &e.SavedAt, &e.UpdatedAt)
	if err != nil {
		return e, err
	}
	if artistName.Valid {
		e.ArtistName = &artistName.String
	}
	if take.Valid {
		e.Take = &take.String
	}
	e.Tags = parseTags(tagsJSON, e.Tag)
	return e, nil
}

func (h *CollectionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	tag := r.URL.Query().Get("tag")

	var rows *sql.Rows
	var err error
	if tag != "" {
		rows, err = h.DB.QueryContext(r.Context(),
			`SELECT `+entrySelectCols+` FROM collection_entries
			 WHERE user_id = ? AND JSON_CONTAINS(COALESCE(tags, JSON_ARRAY(tag)), JSON_QUOTE(?))
			 ORDER BY saved_at DESC`,
			userID, tag)
	} else {
		rows, err = h.DB.QueryContext(r.Context(),
			`SELECT `+entrySelectCols+` FROM collection_entries WHERE user_id = ? ORDER BY saved_at DESC`,
			userID)
	}
	if err != nil {
		log.Printf("list entries error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	resp := []entryResponse{}
	for rows.Next() {
		e, err := scanEntryRow(rows)
		if err != nil {
			continue
		}
		resp = append(resp, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *CollectionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req createEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if req.MusicbrainzID == "" || req.EntityType == "" || req.Name == "" || len(req.Tags) == 0 {
		http.Error(w, `{"error":"musicbrainz_id, entity_type, name, and tags are required"}`, http.StatusBadRequest)
		return
	}

	primaryTag := req.Tags[0]
	tagsJSON, _ := json.Marshal(req.Tags)

	var artistName sql.NullString
	if req.ArtistName != nil {
		artistName = sql.NullString{String: *req.ArtistName, Valid: true}
	}
	var take sql.NullString
	if req.Take != nil {
		take = sql.NullString{String: *req.Take, Valid: true}
	}

	result, err := h.DB.ExecContext(r.Context(),
		`INSERT INTO collection_entries (user_id, musicbrainz_id, entity_type, name, artist_name, tag, tags, take)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, req.MusicbrainzID, req.EntityType, req.Name, artistName, primaryTag, string(tagsJSON), take)
	if err != nil {
		log.Printf("create entry error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	row := h.DB.QueryRowContext(r.Context(),
		`SELECT `+entrySelectCols+` FROM collection_entries WHERE id = ? AND user_id = ?`, id, userID)
	entry, err := scanEntryRow(row)
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]entryResponse{"entry": entry})
}

func (h *CollectionHandler) Get(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	row := h.DB.QueryRowContext(r.Context(),
		`SELECT `+entrySelectCols+` FROM collection_entries WHERE id = ? AND user_id = ?`, id, userID)
	entry, err := scanEntryRow(row)
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("get entry error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]entryResponse{"entry": entry})
}

func (h *CollectionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	var req updateEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}
	if len(req.Tags) == 0 {
		http.Error(w, `{"error":"at least one tag is required"}`, http.StatusBadRequest)
		return
	}

	primaryTag := req.Tags[0]
	tagsJSON, _ := json.Marshal(req.Tags)

	var take sql.NullString
	if req.Take != nil {
		take = sql.NullString{String: *req.Take, Valid: true}
	}

	_, err = h.DB.ExecContext(r.Context(),
		`UPDATE collection_entries SET tag = ?, tags = ?, take = ?, updated_at = NOW() WHERE id = ? AND user_id = ?`,
		primaryTag, string(tagsJSON), take, id, userID)
	if err != nil {
		log.Printf("update entry error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	row := h.DB.QueryRowContext(r.Context(),
		`SELECT `+entrySelectCols+` FROM collection_entries WHERE id = ? AND user_id = ?`, id, userID)
	entry, err := scanEntryRow(row)
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]entryResponse{"entry": entry})
}

func (h *CollectionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	if err := h.Queries.DeleteEntry(r.Context(), db.DeleteEntryParams{ID: int32(id), UserID: userID}); err != nil {
		log.Printf("delete entry error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
}
