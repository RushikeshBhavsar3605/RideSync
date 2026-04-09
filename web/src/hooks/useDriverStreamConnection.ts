import { useEffect, useState, useCallback, useRef } from "react";
import { Trip, Driver, CarPackageSlug } from "../types";
import {
  ServerWsMessage,
  TripEvents,
  BackendEndpoints,
  BackendTrip,
  BackendDriver,
  normalizeTrip,
  normalizeDriver,
} from "../contracts";
import { useBaseWebSocket } from "./useBaseWebSocket";

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
  packageSlug,
}: useDriverConnectionProps) => {
  const [requestedTrip, setRequestedTrip] = useState<Trip | null>(null);
  const [tripStatus, setTripStatus] = useState<TripEvents | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const sendMessageRef = useRef<(message: Record<string, unknown>) => void>(
    () => {},
  );

  const handleMessage = useCallback((message: ServerWsMessage) => {
    switch (message.type) {
      case TripEvents.DriverTripRequest: {
        const rawData = message.data as { trip: BackendTrip } | BackendTrip;
        const data: BackendTrip =
          "trip" in rawData ? rawData.trip : (rawData as BackendTrip);

        setRequestedTrip(normalizeTrip(data));
        break;
      }
      case TripEvents.DriverRegister: {
        const driverData = message.data as BackendDriver;
        setDriver(normalizeDriver(driverData));
        break;
      }
    }
    setTripStatus(message.type);
  }, []);

  const sendInitialLocation = useCallback(() => {
    if (location) {
      sendMessageRef.current({
        type: TripEvents.DriverLocation,
        data: { location, geohash },
      });
    }
  }, [location, geohash]);

  const { ws, error, sendMessage } = useBaseWebSocket({
    endpoint: `${BackendEndpoints.WS_DRIVERS}?userID=${userID}&packageSlug=${packageSlug}`,
    onMessage: handleMessage,
    onOpen: sendInitialLocation,
  });

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const resetTripStatus = useCallback(() => {
    setTripStatus(null);
    setRequestedTrip(null);
  }, []);

  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN && location) {
      sendMessage({
        type: TripEvents.DriverLocation,
        data: { location, geohash },
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
    setTripStatus,
  };
};
