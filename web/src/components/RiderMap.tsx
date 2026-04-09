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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapClickHandler } from "./MapClickHandler";
import {
  RouteFare,
  RequestRideProps,
  TripPreview,
  HTTPTripStartResponse,
  Coordinate,
} from "../types";
import { RoutingControl } from "./RoutingControl";
import { API_URL } from "../constants";
import { RiderTripOverview } from "./RiderTripOverview";
import { Dialog } from "./ui/dialog";
import {
  BackendEndpoints,
  HTTPTripPreviewRequestPayload,
  HTTPTripPreviewResponse,
  HTTPTripStartRequestPayload,
  TripEvents,
} from "../contracts";
import { Button } from "./ui/button";

import { MapControls } from "./MapControls";
import { MapSync } from "./MapSync";
import {
  userMarkerIcon,
  destinationMarkerIcon,
  driverMarkerIcon,
} from "../lib/map-icons";

interface RiderMapProps {
  onRouteSelected?: (distance: number) => void;
}

export default function RiderMap({ onRouteSelected }: RiderMapProps) {
  const [trip, setTrip] = useState<TripPreview | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [showOSRMInfo, setShowOSRMInfo] = useState(true);
  const [location, setLocation] = useState<Coordinate>({
    latitude: 37.7749,
    longitude: -122.4194,
  });

  const [isRequesting, setIsRequesting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);

  const mapRef = useRef<L.Map>(null);
  const userID = useMemo(() => crypto.randomUUID(), []);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(newLocation);
        },
        (error) => {
          console.error("Error watching location:", error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
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
          setLocation(newLocation);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert(
            "Could not get your location. Please check your browser permissions.",
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
  }, []);

  const {
    drivers,
    error,
    tripStatus,
    assignedDriver,
    paymentSession,
    resetTripStatus,
  } = useRiderStreamConnection(location, userID);

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
    if ((e.originalEvent.target as HTMLElement).closest(".map-control")) {
      return;
    }

    setIsFollowing(false);

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

      if (
        !data.route ||
        !data.route.geometry ||
        data.route.geometry.length === 0
      ) {
        console.error("No route found in response:", data);
        alert(
          "No route found between these locations. OSRM might be failing in this region.",
        );
        return;
      }

      const parsedRoute = data.route.geometry[0].coordinates.map(
        (coord) => [coord.latitude, coord.longitude] as [number, number],
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
    if (!trip || !trip.route || trip.route.length === 0) {
      alert("No valid route found. Please select a destination again.");
      return;
    }

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
      const { data } = json as { data: HTTPTripStartResponse };

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
      <Dialog
        isOpen={showOSRMInfo}
        onClose={() => setShowOSRMInfo(false)}
        title="Infrastructure Note"
        description="This platform utilizes the public OSRM demo server for all routing and distance calculations. As this is a shared community resource, 100% uptime is not guaranteed."
      >
        <div className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-sm text-slate-600 leading-relaxed">
              The primary focus of <strong>RideSync</strong> is to demonstrate
              distributed systems engineering and microservices orchestration.
              If the map fails to generate routes, the OSRM API may be
              temporarily unavailable.
            </p>
          </div>
          <Button
            className="w-full py-6 rounded-2xl font-bold"
            onClick={() => setShowOSRMInfo(false)}
          >
            I Understand
          </Button>
        </div>
      </Dialog>

      <div className="relative flex-1 h-full">
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          zoomControl={false}
        >
          <MapSync location={location} isFollowing={isFollowing} />
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
