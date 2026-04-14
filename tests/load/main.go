package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"ride-sharing/shared/messaging"
	"ride-sharing/tests/load/metrics"
	"ride-sharing/tests/load/reporter"
	"ride-sharing/tests/load/scenarios"
	"syscall"
	"time"
)

func main() {
	rate := flag.Int("rate", 100, "Messages per second")
	duration := flag.Duration("duration", 1*time.Minute, "Test duration (e.g. 10m, 5m)")
	rabbitmqURI := flag.String("rabbitmq-uri", "amqp://guest:guest@localhost:5672/", "RabbitMQ connection URI")
	scenarioName := flag.String("scenario", "trip-creation", "Test scenario (trip-creation, peak, failure-injection)")
	
	flag.Parse()

	log.Printf("Starting Load Test: rate=%d, duration=%s, scenario=%s", *rate, *duration, *scenarioName)

	rmq, err := messaging.NewRabbitMQ(*rabbitmqURI)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer rmq.Close()

	collector := metrics.NewCollector()
	
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var scenario scenarios.Scenario
	cfg := scenarios.ScenarioConfig{
		Rate:     *rate,
		Duration: *duration,
	}

	switch *scenarioName {
	case "trip-creation":
		scenario = scenarios.NewTripCreationScenario(cfg)
	case "full-flow":
		scenario = scenarios.NewFullTripFlowScenario(cfg)
	default:
		log.Fatalf("Unknown scenario: %s", *scenarioName)
	}

	err = scenario.Run(ctx, rmq, collector)
	if err != nil {
		log.Printf("Scenario failed: %v", err)
	}

	// Give a small grace period for final messages to arrive
	log.Printf("Test finished, waiting 5 seconds for final outcomes...")
	time.Sleep(5 * time.Second)

	result := collector.GetResult()
	summary := reporter.GenerateSummary(result)
	fmt.Println(summary)

	// Save to file
	reportFile := fmt.Sprintf("load-test-report-%s.txt", time.Now().Format("20060102-150405"))
	if err := os.WriteFile(reportFile, []byte(summary), 0644); err != nil {
		log.Printf("Failed to save report: %v", err)
	} else {
		log.Printf("Report saved to %s", reportFile)
	}

	// Validation check for 99.9% reliability
	reliability := (float64(result.TotalSuccess) / float64(result.TotalSent)) * 100
	if reliability < 99.9 && result.TotalSent > 0 {
		log.Printf("WARNING: Reliability below 99.9%% threshold (%.2f%%)", reliability)
		// Don't exit with error here, as this is a test tool that reports results
	} else {
		log.Printf("SUCCESS: Reliability above 99.9%% threshold (%.2f%%)", reliability)
	}
}
