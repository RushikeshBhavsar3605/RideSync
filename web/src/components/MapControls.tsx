"use client";

import React from "react";
import L from "leaflet";

interface MapControlsProps {
  mapRef: React.RefObject<L.Map | null>;
  onRecenter?: () => void;
  isFollowing?: boolean;
}

export function MapControls({ mapRef, onRecenter, isFollowing }: MapControlsProps) {
  return (
    <div className="map-control absolute top-6 right-6 z-[9999] flex flex-col gap-2">
      {onRecenter && (
        <button
          onClick={onRecenter}
          className={`p-3 rounded-2xl shadow-xl border border-slate-100 transition-colors group ${
            isFollowing
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-white text-primary hover:bg-slate-50"
          }`}
          title={isFollowing ? "Following Location" : "Recenter Location"}
        >
          <svg
            className="w-5 h-5 group-active:scale-90 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      )}

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
  );
}
