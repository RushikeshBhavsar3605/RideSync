package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"ride-sharing/services/trip-service/internal/infrastructure/events"
	"ride-sharing/services/trip-service/internal/infrastructure/grpc"
	"ride-sharing/services/trip-service/internal/infrastructure/repository"
	"ride-sharing/services/trip-service/internal/service"
	"ride-sharing/shared/db"
	"ride-sharing/shared/env"
	"ride-sharing/shared/messaging"
	"ride-sharing/shared/tracing"

	grpcserver "google.golang.org/grpc"
)

func main() {
	// ---- Tracing ----
	tracerCfg := tracing.Config{
		ServiceName:    "trip-service",
		Environment:    env.GetString("ENVIRONMENT", "development"),
		JaegerEndpoint: env.GetString("JAEGER_ENDPOINT", "http://localhost:14268/api/traces"),
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

	// Consumers
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
	port := env.GetString("PORT", "50051")

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpcserver.NewServer(tracing.WithTracingInterceptors()...)
	grpc.NewGRPCHandler(grpcServer, svc, publisher)

	log.Printf("gRPC server running on :%s", port)

	// ---- Health server (separate HTTP) ----
	go func() {
		http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("ok"))
		})
		log.Println("Health server running on :8080")
		http.ListenAndServe(":8080", nil)
	}()

	// ---- Start server ----
	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			log.Printf("gRPC server error: %v", err)
			cancel()
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down trip-service...")
	grpcServer.GracefulStop()
}
