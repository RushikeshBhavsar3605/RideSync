package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"ride-sharing/services/trip-service/internal/infrastructure/events"
	"ride-sharing/services/trip-service/internal/infrastructure/grpc"
	"ride-sharing/services/trip-service/internal/infrastructure/repository"
	"ride-sharing/services/trip-service/internal/service"
	"ride-sharing/shared/db"
	"ride-sharing/shared/env"
	"ride-sharing/shared/messaging"
	"ride-sharing/shared/tracing"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	grpcserver "google.golang.org/grpc"
)

func main() {
	// ---- Tracing ----
	tracerCfg := tracing.Config{
		ServiceName:    "trip-service",
		Environment:    env.GetString("ENVIRONMENT", "development"),
		JaegerEndpoint: env.GetString("JAEGER_ENDPOINT", ""), // disable noisy error
	}

	sh, err := tracing.InitTracer(tracerCfg)
	if err != nil {
		log.Fatalf("Failed to initialize tracer: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	defer sh(ctx)

	// ---- MongoDB ----
	mongoClient, err := db.NewMongoClient(ctx, db.NewMongoDefaultConfig())
	if err != nil {
		log.Fatalf("Mongo init failed: %v", err)
	}
	defer mongoClient.Disconnect(ctx)

	mongoDb := db.GetDatabase(mongoClient, db.NewMongoDefaultConfig())
	repo := repository.NewMongoRepository(mongoDb)
	svc := service.NewService(repo)

	// ---- RabbitMQ ----
	rabbitMqURI := env.GetString("RABBITMQ_URI", "amqp://guest:guest@localhost:5672/")
	rabbitmq, err := messaging.NewRabbitMQ(rabbitMqURI)
	if err != nil {
		log.Fatal(err)
	}
	defer rabbitmq.Close()

	log.Println("RabbitMQ connected")

	publisher := events.NewTripEventPublisher(rabbitmq)

	go events.NewDriverConsumer(rabbitmq, svc).Listen()
	go events.NewPaymentConsumer(rabbitmq, svc).Listen()

	// ---- Graceful shutdown ----
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
		<-sigCh
		cancel()
	}()

	// ---- gRPC server ----
	grpcServer := grpcserver.NewServer(tracing.WithTracingInterceptors()...)
	grpc.NewGRPCHandler(grpcServer, svc, publisher)

	// ---- HTTP mux ----
	httpMux := http.NewServeMux()
	httpMux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	// ---- Combined handler (CRITICAL) ----
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.ProtoMajor == 2 &&
			strings.Contains(r.Header.Get("Content-Type"), "application/grpc") {

			log.Println("Incoming gRPC request")
			grpcServer.ServeHTTP(w, r)
			return
		}

		log.Println("Incoming HTTP request:", r.URL.Path)
		httpMux.ServeHTTP(w, r)
	})

	// ---- Start server ----
	port := env.GetString("PORT", "50051")
	addr := "0.0.0.0:" + port

	log.Printf("Server running on %s", addr)

	go func() {
		if err := http.ListenAndServe(
			addr,
			h2c.NewHandler(handler, &http2.Server{}),
		); err != nil {
			log.Printf("server error: %v", err)
			cancel()
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down trip-service...")
	grpcServer.GracefulStop()
}
