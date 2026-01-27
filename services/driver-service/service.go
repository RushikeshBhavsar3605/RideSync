package main

import pb "ride-sharing/shared/proto/driver"

type Service struct {
	drivers []*DriverInMap
}

type DriverInMap struct {
	Driver *pb.Driver
	// Index int
	// TODO: route
}

func NewService() *Service {
	return &Service{
		drivers: make([]*DriverInMap, 0),
	}
}

// TODO: Register and Unregister methods
