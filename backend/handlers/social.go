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

type socialEntryResponse struct {
	ID            int32     `json:"id"`
	UserID        int32     `json:"user_id"`
	MusicbrainzID string    `json:"musicbrainz_id"`
	EntityType    string    `json:"entity_type"`
	Name          string    `json:"name"`
	ArtistName    *string   `json:"artist_name"`
	Tag           string    `json:"tag"`
	Take          *string   `json:"take"`
	SavedAt       time.Time `json:"saved_at"`
	LikeCount     int       `json:"like_count"`
	Liked         bool      `json:"liked"`
	CommentCount  int       `json:"comment_count"`
}

type publicProfileResponse struct {
	User           publicUserResponse    `json:"user"`
	Counts         tagCounts             `json:"counts"`
	Recent         []socialEntryResponse `json:"recent"`
	Top3           []top3ItemResponse    `json:"top3"`
	Following      bool                  `json:"following"`
	FollowersCount int                   `json:"followers_count"`
	FollowingCount int                   `json:"following_count"`
}

type feedEntryResponse struct {
	socialEntryResponse
	UserName string `json:"user_name"`
}

type commentResponse struct {
	ID        int32     `json:"id"`
	UserID    int32     `json:"user_id"`
	UserName  string    `json:"user_name"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

type notificationResponse struct {
	ID            int32     `json:"id"`
	FromUserID    int32     `json:"from_user_id"`
	FromUserName  string    `json:"from_user_name"`
	Type          string    `json:"type"`
	Read          bool      `json:"read"`
	CreatedAt     time.Time `json:"created_at"`
	ReferenceID   *int32    `json:"reference_id,omitempty"`
	ReferenceName *string   `json:"reference_name,omitempty"`
}

// scanSocialEntry scans a row that has the social fields at the end.
func scanSocialEntry(row interface {
	Scan(...interface{}) error
}) (socialEntryResponse, error) {
	var e socialEntryResponse
	var artistName sql.NullString
	var take sql.NullString
	var liked int
	err := row.Scan(&e.ID, &e.UserID, &e.MusicbrainzID, &e.EntityType, &e.Name,
		&artistName, &e.Tag, &take, &e.SavedAt, &e.LikeCount, &liked, &e.CommentCount)
	if err != nil {
		return e, err
	}
	if artistName.Valid {
		e.ArtistName = &artistName.String
	}
	if take.Valid {
		e.Take = &take.String
	}
	e.Liked = liked > 0
	return e, nil
}

const socialEntrySelect = `
	ce.id, ce.user_id, ce.musicbrainz_id, ce.entity_type, ce.name,
	ce.artist_name, ce.tag, ce.take, ce.saved_at,
	(SELECT COUNT(*) FROM likes WHERE item_type='entry' AND item_id=ce.id) AS like_count,
	(SELECT COUNT(*) FROM likes WHERE item_type='entry' AND item_id=ce.id AND user_id=?) AS liked,
	(SELECT COUNT(*) FROM comments WHERE entry_id=ce.id) AS comment_count`

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
		log.Printf("get public profile: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	user.CreatedAt = createdAt.Format(time.RFC3339)

	// Tag counts
	countRows, err := h.DB.QueryContext(r.Context(),
		`SELECT tag, COUNT(*) FROM collection_entries WHERE user_id = ? GROUP BY tag`, targetID)
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
		case "put_on":
			counts.PutOn = count
		}
	}

	// Recent 6 entries with social fields
	query := `SELECT ` + socialEntrySelect + `
		FROM collection_entries ce
		WHERE ce.user_id = ?
		ORDER BY ce.saved_at DESC LIMIT 6`
	entryRows, err := h.DB.QueryContext(r.Context(), query, currentUserID, targetID)
	if err != nil {
		log.Printf("get public profile entries: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer entryRows.Close()
	recent := []socialEntryResponse{}
	for entryRows.Next() {
		e, err := scanSocialEntry(entryRows)
		if err != nil {
			continue
		}
		recent = append(recent, e)
	}

	// Top 3
	top3, _ := getTop3ByUserID(r.Context(), h.DB, int32(targetID), currentUserID)
	if top3 == nil {
		top3 = []top3ItemResponse{}
	}

	// Is following?
	var followCount int
	h.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = ?`,
		currentUserID, targetID).Scan(&followCount)

	var followersCount, followingCount int
	h.DB.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM follows WHERE following_id = ?`, targetID).Scan(&followersCount)
	h.DB.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM follows WHERE follower_id = ?`, targetID).Scan(&followingCount)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(publicProfileResponse{
		User:           user,
		Counts:         counts,
		Recent:         recent,
		Top3:           top3,
		Following:      followCount > 0,
		FollowersCount: followersCount,
		FollowingCount: followingCount,
	})
}

