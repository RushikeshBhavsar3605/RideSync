"use client";

import dynamic from "next/dynamic";
import { Button } from "../components/ui/button";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CarPackageSlug } from "../types";
import { DriverPackageSelector } from "../components/DriverPackageSelector";
import MapInit from "../components/MapInit";

// Dynamically import components that use Leaflet
const DriverMap = dynamic(
  () => import("../components/DriverMap").then((mod) => mod.DriverMap),
  { ssr: false },
);
const RiderMap = dynamic(() => import("../components/RiderMap"), {
  ssr: false,
});

function HomeContent() {
  const [userType, setUserType] = useState<"driver" | "rider" | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment");
  const [packageSlug, setPackageSlug] = useState<CarPackageSlug | null>(null);

  if (payment === "success") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <MapInit />
        <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full border border-slate-100 animate-in fade-in zoom-in duration-500">
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Payment Success!
            </h1>
            <p className="text-slate-500 mt-3 text-lg">
              Your ride has been confirmed and your driver is notified.
            </p>
          </div>
          <Button
            className="w-full text-lg py-7 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => router.push("/")}
          >
            Return Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <MapInit />
      {userType === null && (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />

          <div className="relative z-10 w-full max-w-4xl px-6 flex flex-col items-center text-center">
            <div className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 mb-8 animate-in slide-in-from-top duration-700">
              <span className="text-sm font-medium text-primary">
                Now live worldwide
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              RideSync
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              The next generation of distributed urban mobility. Fast, secure,
              and always reliable.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
              <button
                onClick={() => setUserType("rider")}
                className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-slate-100 bg-white hover:border-primary hover:shadow-2xl transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    I Need a Ride
                  </h3>
                  <p className="text-slate-500">Get picked up in minutes</p>
                </div>
              </button>

              <button
                onClick={() => setUserType("driver")}
                className="group relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 border-slate-100 bg-white hover:border-primary hover:shadow-2xl transition-all duration-300"
              >
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">
                    I Want to Drive
                  </h3>
                  <p className="text-slate-500">Earn on your own schedule</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {userType !== null && (
          <button
            onClick={() => {
              setUserType(null);
              setPackageSlug(null);
            }}
            className="absolute top-6 left-6 z-[9999] flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-all font-medium text-sm text-slate-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </button>
        )}

        {userType === "driver" && packageSlug && (
          <DriverMap packageSlug={packageSlug} />
        )}

        {userType === "driver" && !packageSlug && (
          <DriverPackageSelector onSelect={setPackageSlug} />
        )}

        {userType === "rider" && <RiderMap />}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-b from-white to-gray-50">
          <div className="flex flex-col items-center justify-center h-screen gap-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 w-48 bg-gray-100 rounded"></div>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
