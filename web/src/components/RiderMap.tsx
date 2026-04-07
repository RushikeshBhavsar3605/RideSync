"use client";

import Image from "next/image";
import { useRiderStreamConnection } from "../hooks/useRiderStreamConnection";
import {
  MapContainer,
  Marker,
  Popup,
  Rectangle,
  TileLayer,
} from "react-leaflet";
import L from "leaflet";
import { getGeohashBounds } from "../utils/geohash";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapClickHandler } from "./MapClickHandler";
import {
  RouteFare,
  RequestRideProps,
  TripPreview,
  HTTPTripStartResponse,
} from "../types";
import { RoutingControl } from "./RoutingControl";
import { API_URL } from "../constants";
import { RiderTripOverview } from "./RiderTripOverview";
import {
  BackendEndpoints,
  HTTPTripPreviewRequestPayload,
  HTTPTripPreviewResponse,
  HTTPTripStartRequestPayload,
  TripEvents,
} from "../contracts";

const userMarkerIcon =
  typeof window !== "undefined"
    ? L.divIcon({
        className: "user-marker-pulse",
        html: '<div class="user-marker-pulse-inner"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
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

interface RiderMapProps {
  onRouteSelected?: (distance: number) => void;
}

export default function RiderMap({ onRouteSelected }: RiderMapProps) {
  const [trip, setTrip] = useState<TripPreview | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);

  // isRequesting tracks the HTTP call to /trip/start
  const [isRequesting, setIsRequesting] = useState(false);
  // isMatching tracks the entire phase from clicking "Request" until a driver is found/error
  const [isMatching, setIsMatching] = useState(false);

  const mapRef = useRef<L.Map>(null);
  const userID = useMemo(() => crypto.randomUUID(), []);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const location = {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  const {
    drivers,
    error,
    tripStatus,
    assignedDriver,
    paymentSession,
    resetTripStatus,
  } = useRiderStreamConnection(location, userID);

  // Clear matching state when we move to next phases or errors
  useEffect(() => {
    if (
      tripStatus === TripEvents.DriverAssigned ||
      tripStatus === TripEvents.NoDriversFound ||
      tripStatus === TripEvents.PaymentSessionCreated
    ) {
      setIsMatching(false);
      setIsRequesting(false);
    }
  }, [tripStatus]);

  const handleMapClick = async (e: L.LeafletMouseEvent) => {
    // 🚫 Ignore clicks coming from controls
    if ((e.originalEvent.target as HTMLElement).closest(".map-control")) {
      return;
    }

    if (trip?.tripID || isMatching || isRequesting) {
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setDestination([e.latlng.lat, e.latlng.lng]);

      const data = await requestRidePreview({
        pickup: [location.latitude, location.longitude],
        destination: [e.latlng.lat, e.latlng.lng],
      });

      const parsedRoute = data.route.geometry[0].coordinates.map(
        (coord) => [coord.longitude, coord.latitude] as [number, number],
      );

      setTrip({
        tripID: "",
        route: parsedRoute,
        rideFares: data.rideFares,
        distance: data.route.distance,
        duration: data.route.duration,
      });

      onRouteSelected?.(data.route.distance);
    }, 500);
  };

  const requestRidePreview = async (
    props: RequestRideProps,
  ): Promise<HTTPTripPreviewResponse> => {
    const { pickup, destination } = props;
    const payload = {
      userID: userID,
      pickup: {
        latitude: pickup[0],
        longitude: pickup[1],
      },
      destination: {
        latitude: destination[0],
        longitude: destination[1],
      },
    } as HTTPTripPreviewRequestPayload;

    const response = await fetch(`${API_URL}${BackendEndpoints.PREVIEW_TRIP}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const { data } = (await response.json()) as {
      data: HTTPTripPreviewResponse;
    };
    return data;
  };

  const handleStartTrip = async (fare: RouteFare) => {
    setIsRequesting(true);
    setIsMatching(true);
    try {
      const payload = {
        rideFareID: fare.id,
        userID: userID,
      } as HTTPTripStartRequestPayload;

      if (!fare.id) {
        alert("No Fare ID in the payload");
        return;
      }

      const response = await fetch(`${API_URL}${BackendEndpoints.START_TRIP}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      const data = json.data as HTTPTripStartResponse;

      if (response.ok && trip) {
        setTrip(
          (prev) =>
            ({
              ...prev,
              tripID: data.tripID,
            }) as TripPreview,
        );
      } else {
        setIsMatching(false);
      }

      return data;
    } catch (err) {
      console.error("Failed to start trip:", err);
      setIsMatching(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelTrip = () => {
    setTrip(null);
    setDestination(null);
    setIsMatching(false);
    setIsRequesting(false);
    resetTripStatus();
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="relative flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50">
      <div className="relative flex-1 h-full">
        <MapContainer
          center={[location.latitude, location.longitude]}
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
            position={[location.latitude, location.longitude]}
            icon={userMarkerIcon as L.DivIcon}
          />

          {drivers?.map((driver) => (
            <Rectangle
              key={`grid-${driver?.geohash}`}
              bounds={
                getGeohashBounds(driver?.geohash) as L.LatLngBoundsExpression
              }
              pathOptions={{
                color: "rgb(var(--primary))",
                weight: 1,
                fillOpacity: 0.05,
                dashArray: "4, 4",
              }}
            />
          ))}

          {drivers?.map((driver) => (
            <Marker
              key={driver?.id}
              position={[
                driver?.location?.latitude,
                driver?.location?.longitude,
              ]}
              icon={driverMarkerIcon as L.DivIcon}
            >
              <Popup className="custom-popup">
                <div className="p-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Image
                      src={driver?.profilePicture}
                      alt={driver?.name}
                      width={40}
                      height={40}
                      className="rounded-full bg-slate-100"
                    />
                    <div>
                      <p className="font-bold text-slate-900">{driver?.name}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">
                        {driver?.carPlate}
                      </p>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {destination && (
            <Marker
              position={destination}
              icon={destinationMarkerIcon as L.DivIcon}
            />
          )}

          {trip && <RoutingControl route={trip.route} />}
          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>

        {!destination && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-6">
            <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
              <p className="text-sm font-semibold text-slate-900 mb-1 text-center">
                Where are you going?
              </p>
              <p className="text-xs text-slate-500 text-center">
                Tap anywhere on the map to set your destination
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="map-sidebar flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-20">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
          <RiderTripOverview
            trip={trip}
            assignedDriver={assignedDriver}
            status={tripStatus}
            isMatching={isMatching}
            isRequesting={isRequesting}
            paymentSession={paymentSession}
            onPackageSelect={handleStartTrip}
            onCancel={handleCancelTrip}
          />
        </div>
      </div>
    </div>
  );
}
