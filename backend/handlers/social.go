package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/graysonmalone/music-discovery-log/middleware"
)

type SocialHandler struct {
	DB *sql.DB
}

// --- response types ---

type publicUserResponse struct {
	ID        int32  `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"created_at"`
}

type publicProfileResponse struct {
	User           publicUserResponse `json:"user"`
	Counts         tagCounts          `json:"counts"`
	Recent         []entryResponse    `json:"recent"`
	Following      bool               `json:"following"`
	FollowersCount int                `json:"followers_count"`
	FollowingCount int                `json:"following_count"`
}

type feedEntryResponse struct {
	ID            int32     `json:"id"`
	UserID        int32     `json:"user_id"`
	UserName      string    `json:"user_name"`
	MusicbrainzID string    `json:"musicbrainz_id"`
	EntityType    string    `json:"entity_type"`
	Name          string    `json:"name"`
	ArtistName    *string   `json:"artist_name"`
	Tag           string    `json:"tag"`
	Take          *string   `json:"take"`
	SavedAt       time.Time `json:"saved_at"`
}

type notificationResponse struct {
	ID           int32     `json:"id"`
	FromUserID   int32     `json:"from_user_id"`
	FromUserName string    `json:"from_user_name"`
	Type         string    `json:"type"`
	Read         bool      `json:"read"`
	CreatedAt    time.Time `json:"created_at"`
}

// SearchUsers GET /api/users/search?q=
func (h *SocialHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	q := r.URL.Query().Get("q")
	if q == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]publicUserResponse{})
		return
	}

	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, name, created_at FROM users WHERE name LIKE ? AND id != ? LIMIT 20`,
		"%"+q+"%", userID,
	)
	if err != nil {
		log.Printf("search users error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []publicUserResponse{}
	for rows.Next() {
		var u publicUserResponse
		var createdAt time.Time
		if err := rows.Scan(&u.ID, &u.Name, &createdAt); err != nil {
			continue
		}
		u.CreatedAt = createdAt.Format(time.RFC3339)
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// GetPublicProfile GET /api/users/:id
func (h *SocialHandler) GetPublicProfile(w http.ResponseWriter, r *http.Request) {
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

	var user publicUserResponse
	var createdAt time.Time
	err = h.DB.QueryRowContext(r.Context(),
		`SELECT id, name, created_at FROM users WHERE id = ?`, targetID,
	).Scan(&user.ID, &user.Name, &createdAt)
	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	} else if err != nil {
		log.Printf("get public profile error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	user.CreatedAt = createdAt.Format(time.RFC3339)

	// Tag counts
	countRows, err := h.DB.QueryContext(r.Context(),
		`SELECT tag, COUNT(*) FROM collection_entries WHERE user_id = ? GROUP BY tag`, targetID,
	)
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer countRows.Close()
	counts := tagCounts{}
	for countRows.Next() {
		var tag string
		var count int
		countRows.Scan(&tag, &count)
		switch tag {
		case "loved":
			counts.Loved = count
		case "want_to_listen":
			counts.WantToListen = count
		case "overrated":
			counts.Overrated = count
		}
	}

	// Recent 6 entries
	entryRows, err := h.DB.QueryContext(r.Context(),
		`SELECT id, user_id, musicbrainz_id, entity_type, name, artist_name, tag, take, saved_at, updated_at
		 FROM collection_entries WHERE user_id = ? ORDER BY saved_at DESC LIMIT 6`, targetID,
	)
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer entryRows.Close()
	recent := []entryResponse{}
	for entryRows.Next() {
		var e entryResponse
		var artistName sql.NullString
		var take sql.NullString
		if err := entryRows.Scan(&e.ID, &e.UserID, &e.MusicbrainzID, &e.EntityType, &e.Name,
			&artistName, &e.Tag, &take, &e.SavedAt, &e.UpdatedAt); err != nil {
			continue
		}
		if artistName.Valid {
			e.ArtistName = &artistName.String
		}
		if take.Valid {
			e.Take = &take.String
		}
		recent = append(recent, e)
	}

	// Is current user following target?
	var followCount int
	h.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = ?`,
		currentUserID, targetID,
	).Scan(&followCount)

	// Follower / following counts
	var followersCount, followingCount int
	h.DB.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM follows WHERE following_id = ?`, targetID).Scan(&followersCount)
	h.DB.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM follows WHERE follower_id = ?`, targetID).Scan(&followingCount)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(publicProfileResponse{
		User:           user,
		Counts:         counts,
		Recent:         recent,
		Following:      followCount > 0,
		FollowersCount: followersCount,
		FollowingCount: followingCount,
	})
}

