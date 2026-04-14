package metrics

import (
	"sync"
	"time"
)

type Result struct {
	TotalSent       int64
	TotalSuccess    int64
	TotalFailed     int64
	TotalInDLQ      int64
	RetryCounts     map[int]int64
	Latencies       []time.Duration
	Errors          map[string]int64
	StartTime       time.Time
	EndTime         time.Time
}

type Collector struct {
	mu           sync.RWMutex
	sent         int64
	success      int64
	failed       int64
	dlq          int64
	retryCounts  map[int]int64
	latencies    []time.Duration
	errors       map[string]int64
	startTime    time.Time
}

func NewCollector() *Collector {
	return &Collector{
		retryCounts: make(map[int]int64),
		errors:      make(map[string]int64),
		startTime:   time.Now(),
	}
}

func (c *Collector) IncrementSent() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.sent++
}

func (c *Collector) IncrementSuccess() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.success++
}

func (c *Collector) IncrementFailed(err string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.failed++
	c.errors[err]++
}

func (c *Collector) IncrementDLQ() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.dlq++
}

func (c *Collector) RecordRetry(count int) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.retryCounts[count]++
}

func (c *Collector) RecordLatency(latency time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.latencies = append(c.latencies, latency)
}

func (c *Collector) GetResult() Result {
	c.mu.RLock()
	defer c.mu.RUnlock()

	res := Result{
		TotalSent:    c.sent,
		TotalSuccess: c.success,
		TotalFailed:  c.failed,
		TotalInDLQ:   c.dlq,
		RetryCounts:  make(map[int]int64),
		Latencies:    make([]time.Duration, len(c.latencies)),
		Errors:       make(map[string]int64),
		StartTime:    c.startTime,
		EndTime:      time.Now(),
	}

	for k, v := range c.retryCounts {
		res.RetryCounts[k] = v
	}
	for k, v := range c.errors {
		res.Errors[k] = v
	}
	copy(res.Latencies, c.latencies)

	return res
}
