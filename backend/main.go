package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	db "github.com/graysonmalone/music-discovery-log/db/generated"
	"github.com/graysonmalone/music-discovery-log/routes"
)

// tryMigrate runs a migration and ignores "already exists" errors so re-deploys are safe.
func tryMigrate(conn *sql.DB, query string) {
	if _, err := conn.Exec(query); err != nil {
		s := err.Error()
		if strings.Contains(s, "Duplicate column name") || strings.Contains(s, "Duplicate key name") {
			return
		}
		log.Fatalf("migration failed: %v", err)
	}
}

func main() {
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("DB_DSN environment variable is required")
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	conn, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer conn.Close()
	if err := conn.Ping(); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	log.Println("Connected to database")

	// --- migrations ---

	// Social tables (from previous deploy)
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS follows (
			id           INT      NOT NULL AUTO_INCREMENT,
			follower_id  INT      NOT NULL,
			following_id INT      NOT NULL,
			created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY unique_follow (follower_id, following_id),
			FOREIGN KEY (follower_id)  REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_follows_follower  (follower_id),
			INDEX idx_follows_following (following_id)
		)`,
		`CREATE TABLE IF NOT EXISTS notifications (
			id           INT         NOT NULL AUTO_INCREMENT,
			user_id      INT         NOT NULL,
			from_user_id INT         NOT NULL,
			type         VARCHAR(50) NOT NULL DEFAULT 'follow',
			read_flag    TINYINT(1)  NOT NULL DEFAULT 0,
			created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_notifications_user (user_id)
		)`,
		// Top 3 stored in DB so others can view it
		`CREATE TABLE IF NOT EXISTS top3_entries (
			id          INT          NOT NULL AUTO_INCREMENT,
			user_id     INT          NOT NULL,
			itunes_id   VARCHAR(100) NOT NULL,
			entity_type ENUM('artist','release') NOT NULL,
			name        VARCHAR(255) NOT NULL,
			artist_name VARCHAR(255) NULL,
			artwork_url VARCHAR(500) NULL,
			created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY unique_user_itunes (user_id, itunes_id),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_top3_user (user_id)
		)`,
		// Likes on collection entries or top3 entries
		`CREATE TABLE IF NOT EXISTS likes (
			id         INT         NOT NULL AUTO_INCREMENT,
			user_id    INT         NOT NULL,
			item_type  VARCHAR(20) NOT NULL,
			item_id    INT         NOT NULL,
			created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY unique_like (user_id, item_type, item_id),
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_likes_item (item_type, item_id)
		)`,
		// Comments on collection entries (feed activity)
		`CREATE TABLE IF NOT EXISTS comments (
			id         INT      NOT NULL AUTO_INCREMENT,
			entry_id   INT      NOT NULL,
			user_id    INT      NOT NULL,
			content    TEXT     NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			FOREIGN KEY (entry_id) REFERENCES collection_entries(id) ON DELETE CASCADE,
			FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_comments_entry (entry_id)
		)`,
		// Add put_on tag value
		`ALTER TABLE collection_entries MODIFY COLUMN tag ENUM('loved','want_to_listen','overrated','put_on') NOT NULL`,
	}
	for _, m := range migrations {
		if _, err := conn.Exec(m); err != nil {
			log.Fatalf("migration failed: %v", err)
		}
	}

	// Idempotent column additions to notifications
	tryMigrate(conn, `ALTER TABLE notifications ADD COLUMN reference_id INT NULL`)
	tryMigrate(conn, `ALTER TABLE notifications ADD COLUMN reference_type VARCHAR(50) NULL`)

	log.Println("Migrations complete")

	queries := db.New(conn)
	router := routes.Setup(queries, conn, jwtSecret)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}
