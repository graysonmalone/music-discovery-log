package routes

import (
	"database/sql"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	db "github.com/graysonmalone/music-discovery-log/db/generated"
	"github.com/graysonmalone/music-discovery-log/handlers"
	"github.com/graysonmalone/music-discovery-log/middleware"
)

func Setup(queries *db.Queries, conn *sql.DB, jwtSecret string) http.Handler {
	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	auth := &handlers.AuthHandler{Queries: queries, JWTSecret: jwtSecret}
	collection := &handlers.CollectionHandler{Queries: queries, DB: conn}
	profile := &handlers.ProfileHandler{Queries: queries, DB: conn}
	social := &handlers.SocialHandler{DB: conn}
	top3 := &handlers.Top3Handler{DB: conn}
	authMiddleware := middleware.Auth(jwtSecret)

	r.Post("/api/auth/register", auth.Register)
	r.Post("/api/auth/login", auth.Login)

	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)

		// Collection
		r.Get("/api/collection", collection.List)
		r.Post("/api/collection", collection.Create)
		r.Get("/api/collection/{id}", collection.Get)
		r.Put("/api/collection/{id}", collection.Update)
		r.Delete("/api/collection/{id}", collection.Delete)

		// Profile
		r.Get("/api/profile", profile.Get)
		r.Put("/api/profile", profile.UpdateName)

		// Top 3
		r.Get("/api/top3", top3.GetTop3)
		r.Post("/api/top3", top3.AddTop3)
		r.Delete("/api/top3/{itunesId}", top3.RemoveTop3)

		// Social — users
		r.Get("/api/users/search", social.SearchUsers)
		r.Get("/api/users/{id}", social.GetPublicProfile)
		r.Get("/api/users/{id}/top3", top3.GetPublicTop3)
		r.Get("/api/users/{id}/collection", social.GetUserCollection)

		// Social — follows
		r.Post("/api/follows/{id}", social.Follow)
		r.Delete("/api/follows/{id}", social.Unfollow)
		r.Get("/api/follows", social.GetFollowing)
		r.Get("/api/followers", social.GetFollowers)

		// Feed
		r.Get("/api/feed", social.GetFeed)

		// Likes
		r.Post("/api/like", social.ToggleLike)

		// Comments
		r.Get("/api/entries/{id}/comments", social.GetComments)
		r.Post("/api/entries/{id}/comments", social.CreateComment)
		r.Delete("/api/comments/{id}", social.DeleteComment)

		// Notifications
		r.Get("/api/notifications", social.GetNotifications)
		r.Post("/api/notifications/read", social.MarkNotificationsRead)
	})

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	return r
}
