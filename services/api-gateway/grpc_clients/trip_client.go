package grpc_clients

import (
	"crypto/tls"
	"os"
	"strings"

	pb "ride-sharing/shared/proto/trip"
	"ride-sharing/shared/tracing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

type tripServiceClient struct {
	Client pb.TripServiceClient
	conn   *grpc.ClientConn
}

func NewTripServiceClient() (*tripServiceClient, error) {
	url := os.Getenv("TRIP_SERVICE_URL")
	if url == "" {
		url = "localhost:50051"
	}

	var creds = insecure.NewCredentials()

	// Use TLS for Render
	if strings.Contains(url, "onrender.com") {
		creds = credentials.NewTLS(&tls.Config{})
	}

	conn, err := grpc.Dial(
		url,
		append(
			tracing.DialOptionsWithTracing(),
			grpc.WithTransportCredentials(creds),
		)...,
	)
	if err != nil {
		return nil, err
	}

	client := pb.NewTripServiceClient(conn)

	return &tripServiceClient{
		Client: client,
		conn:   conn,
	}, nil
}

func (c *tripServiceClient) Close() {
	if c.conn != nil {
		c.conn.Close()
	}
}
