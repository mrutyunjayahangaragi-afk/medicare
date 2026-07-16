"use client";

import { useEffect, useRef } from "react";

interface EmergencyMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  className?: string;
}

/**
 * Leaflet map rendered only on the client (dynamic import required).
 * Shows the current location with a red marker and a red radius circle.
 */
export default function EmergencyMap({
  latitude,
  longitude,
  zoom = 16,
  className = "h-48 rounded-xl overflow-hidden",
}: EmergencyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Store map instance to clean up on unmount / coord change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Lazy-load leaflet only on the browser
    let marker: unknown;
    let circle: unknown;

    const init = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapRef.current) {
        // Already initialised — just pan to new coords
        mapRef.current.setView([latitude, longitude], zoom);
        return;
      }

      const map = L.map(containerRef.current!, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
        dragging: false,
      }).setView([latitude, longitude], zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Red marker icon
      const redIcon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;background:#E53935;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(229,57,53,0.6);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      marker = L.marker([latitude, longitude], { icon: redIcon }).addTo(map);
      circle = L.circle([latitude, longitude], {
        radius: 100,
        color: "#E53935",
        fillColor: "#E53935",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      mapRef.current = map;
    };

    init().catch(console.error);

    return () => {
      // Don't destroy on every render — only on component unmount
      // to avoid re-initialising flicker when parent re-renders
      void marker; void circle;
    };
  }, [latitude, longitude, zoom]);

  // Actual cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label="Map showing your current emergency location"
    />
  );
}
