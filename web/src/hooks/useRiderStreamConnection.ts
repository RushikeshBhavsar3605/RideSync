import { useEffect, useState, useCallback } from 'react';
import { Trip, Driver, Coordinate } from '../types';
import { PaymentEventSessionCreatedData, TripEvents, ServerWsMessage, BackendEndpoints } from '../contracts';
import { useBaseWebSocket } from './useBaseWebSocket';

export function useRiderStreamConnection(location: Coordinate, userID: string) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tripStatus, setTripStatus] = useState<TripEvents | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentEventSessionCreatedData | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<Trip["driver"] | null>(null);

  const handleMessage = useCallback((message: ServerWsMessage) => {
    switch (message.type) {
      case TripEvents.DriverLocation:
        setDrivers(message.data);
        break;
      case TripEvents.PaymentSessionCreated:
        setPaymentSession(message.data);
        setTripStatus(message.type);
        break;
      case TripEvents.DriverAssigned:
        setAssignedDriver(message.data.driver);
        setTripStatus(message.type);
        break;
      case TripEvents.Created:
      case TripEvents.NoDriversFound:
        setTripStatus(message.type);
        break;
    }
  }, []);

  const sendInitialLocation = useCallback(() => {
    if (location) {
      sendMessage({
        type: TripEvents.DriverLocation,
        data: { location }
      });
    }
  }, [location]);

  const { ws, error, sendMessage } = useBaseWebSocket({
    endpoint: `${BackendEndpoints.WS_RIDERS}?userID=${userID}`,
    onMessage: handleMessage,
    onOpen: sendInitialLocation
  });

  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN && location) {
      sendMessage({
        type: TripEvents.DriverLocation,
        data: { location }
      });
    }
  }, [location, ws, sendMessage]);

  const resetTripStatus = () => {
    setTripStatus(null);
    setPaymentSession(null);
    setAssignedDriver(null);
  }

  return { drivers, assignedDriver, error, tripStatus, paymentSession, resetTripStatus };
}
