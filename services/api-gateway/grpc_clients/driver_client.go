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

	pb "ride-sharing/shared/proto/driver"
)

type driverServiceClient struct {
	httpClient *http.Client
	baseURL    string
}

func NewDriverServiceClient() (*driverServiceClient, error) {
	driverServiceURL := os.Getenv("DRIVER_SERVICE_URL")
	if driverServiceURL == "" {
		driverServiceURL = "http://driver-service.onrender.com"
	}
	if !strings.HasPrefix(driverServiceURL, "http") {
		driverServiceURL = "http://" + driverServiceURL
	}
	driverServiceURL = strings.TrimRight(driverServiceURL, "/")

	return &driverServiceClient{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		baseURL:    driverServiceURL,
	}, nil
}

func (c *driverServiceClient) Close() {}

func (c *driverServiceClient) RegisterDriver(ctx context.Context, req interface{}) (*pb.RegisterDriverResponse, error) {
	url := fmt.Sprintf("%s/driver/register", c.baseURL)
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
		return nil, fmt.Errorf("driver service returned status %d", resp.StatusCode)
	}

	var driverRes pb.RegisterDriverResponse
	if err := json.NewDecoder(resp.Body).Decode(&driverRes); err != nil {
		return nil, err
	}

	return &driverRes, nil
}

func (c *driverServiceClient) UnregisterDriver(ctx context.Context, req interface{}) (*pb.RegisterDriverResponse, error) {
	url := fmt.Sprintf("%s/driver/unregister", c.baseURL)
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
		return nil, fmt.Errorf("driver service returned status %d", resp.StatusCode)
	}

	var driverRes pb.RegisterDriverResponse
	if err := json.NewDecoder(resp.Body).Decode(&driverRes); err != nil {
		return nil, err
	}

	return &driverRes, nil
}
