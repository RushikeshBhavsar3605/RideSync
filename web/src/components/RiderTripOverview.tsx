"use client";

import { RouteFare, TripPreview, Driver } from "../types";
import { DriverList } from "./DriversList";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { convertSecondsToMinutes } from "../utils/math";
import { TripOverviewCard } from "./TripOverviewCard";
import { StripePaymentButton } from "./StripePaymentButton";
import { DriverCard } from "./DriverCard";
import { TripEvents, PaymentEventSessionCreatedData } from "../contracts";

interface TripOverviewProps {
  trip: TripPreview | null;
  status: TripEvents | null;
  isMatching?: boolean;
  isRequesting?: boolean;
  assignedDriver?: Driver | null;
  paymentSession?: PaymentEventSessionCreatedData | null;
  onPackageSelect: (carPackage: RouteFare) => void;
  onCancel: () => void;
}

export const RiderTripOverview = ({
  trip,
  status,
  isMatching,
  isRequesting,
  assignedDriver,
  paymentSession,
  onPackageSelect,
  onCancel,
}: TripOverviewProps) => {
  // 1. Initial State: No trip data yet
  if (!trip) {
    return (
      <TripOverviewCard
        title="Start a trip"
        description="Click on the map to set a destination"
      />
    );
  }

  // 2. High Priority Status: Trip is completed
  if (status === TripEvents.Completed) {
    return (
      <TripOverviewCard
        title="Trip completed!"
        description="Your trip is completed, thank you for using our service!"
      >
        <Button
          variant="outline"
          className="w-full py-6 rounded-2xl"
          onClick={onCancel}
        >
          Go back
        </Button>
      </TripOverviewCard>
    );
  }

  // 3. High Priority Status: Trip is cancelled
  if (status === TripEvents.Cancelled) {
    return (
      <TripOverviewCard
        title="Trip cancelled!"
        description="Your trip is cancelled, please try again later"
      >
        <Button
          variant="outline"
          className="w-full py-6 rounded-2xl"
          onClick={onCancel}
        >
          Go back
        </Button>
      </TripOverviewCard>
    );
  }

  // 4. High Priority Status: Payment Required
  if (status === TripEvents.PaymentSessionCreated && paymentSession) {
    return (
      <TripOverviewCard
        title="Payment Required"
        description="Please complete the payment to confirm your trip"
      >
        <div className="flex flex-col gap-6">
          <DriverCard driver={assignedDriver} paymentSession={paymentSession} />
          <StripePaymentButton paymentSession={paymentSession} />
        </div>
      </TripOverviewCard>
    );
  }

  // 5. Driver Found: Waiting for payment session to be created/ready
  if (status === TripEvents.DriverAssigned) {
    return (
      <TripOverviewCard
        title="Driver Found!"
        description="Great news! A driver has accepted your request. We're just setting up your secure payment session."
      >
        <div className="mt-6">
          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Status
                </p>
                <p className="text-lg font-bold">Driver Assigned</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-white rounded-full animate-pulse" />
              </div>
              <p className="text-xs text-slate-400 font-medium text-center italic">
                Preparing payment checkout...
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full mt-6 py-6 rounded-2xl text-slate-400 hover:text-red-500 transition-colors"
            onClick={onCancel}
          >
            Cancel Trip
          </Button>
        </div>
      </TripOverviewCard>
    );
  }

  // 6. Error State: No drivers found
  if (status === TripEvents.NoDriversFound) {
    return (
      <TripOverviewCard
        title="No drivers found"
        description="No drivers found for your trip, please try again later"
      >
        <Button
          variant="outline"
          className="w-full py-6 rounded-2xl"
          onClick={onCancel}
        >
          Go back
        </Button>
      </TripOverviewCard>
    );
  }

  // 7. Requesting State: User clicked a package, or trip is created and we're matching
  if (isMatching) {
    return (
      <TripOverviewCard
        title="Matching with driver"
        description="Your request has been sent! We're finding the best driver for your route. This usually takes less than a minute."
      >
        <div className="mt-8 flex flex-col items-center justify-center p-10 rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-slate-50/50 animate-in zoom-in duration-500">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl border border-slate-100">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-900">
                {isRequesting
                  ? "Requesting ride..."
                  : "Looking for your ride..."}
              </p>
              {trip?.duration && (
                <p className="text-xs text-slate-500 font-medium">
                  Estimated arrival: {convertSecondsToMinutes(trip?.duration)}
                </p>
              )}
            </div>

            <div className="flex gap-1 justify-center">
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button
            variant="ghost"
            className="w-full py-6 rounded-2xl text-slate-400 hover:text-red-500 transition-colors"
            onClick={onCancel}
          >
            Cancel Request
          </Button>
        </div>
      </TripOverviewCard>
    );
  }

  // 8. Selection State: Destination set, showing ride options
  if (trip.rideFares && trip.rideFares.length > 0) {
    return (
      <DriverList
        trip={trip}
        onPackageSelect={onPackageSelect}
        onCancel={onCancel}
      />
    );
  }

  // 9. Fallback
  return (
    <Card className="p-6 text-center border-slate-100 shadow-xl rounded-3xl">
      <p className="text-slate-500">
        Something went wrong. Please try refreshing the page.
      </p>
      <Button
        variant="outline"
        className="mt-4 w-full py-6 rounded-2xl"
        onClick={() => window.location.reload()}
      >
        Refresh
      </Button>
    </Card>
  );
};
