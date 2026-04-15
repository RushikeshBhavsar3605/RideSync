# RideSync — Cloud-Native Ride-Sharing Platform

A production-ready, horizontally scalable ride-sharing backend built with microservices architecture using Go, gRPC, and Kubernetes. Designed to handle real-time trip matching, dynamic pricing, and payment processing at scale.

## Overview

RideSync is a complete backend system for a ride-sharing application (similar to Uber/Lyft) that demonstrates enterprise-grade software engineering practices. The system handles trip requests, driver matching, real-time location tracking, fare calculation, and payment processing through a distributed microservices architecture.

**Key Capabilities:**

- Real-time trip preview with route calculation and fare estimation
- Live driver-rider matching via WebSocket connections
- Event-driven architecture for asynchronous operations
- Distributed tracing across all services
- Payment processing with Stripe integration
- Containerized deployment with Kubernetes orchestration

## Performance Benchmarks

The system includes a custom-built load testing framework (`tests/load/`) that validates messaging throughput, end-to-end reliability, and latency under sustained load. Tests run directly against the live RabbitMQ infrastructure.

### Trip Creation — Queue Reliability (`-rate 1000 -duration 2m`)

Publishes `trip.event.created` events at 1,000 msg/sec and verifies delivery to the real `find_available_drivers` queue.

| Metric             | Result                          |
| ------------------ | ------------------------------- |
| Throughput         | **792 msg/sec**                 |
| Reliability        | **100.00%** (0 failures, 0 DLQ) |
| Messages Processed | 99,064                          |
| P50 Latency        | 217 µs                          |
| P95 Latency        | 2.9 ms                          |
| P99 Latency        | 6.6 ms                          |

### Full End-to-End Flow (`-rate 200 -duration 1m`)

Simulates the complete event chain: `trip.event.created` → `driver.cmd.trip_request` → `driver.cmd.trip_accept` → `payment.event.success`, using mock service orchestrators to traverse all four event hops.

| Metric             | Result                          |
| ------------------ | ------------------------------- |
| Throughput         | **162 msg/sec**                 |
| Reliability        | **100.00%** (0 failures, 0 DLQ) |
| Messages Processed | 11,377                          |
| P50 Latency        | 275 µs                          |
| P95 Latency        | 3.6 ms                          |
| P99 Latency        | 9.6 ms                          |

> The load test runner enforces a **99.9% reliability threshold** and exits with a warning if it is not met.

## Scalability & Design Goals

RideSync is designed with production-scale constraints and distributed systems best practices:

- Stateless microservices for horizontal scaling behind Kubernetes
- Event-driven trip lifecycle using RabbitMQ to avoid synchronous bottlenecks
- Message retry policy (up to 3 attempts) with Dead Letter Queue (DLQ) for failed event handling
- Per-request gRPC communication to prevent connection contention and cascading failures
- Independent service scaling (Trip, Driver, Payment) based on workload characteristics
- Observability-first design with distributed tracing for latency and failure analysis

## Architecture

### System Design

The platform consists of four microservices (API Gateway, Trip, Driver, and Payment) communicating via gRPC and RabbitMQ:

