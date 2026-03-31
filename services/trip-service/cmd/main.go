package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"ride-sharing/services/trip-service/internal/infrastructure/events"
	"ride-sharing/services/trip-service/internal/infrastructure/grpc"
	"ride-sharing/services/trip-service/internal/infrastructure/repository"
	"ride-sharing/services/trip-service/internal/service"
	"ride-sharing/shared/db"
	"ride-sharing/shared/env"
	"ride-sharing/shared/messaging"
	pb "ride-sharing/shared/proto/trip"
	"ride-sharing/shared/tracing"
	"ride-sharing/shared/types"
	"strings"
	"syscall"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	grpcserver "google.golang.org/grpc"
)

type previewTripRequest struct {
	UserID      string           `json:"userID"`
	Pickup      types.Coordinate `json:"pickup"`
	Destination types.Coordinate `json:"destination"`
}

type createTripRequest struct {
	RideFareID string `json:"rideFareID"`
	UserID     string `json:"userID"`
}

func main() {
	tracerCfg := tracing.Config{
		ServiceName:    "trip-service",
		Environment:    env.GetString("ENVIRONMENT", "development"),
		JaegerEndpoint: env.GetString("JAEGER_ENDPOINT", "http://localhost:14268/api/traces"),
	}

	sh, err := tracing.InitTracer(tracerCfg)
	if err != nil {
		log.Fatalf("Failed to initialize the tracer: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	defer sh(ctx)

	// Initialize MongoDB
	mongoClient, err := db.NewMongoClient(ctx, db.NewMongoDefaultConfig())
	if err != nil {
		log.Fatalf("Failed to initialize MongoDB, err: %v", err)
	}
	defer mongoClient.Disconnect(ctx)

	mongoDb := db.GetDatabase(mongoClient, db.NewMongoDefaultConfig())

	rabbitMqURI := env.GetString("RABBITMQ_URI", "amqp://guest:guest@localhost:5672/")

	mongoDBRepo := repository.NewMongoRepository(mongoDb)
	svc := service.NewService(mongoDBRepo)

	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
		<-sigCh
		cancel()
	}()

	// RabbitMQ connection
	rabbitmq, err := messaging.NewRabbitMQ(rabbitMqURI)
	if err != nil {
		log.Fatal(err)
	}
	defer rabbitmq.Close()

	log.Println("Starting RabbitMQ connection")

	publisher := events.NewTripEventPublisher(rabbitmq)

	// Start driver consumer
	driverConsumer := events.NewDriverConsumer(rabbitmq, svc)
	go driverConsumer.Listen()

	// Start payment consumer
	paymentConsumer := events.NewPaymentConsumer(rabbitmq, svc)
	go paymentConsumer.Listen()

	// Starting the gRPC server
	grpcServer := grpcserver.NewServer(tracing.WithTracingInterceptors()...)
	grpcHandler := grpc.NewGRPCHandler(grpcServer, svc, publisher)

	// Combined gRPC + HTTP on single port
	httpMux := http.NewServeMux()

	httpMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	httpMux.HandleFunc("/trip/preview", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req previewTripRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "failed to parse JSON data", http.StatusBadRequest)
			return
		}

		// Convert to protobuf
		pbReq := &pb.PreviewTripRequest{
			UserId: req.UserID,
			StartLocation: &pb.Coordinate{
				Latitude:  req.Pickup.Latitude,
				Longitude: req.Pickup.Longitude,
			},
			EndLocation: &pb.Coordinate{
				Latitude:  req.Destination.Latitude,
				Longitude: req.Destination.Longitude,
			},
		}

		resp, err := grpcHandler.PreviewTrip(r.Context(), pbReq)
		if err != nil {
			log.Printf("failed to preview trip (HTTP): %v", err)
			http.Error(w, "failed to preview trip", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.Printf("failed to encode response: %v", err)
		}
	})

	httpMux.HandleFunc("/trip/create", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req createTripRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "failed to parse JSON data", http.StatusBadRequest)
			return
		}

		// Convert to protobuf
		pbReq := &pb.CreateTripRequest{
			RideFareId: req.RideFareID,
			UserId:     req.UserID,
		}

		resp, err := grpcHandler.CreateTrip(r.Context(), pbReq)
		if err != nil {
			log.Printf("failed to create trip (HTTP): %v", err)
			http.Error(w, "failed to create trip", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		if err := json.NewEncoder(w).Encode(resp); err != nil {
			log.Printf("failed to encode response: %v", err)
		}
	})

	combined := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.ProtoMajor == 2 && strings.HasPrefix(r.Header.Get("Content-Type"), "application/grpc") {
			grpcServer.ServeHTTP(w, r)
		} else {
			httpMux.ServeHTTP(w, r)
		}
	})

	addr := ":" + env.GetString("PORT", "50051")
	log.Printf("Starting server (gRPC + HTTP) on %s", addr)
	go func() {
		if err := http.ListenAndServe(addr, h2c.NewHandler(combined, &http2.Server{})); err != nil {
			log.Printf("server error: %v", err)
			cancel()
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down the server...")
	grpcServer.GracefulStop()
}
