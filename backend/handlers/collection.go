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
}

type entryResponse struct {
	ID            int32     `json:"id"`
	UserID        int32     `json:"user_id"`
	MusicbrainzID string    `json:"musicbrainz_id"`
	EntityType    string    `json:"entity_type"`
	Name          string    `json:"name"`
	ArtistName    *string   `json:"artist_name"`
	Tag           string    `json:"tag"`
	Take          *string   `json:"take"`
	SavedAt       time.Time `json:"saved_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type createEntryRequest struct {
	MusicbrainzID string  `json:"musicbrainz_id"`
	EntityType    string  `json:"entity_type"`
	Name          string  `json:"name"`
	ArtistName    *string `json:"artist_name"`
	Tag           string  `json:"tag"`
	Take          *string `json:"take"`
}

type updateEntryRequest struct {
	Tag  string  `json:"tag"`
	Take *string `json:"take"`
}

func toEntryResponse(e db.CollectionEntry) entryResponse {
	r := entryResponse{
		ID:            e.ID,
		UserID:        e.UserID,
		MusicbrainzID: e.MusicbrainzID,
		EntityType:    string(e.EntityType),
		Name:          e.Name,
		Tag:           string(e.Tag),
		SavedAt:       e.SavedAt,
		UpdatedAt:     e.UpdatedAt,
	}
	if e.ArtistName.Valid {
		r.ArtistName = &e.ArtistName.String
	}
	if e.Take.Valid {
		r.Take = &e.Take.String
	}
	return r
}

func (h *CollectionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	tag := r.URL.Query().Get("tag")

	var entries []db.CollectionEntry
	var err error

	if tag != "" {
		entries, err = h.Queries.ListEntriesByUserAndTag(r.Context(), db.ListEntriesByUserAndTagParams{
			UserID: userID,
			Tag:    db.CollectionEntriesTag(tag),
		})
	} else {
		entries, err = h.Queries.ListEntriesByUser(r.Context(), userID)
	}

	if err != nil {
		log.Printf("list entries error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	resp := make([]entryResponse, len(entries))
	for i, e := range entries {
		resp[i] = toEntryResponse(e)
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
	if req.MusicbrainzID == "" || req.EntityType == "" || req.Name == "" || req.Tag == "" {
		http.Error(w, `{"error":"musicbrainz_id, entity_type, name, and tag are required"}`, http.StatusBadRequest)
		return
	}

	params := db.CreateEntryParams{
		UserID:        userID,
		MusicbrainzID: req.MusicbrainzID,
		EntityType:    db.CollectionEntriesEntityType(req.EntityType),
		Name:          req.Name,
		Tag:           db.CollectionEntriesTag(req.Tag),
	}
	if req.ArtistName != nil {
		params.ArtistName = sql.NullString{String: *req.ArtistName, Valid: true}
	}
	if req.Take != nil {
		params.Take = sql.NullString{String: *req.Take, Valid: true}
	}

	result, err := h.Queries.CreateEntry(r.Context(), params)
	if err != nil {
		log.Printf("create entry error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	id, _ := result.LastInsertId()
	entry, err := h.Queries.GetEntryByID(r.Context(), db.GetEntryByIDParams{ID: int32(id), UserID: userID})
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]entryResponse{"entry": toEntryResponse(entry)})
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

	entry, err := h.Queries.GetEntryByID(r.Context(), db.GetEntryByIDParams{ID: int32(id), UserID: userID})
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("get entry error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]entryResponse{"entry": toEntryResponse(entry)})
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
	if req.Tag == "" {
		http.Error(w, `{"error":"tag is required"}`, http.StatusBadRequest)
		return
	}

	params := db.UpdateEntryParams{
		Tag:    db.CollectionEntriesTag(req.Tag),
		ID:     int32(id),
		UserID: userID,
	}
	if req.Take != nil {
		params.Take = sql.NullString{String: *req.Take, Valid: true}
	}

	if err := h.Queries.UpdateEntry(r.Context(), params); err != nil {
		log.Printf("update entry error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	entry, err := h.Queries.GetEntryByID(r.Context(), db.GetEntryByIDParams{ID: int32(id), UserID: userID})
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]entryResponse{"entry": toEntryResponse(entry)})
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