```mermaid
flowchart RL
    %% Subgraph Definitions
    subgraph External [External Clients and Services]
        direction TB
        Stripe[Stripe Webhooks]
        Mobile[Mobile Clients]
        Web[Web Application<br/>Port 3000]
        OSRM[OSRM Routing API]
    end

    subgraph Gateway [Gateway Layer]
        APIGW[api-gateway<br/>Port 8081<br/>HTTP/WebSocket]
    end

    subgraph Backend [Backend Services]
        Payment[payment-service<br/>Port 9004<br/>Event-Driven]
        Driver[driver-service<br/>Port 50052<br/>gRPC Server]
        Trip[trip-service<br/>Port 50051<br/>gRPC Server]
    end

    subgraph Broker [Message Broker]
        direction TB
        Rabbit[RabbitMQ<br/>Port 5672 AMQP<br/>Port 15672 Management]
        TripEx[TripExchange<br/>type: topic]
        DLX[DeadLetterExchange<br/>type: topic]
    end

    subgraph Data [Data Layer]
        Mongo[MongoDB<br/>Database: ride-sharing]
    end

    subgraph Obs [Observability]
        Jaeger[Jaeger<br/>Port 16686 UI<br/>Port 14268 Collector]
    end

    %% --- Relationships ---

    %% External to Gateway
    Stripe -->|POST /webhook/stripe| APIGW
    Mobile -->|HTTP/WS| APIGW
    Web -->|HTTP/WS| APIGW

    %% Gateway to Backend
    APIGW -->|gRPC| Driver
    APIGW -->|gRPC| Trip

    %% Backend Service Inter-connections & Outbound
    Payment -->|HTTPS| Stripe
    Trip -->|GET /route| OSRM

    %% Database Connections
    Driver -->|Query/Store| Mongo
    Trip -->|Query/Store| Mongo

    %% Message Broker Connections
    APIGW -->|Publish/Consume| Rabbit
    Payment -->|Publish/Consume| Rabbit
    Trip -->|Publish/Consume| Rabbit
    Driver -->|Consume| Rabbit

    %% Broker Internal Exchanges
    Rabbit --> TripEx
    Rabbit --> DLX

    %% Observability (Traces)
    %% Using dotted lines
    Payment -.->|Traces| Jaeger
    Driver -.->|Traces| Jaeger
    Trip -.->|Traces| Jaeger
    APIGW -.->|Traces| Jaeger
```

### Trip Lifecycle — Event Flow

```mermaid
sequenceDiagram
    participant C as Mobile/Web Client
    participant G as api-gateway
    participant T as trip-service
    participant Q as RabbitMQ (TripExchange)
    participant D as driver-service

    note over C,T: Synchronous (gRPC)
    C->>G: POST /trip/start
    G->>T: gRPC: CreateTrip()
    T-->>G: TripID Created
    G-->>C: 201 Created

    note over T,D: Asynchronous (AMQP)
    T->>Q: Publish: trip.created
    Q->>D: Consume: trip.created
        D->>D: Run Matching Logic
    D->>Q: Publish: driver.assigned

    note over C,Q: Real-time (WebSocket)
    Q->>G: Consume: driver.assigned
    G-->>C: WebSocket: Driver Found
```

### Technology Stack

**Backend Services:**

| Concern                     | Technology              |
| --------------------------- | ----------------------- |
| Language                    | Go 1.23+                |
| Inter-service communication | gRPC + Protocol Buffers |
| Async messaging             | RabbitMQ (AMQP)         |
| Database                    | MongoDB                 |
| Payment                     | Stripe API              |

**Infrastructure:**

| Concern            | Technology                  |
| ------------------ | --------------------------- |
| Containerization   | Docker (multi-stage builds) |
| Orchestration      | Kubernetes (Minikube / GKE) |
| Local dev workflow | Tilt (live reload)          |
| Observability      | Jaeger (OpenTelemetry)      |

**Frontend:**

| Concern   | Technology              |
| --------- | ----------------------- |
| Framework | Next.js 15 (React 19)   |
| Styling   | Tailwind CSS            |
| Maps      | Leaflet / React-Leaflet |
| Real-time | WebSocket client        |

### Clean Architecture

The Trip and Payment services follow hexagonal architecture principles with clear separation of concerns:

- **Domain Layer** — Business logic and port definitions
- **Service Layer** — Use case implementations
- **Infrastructure Layer** — External adapters (gRPC handlers, repositories, event consumers/publishers)

## Load Testing

The `tests/load/` package is a purpose-built load testing tool written in Go. It connects directly to RabbitMQ and validates the messaging infrastructure under sustained load.

### Scenarios

| Scenario flag   | What it tests                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `trip-creation` | Publishes `trip.event.created` events and verifies delivery to the real `find_available_drivers` queue |
| `full-flow`     | Simulates the full 4-hop event chain using mock service orchestrators                                  |

### Running Tests

```
# Queue reliability at 1,000 msg/sec for 2 minutes
go run tests/load/main.go -rate 1000 -duration 2m -scenario trip-creation

# Full end-to-end event chain at 200 msg/sec for 1 minute
go run tests/load/main.go -rate 200 -duration 1m -scenario full-flow

# Custom RabbitMQ URI
go run tests/load/main.go -rate 500 -duration 5m -scenario trip-creation \
  -rabbitmq-uri amqp://user:pass@host:5672/
```

