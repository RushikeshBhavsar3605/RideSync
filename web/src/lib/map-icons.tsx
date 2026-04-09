import L from "leaflet";

export const userMarkerIcon = typeof window !== "undefined"
  ? L.divIcon({
      className: "user-marker-pulse",
      html: '<div class="user-marker-pulse-inner"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
  : null;

export const destinationMarkerIcon = typeof window !== "undefined"
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

export const pickupMarkerIcon = typeof window !== "undefined"
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

export const driverMarkerIcon = typeof window !== "undefined"
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
