"use client";

import { useDriverStreamConnection } from "../hooks/useDriverStreamConnection";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { MapClickHandler } from "./MapClickHandler";
import { useMemo, useState } from "react";
import { useRef } from "react";
import { CarPackageSlug, Coordinate } from "../types";
import { DriverTripOverview } from "./DriverTripOverview";
import * as Geohash from "ngeohash";
import { RoutingControl } from "./RoutingControl";
import { DriverCard } from "./DriverCard";
import { TripEvents } from "../contracts";

const START_LOCATION: Coordinate = {
  latitude: 37.7749,
  longitude: -122.4194,
};

const driverMarkerIcon =
  typeof window !== "undefined"
    ? L.divIcon({
        className: "driver-marker-container",
        html: `
    <div class="driver-marker-icon">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    </div>
  `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      })
    : null;

const pickupMarkerIcon =
  typeof window !== "undefined"
    ? L.divIcon({
        className: "pickup-marker-container",
        html: `
    <div class="relative flex flex-col items-center">
      <svg width="32" height="40" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="filter drop-shadow-md">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 30 12 30C12 30 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#10b981"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
      <div class="w-2 h-1 bg-black/20 rounded-full blur-[1px] mt-0.5"></div>
    </div>
  `,
        iconSize: [32, 42],
        iconAnchor: [16, 40],
      })
    : null;

const destinationMarkerIcon =
  typeof window !== "undefined"
    ? L.divIcon({
        className: "destination-marker",
        html: `
    <div class="relative flex flex-col items-center">
      <svg width="32" height="40" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg" class="filter drop-shadow-md">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 30 12 30C12 30 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#dc2626"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
      <div class="w-2 h-1 bg-black/20 rounded-full blur-[1px] mt-0.5"></div>
    </div>
  `,
        iconSize: [32, 42],
        iconAnchor: [16, 40],
      })
    : null;

export const DriverMap = ({ packageSlug }: { packageSlug: CarPackageSlug }) => {
  const mapRef = useRef<L.Map>(null);
  const userID = useMemo(() => crypto.randomUUID(), []);
  const [riderLocation, setRiderLocation] =
    useState<Coordinate>(START_LOCATION);

  const driverGeohash = useMemo(
    () => Geohash.encode(riderLocation?.latitude, riderLocation?.longitude, 7),
    [riderLocation?.latitude, riderLocation?.longitude],
  );

  const {
    error,
    driver,
    tripStatus,
    requestedTrip,
    sendMessage,
    setTripStatus,
    resetTripStatus,
  } = useDriverStreamConnection({
    location: riderLocation,
    geohash: driverGeohash,
    userID,
    packageSlug,
  });

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    // 🚫 Ignore clicks coming from controls
    if ((e.originalEvent.target as HTMLElement).closest(".map-control")) {
      return;
    }

    setRiderLocation({
      latitude: e.latlng.lat,
      longitude: e.latlng.lng,
    });
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
        (coord) => [coord?.longitude, coord?.latitude] as [number, number],
      ),
    [requestedTrip],
  );

  // destination is the last coordinate in the route
  const destination = useMemo(
    () =>
      requestedTrip?.route?.geometry[0]?.coordinates[
        requestedTrip?.route?.geometry[0]?.coordinates?.length - 1
      ],
    [requestedTrip],
  );
  // start location is the first coordinate in the route
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
          center={[riderLocation.latitude, riderLocation.longitude]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/'>CARTO</a>"
          />

          {/* Floating Controls */}
          <div className="map-control absolute top-6 right-6 z-[9999] flex flex-col gap-2">
            <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 flex flex-col gap-1">
              <button
                onClick={() => mapRef.current?.zoomIn()}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
              <div className="h-px bg-slate-100 mx-1" />
              <button
                onClick={() => mapRef.current?.zoomOut()}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20 12H4"
                  />
                </svg>
              </button>
            </div>
          </div>

          <Marker
            key={userID}
            position={[riderLocation.latitude, riderLocation.longitude]}
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
              position={[startLocation.longitude, startLocation.latitude]}
              icon={pickupMarkerIcon as L.DivIcon}
            >
              <Popup>Pickup Location</Popup>
            </Marker>
          )}

          {destination && (
            <Marker
              position={[destination.longitude, destination.latitude]}
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
