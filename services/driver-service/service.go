package main

import (
	math "math/rand/v2"
	pb "ride-sharing/shared/proto/driver"
	"ride-sharing/shared/util"
	"sync"

	"github.com/mmcloughlin/geohash"
)

type Service struct {
	drivers []*DriverInMap
	mu      sync.RWMutex
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

func (s *Service) FindAvailableDrivers(packageType string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var matchingDrivers []string

	for _, driver := range s.drivers {
		if driver.Driver.PackageSlug == packageType {
			matchingDrivers = append(matchingDrivers, driver.Driver.Id)
		}
	}

	if len(matchingDrivers) == 0 {
		return []string{}
	}

	return matchingDrivers
}

func (s *Service) RegisterDriver(driverId string, packageSlug string, initialLocation *pb.Location) (*pb.Driver, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var lat, lon float64
	var randomIndex int

	if initialLocation != nil {
		lat = initialLocation.Latitude
		lon = initialLocation.Longitude
		randomIndex = math.IntN(len(PredefinedRoutes)) // Still used for avatar/plate randomness
	} else {
		randomIndex = math.IntN(len(PredefinedRoutes))
		randomRoute := PredefinedRoutes[randomIndex]
		lat = randomRoute[0][0]
		lon = randomRoute[0][1]
	}

	randomPlate := GenerateRandomPlate()
	randomAvatar := util.GetRandomAvatar(randomIndex)

	geohashStr := geohash.Encode(lat, lon)

	driver := &pb.Driver{
		Id:             driverId,
		Geohash:        geohashStr,
		Location:       &pb.Location{Latitude: lat, Longitude: lon},
		Name:           "John Doe",
		PackageSlug:    packageSlug,
		ProfilePicture: randomAvatar,
		CarPlate:       randomPlate,
	}

	s.drivers = append(s.drivers, &DriverInMap{
		Driver: driver,
	})

	return driver, nil
}

func (s *Service) UnregisterDriver(driverId string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, driver := range s.drivers {
		if driver.Driver.Id == driverId {
			s.drivers = append(s.drivers[:i], s.drivers[i+1:]...)
		}
	}
}
