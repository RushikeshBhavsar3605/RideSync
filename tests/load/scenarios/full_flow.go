package scenarios

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"ride-sharing/shared/contracts"
	"ride-sharing/shared/messaging"
	"ride-sharing/tests/load/metrics"
	"sync"
	"time"
)

type FullTripFlowScenario struct {
	Config  ScenarioConfig
	NameStr string
}

func NewFullTripFlowScenario(cfg ScenarioConfig) *FullTripFlowScenario {
	return &FullTripFlowScenario{
		Config:  cfg,
		NameStr: "Full End-to-End Infrastructure Chain",
	}
}

func (s *FullTripFlowScenario) Name() string {
	return s.NameStr
}

func (s *FullTripFlowScenario) Run(ctx context.Context, rmq *messaging.RabbitMQ, collector *metrics.Collector) error {
	log.Printf("Starting scenario: %s", s.Name())

	var wg sync.WaitGroup
	ticker := time.NewTicker(time.Second / time.Duration(s.Config.Rate))
	defer ticker.Stop()

	testCtx, cancel := context.WithTimeout(ctx, s.Config.Duration)
	defer cancel()

	// 1. Start Mock Services to move the message through the chain
	go s.mockTripOrchestrator(ctx, rmq)    // Created -> Driver Req
	go s.mockDriverService(ctx, rmq)       // Driver Req -> Driver Accept
	go s.mockPaymentOrchestrator(ctx, rmq) // Driver Accept -> Payment Success

	// 2. Final listener to mark the whole chain as success
	ready := make(chan struct{})
	go s.listenToFinalOutcome(ctx, rmq, collector, ready)

	<-ready

	for {
		select {
		case <-testCtx.Done():
			wg.Wait()
			log.Printf("Test duration complete. Waiting for final messages in flight...")
			time.Sleep(5 * time.Second)
			return nil
		case <-ticker.C:
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.startTrip(ctx, rmq, collector)
			}()
		}
	}
}

func (s *FullTripFlowScenario) startTrip(ctx context.Context, rmq *messaging.RabbitMQ, collector *metrics.Collector) {
	start := time.Now()
	id := fmt.Sprintf("full-test-%d", rand.Int63())
	msg := contracts.AmqpMessage{
		OwnerID: id,
		Data:    []byte(`{"status": "start"}`),
	}
	_ = rmq.PublishMessage(ctx, contracts.TripEventCreated, msg)
	collector.IncrementSent()
	collector.RecordLatency(time.Since(start))
}

// Mock Trip Service: TripCreated -> DriverRequest
func (s *FullTripFlowScenario) mockTripOrchestrator(ctx context.Context, rmq *messaging.RabbitMQ) {
	q, _ := rmq.Channel.QueueDeclare("mock-trip-svc", false, true, true, false, nil)
	_ = rmq.Channel.QueueBind(q.Name, contracts.TripEventCreated, messaging.TripExchange, false, nil)
	msgs, _ := rmq.Channel.Consume(q.Name, "mock-trip", true, false, false, false, nil)
	for {
		select {
		case <-ctx.Done():
			return
		case d := <-msgs:
			var amqpMsg contracts.AmqpMessage
			_ = json.Unmarshal(d.Body, &amqpMsg)
			_ = rmq.PublishMessage(ctx, contracts.DriverCmdTripRequest, amqpMsg)
		}
	}
}

// Mock Driver Service: DriverRequest -> DriverAccept
func (s *FullTripFlowScenario) mockDriverService(ctx context.Context, rmq *messaging.RabbitMQ) {
	q, _ := rmq.Channel.QueueDeclare("mock-driver-svc", false, true, true, false, nil)
	_ = rmq.Channel.QueueBind(q.Name, contracts.DriverCmdTripRequest, messaging.TripExchange, false, nil)
	msgs, _ := rmq.Channel.Consume(q.Name, "mock-driver", true, false, false, false, nil)
	for {
		select {
		case <-ctx.Done():
			return
		case d := <-msgs:
			var amqpMsg contracts.AmqpMessage
			_ = json.Unmarshal(d.Body, &amqpMsg)
			_ = rmq.PublishMessage(ctx, contracts.DriverCmdTripAccept, amqpMsg)
		}
	}
}

// Mock Payment Service: DriverAccept -> PaymentSuccess
func (s *FullTripFlowScenario) mockPaymentOrchestrator(ctx context.Context, rmq *messaging.RabbitMQ) {
	q, _ := rmq.Channel.QueueDeclare("mock-payment-svc", false, true, true, false, nil)
	_ = rmq.Channel.QueueBind(q.Name, contracts.DriverCmdTripAccept, messaging.TripExchange, false, nil)
	msgs, _ := rmq.Channel.Consume(q.Name, "mock-payment", true, false, false, false, nil)
	for {
		select {
		case <-ctx.Done():
			return
		case d := <-msgs:
			var amqpMsg contracts.AmqpMessage
			_ = json.Unmarshal(d.Body, &amqpMsg)
			_ = rmq.PublishMessage(ctx, contracts.PaymentEventSuccess, amqpMsg)
		}
	}
}

func (s *FullTripFlowScenario) listenToFinalOutcome(ctx context.Context, rmq *messaging.RabbitMQ, collector *metrics.Collector, ready chan struct{}) {
	q, _ := rmq.Channel.QueueDeclare("mock-final-outcome", false, true, true, false, nil)
	_ = rmq.Channel.QueueBind(q.Name, contracts.PaymentEventSuccess, messaging.TripExchange, false, nil)
	msgs, _ := rmq.Channel.Consume(q.Name, "final-sniff", true, false, false, false, nil)
	close(ready)
	for {
		select {
		case <-ctx.Done():
			return
		case _, ok := <-msgs:
			if !ok {
				return
			}
			collector.IncrementSuccess()
		}
	}
}
