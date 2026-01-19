package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func handleTripPreview(w http.ResponseWriter, r *http.Request) {
	var reqBody previewTripRequest
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "failed to parse JSON data", http.StatusBadRequest)
	}

	// TODO: Call trip service
	log.Println("SUCCESS")
}
