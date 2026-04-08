import { useEffect, useState, useCallback } from 'react';
import { Trip, Driver, CarPackageSlug } from '../types';
import { ServerWsMessage, TripEvents, ClientWsMessage, BackendEndpoints } from '../contracts';
import { useBaseWebSocket } from './useBaseWebSocket';

interface useDriverConnectionProps {
  location: {
    latitude: number;
    longitude: number;
  };
  geohash: string;
  userID: string;
  packageSlug: CarPackageSlug;
}

export const useDriverStreamConnection = ({
  location,
  geohash,
  userID,
  packageSlug
}: useDriverConnectionProps) => {
  const [requestedTrip, setRequestedTrip] = useState<Trip | null>(null)
  const [tripStatus, setTripStatus] = useState<TripEvents | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);

  const handleMessage = useCallback((message: ServerWsMessage) => {
    switch (message.type) {
      case TripEvents.DriverTripRequest:
        const trip = message.data?.trip || message.data;
        setRequestedTrip(trip);
        break;
      case TripEvents.DriverRegister:
        setDriver(message.data);
        break;
    }
    setTripStatus(message.type);
  }, []);

  const sendInitialLocation = useCallback(() => {
    if (location) {
      sendMessage({
        type: TripEvents.DriverLocation,
        data: { location, geohash }
      });
    }
  }, [location, geohash]);

  const { ws, error, sendMessage, setTripStatus: setHookStatus } = useBaseWebSocket({
    endpoint: `${BackendEndpoints.WS_DRIVERS}?userID=${userID}&packageSlug=${packageSlug}`,
    onMessage: handleMessage,
    onOpen: sendInitialLocation
  });

  const resetTripStatus = useCallback(() => {
    setTripStatus(null);
    setRequestedTrip(null);
  }, []);

  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN && location) {
      sendMessage({
        type: TripEvents.DriverLocation,
        data: { location, geohash }
      });
    }
  }, [location, geohash, ws, sendMessage]);

  return { 
    error, 
    tripStatus, 
    driver, 
    requestedTrip, 
    resetTripStatus, 
    sendMessage, 
    setTripStatus 
  };
}
