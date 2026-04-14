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

type BrokerReliabilityScenario struct {
	Config  ScenarioConfig
	NameStr string
}

func NewBrokerReliabilityScenario(cfg ScenarioConfig) *BrokerReliabilityScenario {
	return &BrokerReliabilityScenario{
		Config:  cfg,
		NameStr: "Messaging Infrastructure Reliability Test",
	}
}

func (s *BrokerReliabilityScenario) Name() string {
	return s.NameStr
}

func (s *BrokerReliabilityScenario) Run(ctx context.Context, rmq *messaging.RabbitMQ, collector *metrics.Collector) error {
	log.Printf("Starting scenario: %s", s.Name())

	var wg sync.WaitGroup
	ticker := time.NewTicker(time.Second / time.Duration(s.Config.Rate))
	defer ticker.Stop()

	testCtx, cancel := context.WithTimeout(ctx, s.Config.Duration)
	defer cancel()

	// 1. Create a dedicated queue for this test to avoid interference with services
	queueName := fmt.Sprintf("load-test-broker-val-%d", rand.Intn(10000))
	routingKey := "test.reliability.check"

	_, err := rmq.Channel.QueueDeclare(
		queueName,
		true,  // durable
		false, // auto-delete
		true,  // exclusive
		false, // no-wait
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to declare test queue: %v", err)
	}

	err = rmq.Channel.QueueBind(queueName, routingKey, messaging.TripExchange, false, nil)
	if err != nil {
		return fmt.Errorf("failed to bind test queue: %v", err)
	}

	// 2. Start the consumer BEFORE publishing
	go s.consume(ctx, rmq, queueName, collector)

	// 3. Start publishing
	for {
		select {
		case <-testCtx.Done():
			wg.Wait()
			return nil
		case <-ticker.C:
			wg.Add(1)
			go func() {
				defer wg.Done()
				s.publish(testCtx, rmq, routingKey, collector)
			}()
		}
	}
}

func (s *BrokerReliabilityScenario) publish(ctx context.Context, rmq *messaging.RabbitMQ, routingKey string, collector *metrics.Collector) {
	start := time.Now()
	msg := contracts.AmqpMessage{
		OwnerID: "broker-test",
		Data:    []byte(`{"status": "ping"}`),
	}

	err := rmq.PublishMessage(ctx, routingKey, msg)
	if err != nil {
		collector.IncrementFailed("publish_error: " + err.Error())
		return
	}

	collector.IncrementSent()
	collector.RecordLatency(time.Since(start))
}

func (s *BrokerReliabilityScenario) consume(ctx context.Context, rmq *messaging.RabbitMQ, queueName string, collector *metrics.Collector) {
	msgs, err := rmq.Channel.Consume(
		queueName,
		"broker-test-consumer",
		true, // auto-ack for max throughput in infrastructure test
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Printf("Consumer failed: %v", err)
		return
	}

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
