import { Coordinate, Driver, Route, RouteFare, Trip, CarPackageSlug } from "./types";

// These are the endpoints the API Gateway must have for the frontend to work correctly
export enum BackendEndpoints {
  PREVIEW_TRIP = "/trip/preview",
  START_TRIP = "/trip/start",
  WS_DRIVERS = "/drivers",
  WS_RIDERS = "/riders",
}

export enum TripEvents {
  NoDriversFound = "trip.event.no_drivers_found",
  DriverAssigned = "trip.event.driver_assigned",
  Completed = "trip.event.completed",
  Cancelled = "trip.event.cancelled",
  Created = "trip.event.created",
  DriverLocation = "driver.cmd.location",
  DriverTripRequest = "driver.cmd.trip_request",
  DriverTripAccept = "driver.cmd.trip_accept",
  DriverTripDecline = "driver.cmd.trip_decline",
  DriverRegister = "driver.cmd.register",
  PaymentSessionCreated = "payment.event.session_created",
}

// Messages sent from the server to the client via the websocket
export type ServerWsMessage =
  | PaymentSessionCreatedRequest
  | DriverAssignedRequest
  | DriverLocationRequest
  | DriverTripRequest
  | DriverRegisterRequest
  | TripCreatedRequest
  | NoDriversFoundRequest;

// Messages sent from the client to the server via the websocket
export type ClientWsMessage = DriverResponseToTripResponse;

interface TripCreatedRequest {
  type: TripEvents.Created;
  data: { trip: BackendTrip } | BackendTrip;
}

interface NoDriversFoundRequest {
  type: TripEvents.NoDriversFound;
}

export interface BackendDriver {
  id?: string;
  ID?: string;
  name?: string;
  Name?: string;
  profile_picture?: string;
  ProfilePicture?: string;
  profilePicture?: string;
  car_plate?: string;
  CarPlate?: string;
  carPlate?: string;
  location?: Coordinate;
  Location?: Coordinate;
  geohash?: string;
  Geohash?: string;
  package_slug?: string;
}

export interface BackendRouteFare {
  id?: string;
  ID?: string;
  package_slug?: CarPackageSlug;
  PackageSlug?: CarPackageSlug;
  packageSlug?: CarPackageSlug;
  base_price?: number;
  BasePrice?: number;
  basePrice?: number;
  total_price_in_cents?: number;
  TotalPriceInCents?: number;
  totalPriceInCents?: number;
  expires_at?: string;
  ExpiresAt?: string;
  expiresAt?: string;
  route?: Route;
  Route?: Route;
}

export interface BackendTrip {
  id?: string;
  ID?: string;
  user_id?: string;
  UserID?: string;
  userID?: string;
  status?: string;
  Status?: string;
  route?: Route;
  Route?: Route;
  selected_fare?: BackendRouteFare;
  SelectedFare?: BackendRouteFare;
  selectedFare?: BackendRouteFare;
  driver?: BackendDriver;
  Driver?: BackendDriver;
  ride_fare?: BackendRouteFare;
  RideFare?: BackendRouteFare;
}

interface DriverRegisterRequest {
  type: TripEvents.DriverRegister;
  data: BackendDriver;
}

interface DriverTripRequest {
  type: TripEvents.DriverTripRequest;
  data: { trip: BackendTrip } | BackendTrip;
}

export interface PaymentEventSessionCreatedData {
  tripID: string;
  sessionID: string;
  amount: number;
  currency: string;
}

interface PaymentSessionCreatedRequest {
  type: TripEvents.PaymentSessionCreated;
  data: PaymentEventSessionCreatedData;
}

interface DriverAssignedRequest {
  type: TripEvents.DriverAssigned;
  data: { trip: BackendTrip } | BackendTrip;
}

interface DriverLocationRequest {
  type: TripEvents.DriverLocation;
  data: Driver[];
}

interface DriverResponseToTripResponse {
  type: TripEvents.DriverTripAccept | TripEvents.DriverTripDecline;
  data: {
    tripID: string;
    riderID: string;
    driver: Driver;
  };
}

export interface HTTPTripPreviewResponse {
  route: Route;
  rideFares: RouteFare[];
}

export interface HTTPTripStartRequestPayload {
  rideFareID: string;
  userID: string;
}

export interface HTTPTripPreviewRequestPayload {
  userID: string;
  pickup: Coordinate;
  destination: Coordinate;
}

export function isValidTripEvent(event: string): event is TripEvents {
  return Object.values(TripEvents).includes(event as TripEvents);
}

export function isValidWsMessage(
  message: ServerWsMessage,
): message is ServerWsMessage {
  return isValidTripEvent(message.type);
}

/**
 * Normalizes backend driver data to camelCase Driver interface.
 */
export function normalizeDriver(data: BackendDriver): Driver {
  return {
    id: data.id || data.ID || "",
    location: data.location || data.Location || { latitude: 0, longitude: 0 },
    geohash: data.geohash || data.Geohash || "",
    name: data.name || data.Name || "",
    profilePicture:
      data.profile_picture || data.ProfilePicture || data.profilePicture || "",
    carPlate: data.car_plate || data.CarPlate || data.carPlate || "",
  };
}

/**
 * Normalizes backend trip data to camelCase Trip interface.
 */
export function normalizeTrip(data: BackendTrip): Trip {
  const rawFare = data.selected_fare || data.SelectedFare || data.selectedFare || 
                  data.ride_fare || data.RideFare;
  
  const normalizedFare: RouteFare = rawFare ? {
    id: rawFare.id || rawFare.ID || "",
    packageSlug: rawFare.package_slug || rawFare.PackageSlug || rawFare.packageSlug || CarPackageSlug.SEDAN,
    basePrice: rawFare.base_price || rawFare.BasePrice || rawFare.basePrice || 0,
    totalPriceInCents: rawFare.total_price_in_cents || rawFare.TotalPriceInCents || rawFare.totalPriceInCents,
    expiresAt: new Date(rawFare.expires_at || rawFare.ExpiresAt || rawFare.expiresAt || Date.now()),
    route: rawFare.route || rawFare.Route || { geometry: [], distance: 0, duration: 0 },
  } : {
    id: "",
    packageSlug: CarPackageSlug.SEDAN,
    basePrice: 0,
    expiresAt: new Date(),
    route: { geometry: [], distance: 0, duration: 0 },
  };

  return {
    id: data.id || data.ID || "",
    userID: data.user_id || data.UserID || data.userID || "",
    status: data.status || data.Status || "",
    route: data.route || data.Route || { geometry: [], distance: 0, duration: 0 },
    selectedFare: normalizedFare,
    driver: data.driver ? normalizeDriver(data.driver) : (data.Driver ? normalizeDriver(data.Driver) : undefined),
  };
}