// Follow POST /api/follows/:id
func (h *SocialHandler) Follow(w http.ResponseWriter, r *http.Request) {
	followerID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	followingID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil || int32(followingID) == followerID {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	result, err := h.DB.ExecContext(r.Context(),
		`INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`,
		followerID, followingID,
	)
	if err != nil {
		log.Printf("follow error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Only create notification if this is a new follow (not a duplicate)
	if n, _ := result.RowsAffected(); n > 0 {
		h.DB.ExecContext(r.Context(),
			`INSERT INTO notifications (user_id, from_user_id, type) VALUES (?, ?, 'follow')`,
			followingID, followerID,
		)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "followed"})
}

// Unfollow DELETE /api/follows/:id
func (h *SocialHandler) Unfollow(w http.ResponseWriter, r *http.Request) {
	followerID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	followingID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}

	_, err = h.DB.ExecContext(r.Context(),
		`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`,
		followerID, followingID,
	)
	if err != nil {
		log.Printf("unfollow error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "unfollowed"})
}

// GetFollowing GET /api/follows — people you follow
func (h *SocialHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT u.id, u.name, u.created_at FROM users u
		 JOIN follows f ON u.id = f.following_id
		 WHERE f.follower_id = ? ORDER BY f.created_at DESC`,
		userID,
	)
	if err != nil {
		log.Printf("get following error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []publicUserResponse{}
	for rows.Next() {
		var u publicUserResponse
		var createdAt time.Time
		rows.Scan(&u.ID, &u.Name, &createdAt)
		u.CreatedAt = createdAt.Format(time.RFC3339)
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// GetFollowers GET /api/followers — people who follow you
func (h *SocialHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT u.id, u.name, u.created_at FROM users u
		 JOIN follows f ON u.id = f.follower_id
		 WHERE f.following_id = ? ORDER BY f.created_at DESC`,
		userID,
	)
	if err != nil {
		log.Printf("get followers error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := []publicUserResponse{}
	for rows.Next() {
		var u publicUserResponse
		var createdAt time.Time
		rows.Scan(&u.ID, &u.Name, &createdAt)
		u.CreatedAt = createdAt.Format(time.RFC3339)
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

// GetFeed GET /api/feed — recent entries from followed users
func (h *SocialHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT ce.id, ce.user_id, u.name, ce.musicbrainz_id, ce.entity_type, ce.name,
		        ce.artist_name, ce.tag, ce.take, ce.saved_at
		 FROM collection_entries ce
		 JOIN follows f ON ce.user_id = f.following_id
		 JOIN users u ON ce.user_id = u.id
		 WHERE f.follower_id = ?
		 ORDER BY ce.saved_at DESC
		 LIMIT 50`,
		userID,
	)
	if err != nil {
		log.Printf("get feed error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	feed := []feedEntryResponse{}
	for rows.Next() {
		var e feedEntryResponse
		var artistName sql.NullString
		var take sql.NullString
		if err := rows.Scan(&e.ID, &e.UserID, &e.UserName, &e.MusicbrainzID, &e.EntityType,
			&e.Name, &artistName, &e.Tag, &take, &e.SavedAt); err != nil {
			log.Printf("scan feed row: %v", err)
			continue
		}
		if artistName.Valid {
			e.ArtistName = &artistName.String
		}
		if take.Valid {
			e.Take = &take.String
		}
		feed = append(feed, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(feed)
}

// GetNotifications GET /api/notifications
func (h *SocialHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT n.id, n.from_user_id, u.name, n.type, n.read_flag, n.created_at
		 FROM notifications n
		 JOIN users u ON n.from_user_id = u.id
		 WHERE n.user_id = ?
		 ORDER BY n.created_at DESC
		 LIMIT 20`,
		userID,
	)
	if err != nil {
		log.Printf("get notifications error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	notifications := []notificationResponse{}
	for rows.Next() {
		var n notificationResponse
		var readFlag int
		if err := rows.Scan(&n.ID, &n.FromUserID, &n.FromUserName, &n.Type, &readFlag, &n.CreatedAt); err != nil {
			continue
		}
		n.Read = readFlag == 1
		notifications = append(notifications, n)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(notifications)
}

// MarkNotificationsRead POST /api/notifications/read
func (h *SocialHandler) MarkNotificationsRead(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	_, err := h.DB.ExecContext(r.Context(),
		`UPDATE notifications SET read_flag = 1 WHERE user_id = ?`, userID,
	)
	if err != nil {
		log.Printf("mark notifications read error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
}
