package main

import (
	"encoding/json"
	"log"
	"net/http"
	"ride-sharing/shared/proto/driver"
)

func registerDriverHTTPHandlers(mux *http.ServeMux, svc *Service) {
	mux.HandleFunc("/driver/register", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req struct {
			DriverID    string       `json:"driverId"`
			PackageSlug string       `json:"packageSlug"`
			Location    *driver.Location `json:"location"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "failed to parse JSON data", http.StatusBadRequest)
			return
		}

		driverRec, err := svc.RegisterDriver(req.DriverID, req.PackageSlug, req.Location)
		if err != nil {
			log.Printf("failed to register driver: %v", err)
			http.Error(w, "failed to register driver", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(driver.RegisterDriverResponse{Driver: driverRec})
	})

	mux.HandleFunc("/driver/unregister", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req map[string]string
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "failed to parse JSON data", http.StatusBadRequest)
			return
		}

		svc.UnregisterDriver(req["driverId"])

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(driver.RegisterDriverResponse{Driver: &driver.Driver{Id: req["driverId"]}})
	})
}
