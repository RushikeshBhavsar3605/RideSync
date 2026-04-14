package reporter

import (
	"fmt"
	"ride-sharing/tests/load/metrics"
	"sort"
)

func GenerateSummary(result metrics.Result) string {
	duration := result.EndTime.Sub(result.StartTime)
	throughput := float64(result.TotalSent) / duration.Seconds()
	reliability := (float64(result.TotalSuccess) / float64(result.TotalSent)) * 100

	summary := fmt.Sprintf("\n--- Load Test Summary ---\n")
	summary += fmt.Sprintf("Duration: %s\n", duration)
	summary += fmt.Sprintf("Throughput: %.2f msg/sec\n", throughput)
	summary += fmt.Sprintf("Reliability: %.2f%%\n", reliability)
	summary += fmt.Sprintf("Total Sent: %d\n", result.TotalSent)
	summary += fmt.Sprintf("Total Success: %d\n", result.TotalSuccess)
	summary += fmt.Sprintf("Total Failed: %d\n", result.TotalFailed)
	summary += fmt.Sprintf("Total DLQ: %d\n", result.TotalInDLQ)

	summary += "\n--- Retries ---\n"
	for k, v := range result.RetryCounts {
		summary += fmt.Sprintf("Retry %d: %d\n", k, v)
	}

	summary += "\n--- Latencies ---\n"
	if len(result.Latencies) > 0 {
		sort.Slice(result.Latencies, func(i, j int) bool {
			return result.Latencies[i] < result.Latencies[j]
		})
		summary += fmt.Sprintf("P50: %s\n", result.Latencies[len(result.Latencies)/2])
		summary += fmt.Sprintf("P95: %s\n", result.Latencies[int(float64(len(result.Latencies))*0.95)])
		summary += fmt.Sprintf("P99: %s\n", result.Latencies[int(float64(len(result.Latencies))*0.99)])
	}

	if len(result.Errors) > 0 {
		summary += "\n--- Top Errors ---\n"
		for k, v := range result.Errors {
			summary += fmt.Sprintf("%s: %d\n", k, v)
		}
	}

	return summary
}
