package routes

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	db "github.com/graysonmalone/music-discovery-log/db/generated"
	"github.com/graysonmalone/music-discovery-log/handlers"
	"github.com/graysonmalone/music-discovery-log/middleware"
)

func Setup(queries *db.Queries, jwtSecret string) http.Handler {
	r := chi.NewRouter()
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	auth := &handlers.AuthHandler{Queries: queries, JWTSecret: jwtSecret}
	collection := &handlers.CollectionHandler{Queries: queries}
	profile := &handlers.ProfileHandler{Queries: queries}
	authMiddleware := middleware.Auth(jwtSecret)

	// Public routes
	r.Post("/api/auth/register", auth.Register)
	r.Post("/api/auth/login", auth.Login)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)
		r.Get("/api/search", handlers.Search)
		r.Get("/api/collection", collection.List)
		r.Post("/api/collection", collection.Create)
		r.Get("/api/collection/{id}", collection.Get)
		r.Put("/api/collection/{id}", collection.Update)
		r.Delete("/api/collection/{id}", collection.Delete)
		r.Get("/api/profile", profile.Get)
	})

	// Health check (public)
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	return r
}
