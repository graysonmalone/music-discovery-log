package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

func Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	entityType := r.URL.Query().Get("type")

	if q == "" {
		http.Error(w, `{"error":"q parameter is required"}`, http.StatusBadRequest)
		return
	}
	if entityType != "artist" && entityType != "release" {
		http.Error(w, `{"error":"type must be artist or release"}`, http.StatusBadRequest)
		return
	}

	mbURL := fmt.Sprintf(
		"https://musicbrainz.org/ws/2/%s?query=%s&fmt=json&limit=20",
		entityType,
		url.QueryEscape(q),
	)

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, mbURL, nil)
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", "MusicDiscoveryLog/1.0 (grayson@example.com)")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("musicbrainz request error: %v", err)
		http.Error(w, `{"error":"failed to reach MusicBrainz"}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		http.Error(w, `{"error":"invalid response from MusicBrainz"}`, http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