Each run saves a timestamped report file (`load-test-report-YYYYMMDD-HHMMSS.txt`) and prints a summary with throughput, reliability, latency percentiles (P50/P95/P99), retry counts, and DLQ counts.

## Quick Start

### Prerequisites

- Docker
- Go 1.23+
- Tilt
- Kubernetes cluster (Minikube)
- kubectl

### Running Locally

```
# Start all services with hot reload
tilt up

# Open Tilt UI
open http://localhost:10350
```

### Monitoring

```
# View running pods
kubectl get pods

# Kubernetes dashboard
minikube dashboard

# Distributed traces
open http://localhost:16686 # Jaeger UI
```

## API Endpoints

**Trip Management:**

- `POST /trip/preview` — Calculate route and fare estimates
- `POST /trip/start` — Create a new trip

**Real-time Communication:**

- `WS /ws/riders` — Rider WebSocket connection
- `WS /ws/drivers` — Driver WebSocket connection

**Webhooks:**

- `POST /webhook/stripe` — Stripe payment webhooks

## Key Engineering Practices

1. **Distributed Tracing** \
   Full request tracing across all services using OpenTelemetry and Jaeger for debugging and performance monitoring.

2. **Event-Driven Architecture** \
   Asynchronous communication via RabbitMQ decouples services and improves resilience. The trip lifecycle is choreographed entirely through events.

3. **Resilience Patterns** \
   Per-request gRPC client pattern prevents cascading failures between services. Failed messages are retried up to 3 times before routing to a Dead Letter Queue.

4. **Protocol Optimization**
   - JSON for external APIs (developer-friendly)
   - Protocol Buffers for internal gRPC communication (performance)
5. **Infrastructure as Code** \
   Complete Kubernetes manifests for both development and production environments, including health checks and resource limits.

6. **Validated Reliability** \
   A custom load testing framework validates the messaging infrastructure against a 99.9% reliability threshold, with latency percentile tracking and DLQ monitoring.

## Production Deployment

The project includes complete deployment configurations for Google Cloud Platform (GKE):

- Multi-stage Docker builds for optimized images
- Kubernetes manifests with health checks and resource limits
- Managed SSL certificates
- Secret management

## Project Structure

```
RideSync/
├── services/                 # Microservices
│   ├── api-gateway/          # HTTP/WebSocket edge service
│   ├── trip-service/         # Trip lifecycle & matching logic
│   ├── driver-service/       # Driver state & availability
│   └── payment-service/      # Payment processing
│
├── web/                      # Next.js frontend
│
├── proto/                    # gRPC service definitions
│
├── shared/                   # Shared libraries
│   ├── db/                   # MongoDB connection
│   ├── messaging/            # RabbitMQ client & utilities
│   └── types/                # Common models & helpers
│
├── tests/
│   ├── load/                 # Load testing framework
│   │   ├── main.go           # CLI entrypoint (rate, duration, scenario flags)
│   │   ├── scenarios/        # trip-creation, full-flow, broker-reliability
│   │   ├── metrics/          # Thread-safe collector (latencies, DLQ, retries)
│   │   └── reporter/         # Summary report generator (P50/P95/P99)
│   └── config/
│       └── test-profiles.yaml
│
├── infra/                    # Infrastructure configs
│   ├── development/          # Local Docker + Kubernetes manifests
│   └── production/           # Production Kubernetes configs
│
├── Tiltfile                  # Local dev orchestration (live reload)
├── go.mod
└── README.md
```

---

## What This Project Demonstrates

- **Microservices Architecture** — Service decomposition, API design, inter-service communication patterns
- **Distributed Systems** — Event-driven choreography, distributed tracing, DLQ-backed resilience
- **Performance Engineering** — Custom load testing tooling, latency percentile analysis, throughput validation
- **Cloud-Native Development** — Containerization, Kubernetes orchestration, 12-factor app principles
- **Backend Engineering** — Go, gRPC, Protocol Buffers, WebSocket, AMQP
- **DevOps** — Docker, Kubernetes, Tilt live-reload, observability-first design
- **Full-Stack Integration** — Next.js frontend with real-time WebSocket communication
