"use client";

import { useDriverStreamConnection } from "../hooks/useDriverStreamConnection";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { MapClickHandler } from "./MapClickHandler";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { CarPackageSlug, Coordinate } from "../types";
import { DriverTripOverview } from "./DriverTripOverview";
import * as Geohash from "ngeohash";
import { RoutingControl } from "./RoutingControl";
import { DriverCard } from "./DriverCard";
import { TripEvents } from "../contracts";

import { MapControls } from "./MapControls";
import { MapSync } from "./MapSync";
import {
  driverMarkerIcon,
  pickupMarkerIcon,
  destinationMarkerIcon,
} from "../lib/map-icons";

const START_LOCATION: Coordinate = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export const DriverMap = ({ packageSlug }: { packageSlug: CarPackageSlug }) => {
  const mapRef = useRef<L.Map>(null);
  const userID = useMemo(() => crypto.randomUUID(), []);
  const [driverLocation, setDriverLocation] =
    useState<Coordinate>(START_LOCATION);
  const [isFollowing, setIsFollowing] = useState(true);

  const driverGeohash = useMemo(
    () =>
      Geohash.encode(driverLocation?.latitude, driverLocation?.longitude, 7),
    [driverLocation?.latitude, driverLocation?.longitude],
  );

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setDriverLocation(newLocation);
        },
        (error) => {
          console.error("Error watching driver location:", error);
        },
        { enableHighAccuracy: true },
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const requestCurrentLocation = useCallback(() => {
    setIsFollowing(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setDriverLocation(newLocation);
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        { enableHighAccuracy: true },
      );
    }
  }, []);

  const {
    error,
    driver,
    tripStatus,
    requestedTrip,
    sendMessage,
    setTripStatus,
    resetTripStatus,
  } = useDriverStreamConnection({
    location: driverLocation,
    geohash: driverGeohash,
    userID,
    packageSlug,
  });

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    if ((e.originalEvent.target as HTMLElement).closest(".map-control")) {
      return;
    }
    setIsFollowing(false);
  };

  const handleAcceptTrip = () => {
    if (!requestedTrip || !requestedTrip.id || !driver) {
      alert("No trip ID found or driver is not set");
      return;
    }

    sendMessage({
      type: TripEvents.DriverTripAccept,
      data: {
        tripID: requestedTrip.id,
        riderID: requestedTrip.userID,
        driver: driver,
      },
    });

    setTripStatus(TripEvents.DriverTripAccept);
  };

  const handleDeclineTrip = () => {
    if (!requestedTrip || !requestedTrip.id || !driver) {
      alert("No trip ID found or driver is not set");
      return;
    }

    sendMessage({
      type: TripEvents.DriverTripDecline,
      data: {
        tripID: requestedTrip.id,
        riderID: requestedTrip.userID,
        driver: driver,
      },
    });

    setTripStatus(TripEvents.DriverTripDecline);
    resetTripStatus();
  };

  const parsedRoute = useMemo(
    () =>
      requestedTrip?.route?.geometry[0]?.coordinates.map(
        (coord) => [coord?.latitude, coord?.longitude] as [number, number],
      ),
    [requestedTrip],
  );

  const destination = useMemo(
    () =>
      requestedTrip?.route?.geometry[0]?.coordinates[
        requestedTrip?.route?.geometry[0]?.coordinates?.length - 1
      ],
    [requestedTrip],
  );

  const startLocation = useMemo(
    () => requestedTrip?.route?.geometry[0]?.coordinates[0],
    [requestedTrip],
  );

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="relative flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50">
      <div className="relative flex-1 h-full">
        <MapContainer
          center={[driverLocation.latitude, driverLocation.longitude]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          zoomControl={false}
        >
          <MapSync location={driverLocation} isFollowing={isFollowing} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/'>CARTO</a>"
          />

          <MapControls
            mapRef={mapRef}
            onRecenter={requestCurrentLocation}
            isFollowing={isFollowing}
          />

          <Marker
            key={userID}
            position={[driverLocation.latitude, driverLocation.longitude]}
            icon={driverMarkerIcon as L.DivIcon}
          >
            <Popup className="custom-popup">
              <div className="p-2">
                <p className="font-bold text-slate-900">Your Vehicle</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  Status: Online
                </p>
              </div>
            </Popup>
          </Marker>

          {startLocation && (
            <Marker
              position={[startLocation.latitude, startLocation.longitude]}
              icon={pickupMarkerIcon as L.DivIcon}
            >
              <Popup>Pickup Location</Popup>
            </Marker>
          )}

          {destination && (
            <Marker
              position={[destination.latitude, destination.longitude]}
              icon={destinationMarkerIcon as L.DivIcon}
            >
              <Popup>Destination</Popup>
            </Marker>
          )}

          {parsedRoute && <RoutingControl route={parsedRoute} />}

          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>

        {!requestedTrip && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-6 text-center">
            <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-sm font-semibold text-slate-900">
                  Waiting for requests...
                </p>
              </div>
              <p className="text-xs text-slate-500 text-center">
                You&apos;ll be notified when a rider nearby needs a trip
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="map-sidebar flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20">
        <div className="p-6 border-b bg-slate-50/50">
          <DriverCard driver={driver} packageSlug={packageSlug} />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <DriverTripOverview
            trip={requestedTrip}
            status={tripStatus}
            onAcceptTrip={handleAcceptTrip}
            onDeclineTrip={handleDeclineTrip}
          />
        </div>
      </div>
    </div>
  );
};
