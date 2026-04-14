package scenarios

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"ride-sharing/shared/contracts"
	"ride-sharing/shared/messaging"
	"ride-sharing/tests/load/metrics"
	"sync"
	"time"
)

type TripCreationScenario struct {
	Config  ScenarioConfig
	NameStr string
}

func NewTripCreationScenario(cfg ScenarioConfig) *TripCreationScenario {
	return &TripCreationScenario{
		Config:  cfg,
		NameStr: "Real Queue Reliability Test (find_available_drivers)",
	}
}

func (s *TripCreationScenario) Name() string {
	return s.NameStr
}

func (s *TripCreationScenario) Run(ctx context.Context, rmq *messaging.RabbitMQ, collector *metrics.Collector) error {
	log.Printf("Starting scenario: %s", s.Name())

	var wg sync.WaitGroup
	ticker := time.NewTicker(time.Second / time.Duration(s.Config.Rate))
	defer ticker.Stop()

	testCtx, cancel := context.WithTimeout(ctx, s.Config.Duration)
	defer cancel()

	// 1. Start consuming from the ACTUAL application queue
	ready := make(chan struct{})
	go s.consumeFromRealQueue(ctx, rmq, collector, ready)

	// Wait for consumer to be ready
	<-ready
	log.Printf("Consumer ready on %s. Starting message publication...", messaging.FindAvailableDriversQueue)

	for {
		select {
		case <-testCtx.Done():
			wg.Wait()
			return nil
		case <-ticker.C:
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.publishTripCreated(ctx, rmq, collector)
			}()
		}
	}
}

func (s *TripCreationScenario) publishTripCreated(ctx context.Context, rmq *messaging.RabbitMQ, collector *metrics.Collector) {
	start := time.Now()
	id := fmt.Sprintf("test-trip-%d", rand.Int63())

	msg := contracts.AmqpMessage{
		OwnerID: id,
		Data:    []byte(`{"rider_id": "tester", "origin": [0,0], "destination": [0,0]}`),
	}

	// Publish to the real TripExchange
	err := rmq.PublishMessage(ctx, contracts.TripEventCreated, msg)
	if err != nil {
		collector.IncrementFailed("publish_error: " + err.Error())
		return
	}

	collector.IncrementSent()
	collector.RecordLatency(time.Since(start))
}

func (s *TripCreationScenario) consumeFromRealQueue(ctx context.Context, rmq *messaging.RabbitMQ, collector *metrics.Collector, ready chan struct{}) {
	// Consuming from the ACTUAL queue defined in the system
	queueName := messaging.FindAvailableDriversQueue

	msgs, err := rmq.Channel.Consume(
		queueName,
		"reliability-tester-consumer",
		false, // auto-ack: false (we will manual ack to be safe)
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf("Failed to consume from %s: %v", queueName, err)
		return
	}

	close(ready)

	for {
		select {
		case <-ctx.Done():
			return
		case msg, ok := <-msgs:
			if !ok {
				return
			}
			// Proof of delivery: Message reached the real queue!
			collector.IncrementSuccess()

			// Acknowledge so the message is removed from RabbitMQ
			_ = msg.Ack(false)
		}
	}
}
