"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { Coordinate } from "../types";

interface MapSyncProps {
  location: Coordinate;
  isFollowing: boolean;
  zoom?: number;
}

export function MapSync({ location, isFollowing, zoom = 13 }: MapSyncProps) {
  const map = useMap();

  useEffect(() => {
    if (location && isFollowing) {
      map.setView([location.latitude, location.longitude], zoom);
    }
  }, [location, map, isFollowing, zoom]);

  return null;
}
