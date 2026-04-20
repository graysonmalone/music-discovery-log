package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
	db "github.com/graysonmalone/music-discovery-log/db/generated"
	"github.com/graysonmalone/music-discovery-log/routes"
)

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

	// Run migrations for social tables
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
	}
	for _, m := range migrations {
		if _, err := conn.Exec(m); err != nil {
			log.Fatalf("migration failed: %v", err)
		}
	}
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
