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

	"ride-sharing/services/payment-service/pkg/types"
)

type paymentServiceClient struct {
	httpClient *http.Client
	baseURL    string
}

func NewPaymentServiceClient() (*paymentServiceClient, error) {
	paymentServiceURL := os.Getenv("PAYMENT_SERVICE_URL")
	if paymentServiceURL == "" {
		paymentServiceURL = "http://payment-service.onrender.com"
	}
	if !strings.HasPrefix(paymentServiceURL, "http") {
		paymentServiceURL = "http://" + paymentServiceURL
	}
	paymentServiceURL = strings.TrimRight(paymentServiceURL, "/")

	return &paymentServiceClient{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		baseURL:    paymentServiceURL,
	}, nil
}

func (c *paymentServiceClient) Close() {}

func (c *paymentServiceClient) CreatePaymentSession(ctx context.Context, in *types.PaymentIntent) (*types.PaymentIntent, error) {
	url := fmt.Sprintf("%s/payment/session", c.baseURL)
	bodyBytes, err := json.Marshal(in)
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

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("payment service returned status %d", resp.StatusCode)
	}

	var output types.PaymentIntent
	if err := json.NewDecoder(resp.Body).Decode(&output); err != nil {
		return nil, err
	}

	return &output, nil
}
