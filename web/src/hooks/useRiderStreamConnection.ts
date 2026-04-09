import { useEffect, useState, useCallback, useRef } from "react";
import { Driver, Coordinate } from "../types";
import {
  PaymentEventSessionCreatedData,
  TripEvents,
  ServerWsMessage,
  BackendEndpoints,
  BackendTrip,
  normalizeTrip,
} from "../contracts";
import { useBaseWebSocket } from "./useBaseWebSocket";

export function useRiderStreamConnection(location: Coordinate, userID: string) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tripStatus, setTripStatus] = useState<TripEvents | null>(null);
  const [paymentSession, setPaymentSession] =
    useState<PaymentEventSessionCreatedData | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);
  const sendMessageRef = useRef<(message: Record<string, unknown>) => void>(
    () => {},
  );

  const handleMessage = useCallback((message: ServerWsMessage) => {
    switch (message.type) {
      case TripEvents.DriverLocation:
        setDrivers(message.data as Driver[]);
        break;
      case TripEvents.PaymentSessionCreated:
        setPaymentSession(message.data as PaymentEventSessionCreatedData);
        setTripStatus(message.type);
        break;
      case TripEvents.DriverAssigned: {
        const rawData = message.data as { trip: BackendTrip } | BackendTrip;
        const data: BackendTrip =
          "trip" in rawData ? rawData.trip : (rawData as BackendTrip);

        const normalizedTrip = normalizeTrip(data);
        if (normalizedTrip.driver) {
          setAssignedDriver(normalizedTrip.driver);
        }
        setTripStatus(message.type);
        break;
      }
      case TripEvents.Created:
      case TripEvents.NoDriversFound:
        setTripStatus(message.type);
        break;
    }
  }, []);

  const { ws, error, sendMessage } = useBaseWebSocket({
    endpoint: `${BackendEndpoints.WS_RIDERS}?userID=${userID}`,
    onMessage: handleMessage,
  });

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN && location) {
      sendMessage({
        type: TripEvents.DriverLocation,
        data: { location },
      });
    }
  }, [location, ws, sendMessage]);

  const resetTripStatus = () => {
    setTripStatus(null);
    setPaymentSession(null);
    setAssignedDriver(null);
  };

  return {
    drivers,
    assignedDriver,
    error,
    tripStatus,
    paymentSession,
    resetTripStatus,
  };
}
