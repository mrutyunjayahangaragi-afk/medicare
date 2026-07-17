"use client";

/**
 * NearbyMap — interactive Leaflet map for nearby medical services.
 * Dynamically imported to avoid SSR issues with Leaflet.
 *
 * Fix log (2026-07-17):
 *   - Added ResizeObserver to call map.invalidateSize() whenever the container
 *     changes dimensions, which fixes the blank-tile bug on initial render when
 *     the parent's CSS height resolves after the map initialises.
 *   - Leaflet CSS imported here (the component is SSR-disabled so no conflict).
 *   - Default icon URL paths patched for Next.js bundler.
 */
import { useEffect, useRef, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { NearbyService, UserLocation } from "@/types/nearby";

interface NearbyMapProps {
  userLocation: UserLocation | null;
  services: NearbyService[];
  selectedService: NearbyService | null;
  onServiceSelect: (service: NearbyService) => void;
  onLocateMe: () => void;
  className?: string;
}

// Marker colours per category
const MARKER_COLORS: Record<string, string> = {
  hospital:  "#2563eb", // blue
  pharmacy:  "#16a34a", // green
  ambulance: "#dc2626", // red
};

function createServiceIcon(L: typeof import("leaflet"), category: string) {
  const color = MARKER_COLORS[category] ?? "#64748b";
  return L.divIcon({
    className: "",
    html: `<div style="
        width:32px;height:32px;border-radius:50%;
        background:${color};border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
      "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function createUserIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    html: `<div style="
        width:20px;height:20px;border-radius:50%;
        background:#2563eb;border:3px solid #fff;
        box-shadow:0 0 0 4px rgba(37,99,235,0.25);
      "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

export default function NearbyMap({
  userLocation,
  services,
  selectedService,
  onServiceSelect,
  onLocateMe,
  className = "",
}: NearbyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const serviceMarkersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Keep a ref of userLocation so the services effect always has the latest value
  const userLocationRef = useRef<UserLocation | null>(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // ── Initialise map once on mount ────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      // Fix default icon paths broken by Next.js bundler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !mapContainerRef.current) return;

      const initialCenter: [number, number] = userLocationRef.current
        ? [userLocationRef.current.latitude, userLocationRef.current.longitude]
        : [20, 78]; // Fallback: India centre

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: userLocationRef.current ? 13 : 5,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Legend
      const legend = new L.Control({ position: "bottomright" });
      legend.onAdd = () => {
        const div = L.DomUtil.create("div");
        div.innerHTML = `
          <div style="background:white;padding:8px 12px;border-radius:12px;
            box-shadow:0 2px 8px rgba(0,0,0,0.12);font-size:11px;font-weight:600;
            font-family:system-ui,sans-serif;line-height:1.8;">
            <div style="color:#374151;margin-bottom:4px;font-weight:700">Legend</div>
            <div><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#2563eb;margin-right:6px;"></span>Hospital</div>
            <div><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#16a34a;margin-right:6px;"></span>Pharmacy</div>
            <div><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#dc2626;margin-right:6px;"></span>Ambulance</div>
            <div><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,0.3);margin-right:6px;"></span>You</div>
          </div>`;
        return div;
      };
      legend.addTo(map);

      mapRef.current = map;

      // ── ResizeObserver: call invalidateSize when container resizes ────
      // This is the key fix for the blank-map bug: when the parent's CSS height
      // resolves (e.g. after hydration or layout shift), Leaflet needs to
      // recalculate tile coverage.
      if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
        const ro = new ResizeObserver(() => {
          mapRef.current?.invalidateSize();
        });
        ro.observe(mapContainerRef.current);
        resizeObserverRef.current = ro;
      }

      // Also call once immediately after mount so tiles render on first load
      // even if no resize event fires.
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update user location marker ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current!;
      const icon = createUserIcon(L);

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
      } else {
        userMarkerRef.current = L.marker(
          [userLocation.latitude, userLocation.longitude],
          { icon, zIndexOffset: 1000 }
        )
          .bindPopup("<b>You are here</b>")
          .addTo(map);

        // Pan to user location when it first becomes available
        map.setView([userLocation.latitude, userLocation.longitude], 13, { animate: true });
      }

      // Invalidate after panning to ensure tiles cover the new view
      map.invalidateSize();
    })();
  }, [userLocation]);

  // ── Update service markers whenever the services list changes ────────────
  useEffect(() => {
    if (!mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current!;
      const prevMarkers = serviceMarkersRef.current;
      const nextIds = new Set(services.map((s) => s.id));

      // Remove markers for services no longer in the list
      for (const [id, marker] of prevMarkers) {
        if (!nextIds.has(id)) {
          marker.remove();
          prevMarkers.delete(id);
        }
      }

      // Add markers for new services
      for (const service of services) {
        if (prevMarkers.has(service.id)) continue;

        const icon = createServiceIcon(L, service.category);
        const label =
          service.category.charAt(0).toUpperCase() + service.category.slice(1);

        const popupContent = `
          <div style="font-family:system-ui,sans-serif;min-width:160px">
            <p style="font-weight:700;font-size:13px;margin:0 0 4px">${service.name}</p>
            <p style="font-size:11px;color:#64748b;margin:0 0 2px">${label}</p>
            ${service.address ? `<p style="font-size:11px;color:#374151;margin:0">${service.address}</p>` : ""}
          </div>`;

        const marker = L.marker([service.latitude, service.longitude], { icon })
          .bindPopup(popupContent)
          .addTo(map);

        marker.on("click", () => onServiceSelect(service));
        prevMarkers.set(service.id, marker);
      }

      // Fit map bounds to show all markers (user + services)
      if (services.length > 0 || userLocationRef.current) {
        const allPoints: [number, number][] = [];
        const loc = userLocationRef.current;
        if (loc) allPoints.push([loc.latitude, loc.longitude]);
        services.forEach((s) => allPoints.push([s.latitude, s.longitude]));

        if (allPoints.length > 1) {
          map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 15 });
        } else if (allPoints.length === 1) {
          map.setView(allPoints[0], 14);
        }

        // Ensure tiles render after bounds change
        map.invalidateSize();
      }
    })();
    // onServiceSelect is stable (wrapped in useCallback in parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  // ── Pan to selected service and open its popup ──────────────────────────
  useEffect(() => {
    if (!selectedService || !mapRef.current) return;

    const marker = serviceMarkersRef.current.get(selectedService.id);
    if (marker) {
      mapRef.current.setView(
        [selectedService.latitude, selectedService.longitude],
        16,
        { animate: true }
      );
      marker.openPopup();
    }
  }, [selectedService]);

  // ── Locate-me handler ───────────────────────────────────────────────────
  const handleLocateMe = useCallback(() => {
    if (!mapRef.current) { onLocateMe(); return; }

    if (userLocationRef.current) {
      mapRef.current.setView(
        [userLocationRef.current.latitude, userLocationRef.current.longitude],
        15,
        { animate: true }
      );
    } else {
      onLocateMe();
    }
  }, [onLocateMe]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}>
      {/* The map container needs an explicit height — Leaflet cannot render
          inside a zero-height container. The parent page provides h-72/h-96/h-full
          via the className prop; the min-h here is a safety net. */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[300px]"
        role="application"
        aria-label="Map showing nearby medical services"
      />

      {/* Locate Me button */}
      <button
        type="button"
        onClick={handleLocateMe}
        className="absolute top-3 right-3 z-[1000] bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-2.5 shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
        aria-label="Centre map on my location"
        title="Centre on my location"
      >
        <svg
          className="w-4 h-4 text-slate-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 2v3m0 14v3M2 12h3m14 0h3"
          />
        </svg>
      </button>
    </div>
  );
}