// GetUserCollection GET /api/users/:id/collection?tag=
func (h *SocialHandler) GetUserCollection(w http.ResponseWriter, r *http.Request) {
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

	tag := r.URL.Query().Get("tag")
	var query string
	var args []interface{}
	if tag != "" {
		query = `SELECT ` + socialEntrySelect + ` FROM collection_entries ce WHERE ce.user_id = ? AND ce.tag = ? ORDER BY ce.saved_at DESC`
		args = []interface{}{currentUserID, int32(targetID), tag}
	} else {
		query = `SELECT ` + socialEntrySelect + ` FROM collection_entries ce WHERE ce.user_id = ? ORDER BY ce.saved_at DESC`
		args = []interface{}{currentUserID, int32(targetID)}
	}

	rows, err := h.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		log.Printf("get user collection: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	entries := []socialEntryResponse{}
	for rows.Next() {
		e, err := scanSocialEntry(rows)
		if err != nil {
			continue
		}
		entries = append(entries, e)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
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
		followerID, followingID)
	if err != nil {
		log.Printf("follow error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	if n, _ := result.RowsAffected(); n > 0 {
		h.DB.ExecContext(r.Context(),
			`INSERT INTO notifications (user_id, from_user_id, type) VALUES (?, ?, 'follow')`,
			followingID, followerID)
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
	if _, err = h.DB.ExecContext(r.Context(),
		`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`,
		followerID, followingID); err != nil {
		log.Printf("unfollow error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "unfollowed"})
}

// GetFollowing GET /api/follows
func (h *SocialHandler) GetFollowing(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT u.id, u.name, u.created_at FROM users u
		 JOIN follows f ON u.id = f.following_id
		 WHERE f.follower_id = ? ORDER BY f.created_at DESC`, userID)
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

// GetFollowers GET /api/followers
func (h *SocialHandler) GetFollowers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT u.id, u.name, u.created_at FROM users u
		 JOIN follows f ON u.id = f.follower_id
		 WHERE f.following_id = ? ORDER BY f.created_at DESC`, userID)
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

// GetFeed GET /api/feed
func (h *SocialHandler) GetFeed(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	query := `SELECT u.name, ` + socialEntrySelect + `
		FROM collection_entries ce
		JOIN follows f ON ce.user_id = f.following_id
		JOIN users u ON ce.user_id = u.id
		WHERE f.follower_id = ?
		ORDER BY ce.saved_at DESC LIMIT 50`
	rows, err := h.DB.QueryContext(r.Context(), query, userID, userID)
	if err != nil {
		log.Printf("get feed error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	feed := []feedEntryResponse{}
	for rows.Next() {
		var userName string
		var e socialEntryResponse
		var artistName sql.NullString
		var take sql.NullString
		var liked int
		if err := rows.Scan(&userName, &e.ID, &e.UserID, &e.MusicbrainzID, &e.EntityType, &e.Name,
			&artistName, &e.Tag, &take, &e.SavedAt, &e.LikeCount, &liked, &e.CommentCount); err != nil {
			log.Printf("scan feed: %v", err)
			continue
		}
		if artistName.Valid {
			e.ArtistName = &artistName.String
		}
		if take.Valid {
			e.Take = &take.String
		}
		e.Liked = liked > 0
		feed = append(feed, feedEntryResponse{socialEntryResponse: e, UserName: userName})
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
		`SELECT n.id, n.from_user_id, u.name, n.type, n.read_flag, n.created_at,
		        n.reference_id,
		        CASE WHEN n.reference_type='entry' THEN ce.name
		             WHEN n.reference_type='top3'  THEN t3.name
		             ELSE NULL END AS reference_name
		 FROM notifications n
		 JOIN users u ON n.from_user_id = u.id
		 LEFT JOIN collection_entries ce ON n.reference_type='entry' AND ce.id=n.reference_id
		 LEFT JOIN top3_entries t3        ON n.reference_type='top3'  AND t3.id=n.reference_id
		 WHERE n.user_id = ?
		 ORDER BY n.created_at DESC LIMIT 20`,
		userID)
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
		var refID sql.NullInt32
		var refName sql.NullString
		if err := rows.Scan(&n.ID, &n.FromUserID, &n.FromUserName, &n.Type, &readFlag, &n.CreatedAt,
			&refID, &refName); err != nil {
			continue
		}
		n.Read = readFlag == 1
		if refID.Valid {
			n.ReferenceID = &refID.Int32
		}
		if refName.Valid {
			n.ReferenceName = &refName.String
		}
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
	h.DB.ExecContext(r.Context(), `UPDATE notifications SET read_flag=1 WHERE user_id=?`, userID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
}

// ToggleLike POST /api/like
func (h *SocialHandler) ToggleLike(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	var req struct {
		ItemType string `json:"item_type"` // "entry" or "top3"
		ItemID   int32  `json:"item_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || (req.ItemType != "entry" && req.ItemType != "top3") {
		http.Error(w, `{"error":"item_type must be 'entry' or 'top3', item_id required"}`, http.StatusBadRequest)
		return
	}

	var existingID int
	err := h.DB.QueryRowContext(r.Context(),
		`SELECT id FROM likes WHERE user_id=? AND item_type=? AND item_id=?`,
		userID, req.ItemType, req.ItemID).Scan(&existingID)

	liked := false
	if err == sql.ErrNoRows {
		h.DB.ExecContext(r.Context(),
			`INSERT INTO likes (user_id, item_type, item_id) VALUES (?,?,?)`,
			userID, req.ItemType, req.ItemID)
		liked = true

		// Notify the owner
		var ownerID int32
		if req.ItemType == "entry" {
			h.DB.QueryRowContext(r.Context(),
				`SELECT user_id FROM collection_entries WHERE id=?`, req.ItemID).Scan(&ownerID)
		} else {
			h.DB.QueryRowContext(r.Context(),
				`SELECT user_id FROM top3_entries WHERE id=?`, req.ItemID).Scan(&ownerID)
		}
		if ownerID != 0 && ownerID != userID {
			h.DB.ExecContext(r.Context(),
				`INSERT INTO notifications (user_id, from_user_id, type, reference_id, reference_type)
				 VALUES (?,?,'like',?,?)`,
				ownerID, userID, req.ItemID, req.ItemType)
		}
	} else if err == nil {
		h.DB.ExecContext(r.Context(),
			`DELETE FROM likes WHERE user_id=? AND item_type=? AND item_id=?`,
			userID, req.ItemType, req.ItemID)
		liked = false
	} else {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	var count int
	h.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM likes WHERE item_type=? AND item_id=?`,
		req.ItemType, req.ItemID).Scan(&count)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"liked": liked, "like_count": count})
}

// GetComments GET /api/entries/:id/comments
func (h *SocialHandler) GetComments(w http.ResponseWriter, r *http.Request) {
	_, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	entryID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}
	rows, err := h.DB.QueryContext(r.Context(),
		`SELECT c.id, c.user_id, u.name, c.content, c.created_at
		 FROM comments c JOIN users u ON c.user_id=u.id
		 WHERE c.entry_id=? ORDER BY c.created_at ASC`,
		entryID)
	if err != nil {
		log.Printf("get comments error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	comments := []commentResponse{}
	for rows.Next() {
		var c commentResponse
		rows.Scan(&c.ID, &c.UserID, &c.UserName, &c.Content, &c.CreatedAt)
		comments = append(comments, c)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}

// CreateComment POST /api/entries/:id/comments
func (h *SocialHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	entryID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}
	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Content == "" {
		http.Error(w, `{"error":"content is required"}`, http.StatusBadRequest)
		return
	}
	result, err := h.DB.ExecContext(r.Context(),
		`INSERT INTO comments (entry_id, user_id, content) VALUES (?,?,?)`,
		entryID, userID, req.Content)
	if err != nil {
		log.Printf("create comment error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	commentID, _ := result.LastInsertId()

	// Notify entry owner
	var ownerID int32
	h.DB.QueryRowContext(r.Context(),
		`SELECT user_id FROM collection_entries WHERE id=?`, entryID).Scan(&ownerID)
	if ownerID != 0 && ownerID != userID {
		h.DB.ExecContext(r.Context(),
			`INSERT INTO notifications (user_id, from_user_id, type, reference_id, reference_type)
			 VALUES (?,?,'comment',?,'entry')`,
			ownerID, userID, entryID)
	}

	// Return the created comment
	var c commentResponse
	h.DB.QueryRowContext(r.Context(),
		`SELECT c.id, c.user_id, u.name, c.content, c.created_at
		 FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?`, commentID,
	).Scan(&c.ID, &c.UserID, &c.UserName, &c.Content, &c.CreatedAt)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(c)
}

// DeleteComment DELETE /api/comments/:id
func (h *SocialHandler) DeleteComment(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}
	commentID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 32)
	if err != nil {
		http.Error(w, `{"error":"invalid id"}`, http.StatusBadRequest)
		return
	}
	h.DB.ExecContext(r.Context(),
		`DELETE FROM comments WHERE id=? AND user_id=?`, commentID, userID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "deleted"})
}
