package grpc_clients

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	pb "ride-sharing/shared/proto/trip"
)

type tripServiceClient struct {
	httpClient *http.Client
	baseURL    string
}

func NewTripServiceClient() (*tripServiceClient, error) {
	tripServiceURL := os.Getenv("TRIP_SERVICE_URL")
	if tripServiceURL == "" {
		tripServiceURL = "http://trip-service.onrender.com"
	}
	if !strings.HasPrefix(tripServiceURL, "http") {
		tripServiceURL = "http://" + tripServiceURL
	}
	tripServiceURL = strings.TrimRight(tripServiceURL, "/")

	return &tripServiceClient{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		baseURL:    tripServiceURL,
	}, nil
}

func (c *tripServiceClient) Close() {}

func (c *tripServiceClient) PreviewTrip(ctx context.Context, req interface{}) (*pb.PreviewTripResponse, error) {
	url := fmt.Sprintf("%s/trip/preview", c.baseURL)
	bodyBytes, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("trip service returned status %d", resp.StatusCode)
	}

	var tripRes pb.PreviewTripResponse
	if err := json.NewDecoder(resp.Body).Decode(&tripRes); err != nil {
		return nil, err
	}

	return &tripRes, nil
}

func (c *tripServiceClient) CreateTrip(ctx context.Context, req interface{}) (*pb.CreateTripResponse, error) {
	url := fmt.Sprintf("%s/trip/create", c.baseURL)
	bodyBytes, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("trip service returned status %d", resp.StatusCode)
	}

	var tripRes pb.CreateTripResponse
	if err := json.NewDecoder(resp.Body).Decode(&tripRes); err != nil {
		return nil, err
	}

	return &tripRes, nil
}
