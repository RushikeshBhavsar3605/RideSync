"use client";

import { useEffect } from "react";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

export default function MapInit() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        const DefaultIcon = L.default.icon({
          iconUrl: icon.src,
          shadowUrl: iconShadow.src,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        L.default.Marker.prototype.options.icon = DefaultIcon;
      });
    }
  }, []);

  return null;
}
