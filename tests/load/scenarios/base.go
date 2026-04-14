package scenarios

import (
	"context"
	"ride-sharing/shared/messaging"
	"ride-sharing/tests/load/metrics"
	"time"
)

type Scenario interface {
	Run(ctx context.Context, rmq *messaging.RabbitMQ, collector *metrics.Collector) error
	Name() string
}

type ScenarioConfig struct {
	Rate       int           // messages per second
	Duration   time.Duration // test duration
	Concurrent int           // number of concurrent publishers
}
