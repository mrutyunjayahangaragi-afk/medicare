"use client";

/**
 * NearbyMap — SSR-disabled Leaflet map for nearby medical services.
 *
 * Fixes applied:
 *  - ResizeObserver calls invalidateSize() when container dimensions change.
 *  - 100 ms deferred invalidateSize() fires even when no resize event occurs.
 *  - Pans to user location when it first becomes available.
 *  - invalidateSize() after every fitBounds / setView so tiles fully render.
 *  - Rich popups: name, category badge, address, distance, phone, directions.
 *  - Default Leaflet icon paths patched for Next.js bundler.
 */
import { useEffect, useRef, useCallback } from "react";
// leaflet/dist/leaflet.css is imported once in app/layout.tsx
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { NearbyService, UserLocation } from "@/types/nearby";
import { DistanceCalculator } from "@/lib/nearby/DistanceCalculator";

interface NearbyMapProps {
  userLocation: UserLocation | null;
  services: NearbyService[];
  selectedService: NearbyService | null;
  onServiceSelect: (service: NearbyService) => void;
  onLocateMe: () => void;
  className?: string;
}

// ── Marker colours ────────────────────────────────────────────────────────
const MARKER_COLORS: Record<string, { fill: string; ring: string }> = {
  hospital:  { fill: "#2563eb", ring: "rgba(37,99,235,0.25)"  },
  pharmacy:  { fill: "#16a34a", ring: "rgba(22,163,74,0.25)"  },
  ambulance: { fill: "#dc2626", ring: "rgba(220,38,38,0.25)"  },
};

function createServiceIcon(L: typeof import("leaflet"), category: string) {
  const { fill } = MARKER_COLORS[category] ?? { fill: "#64748b", ring: "transparent" };
  return L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${fill};border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.30);"></div>`,
    iconSize:   [30, 30],
    iconAnchor: [15, 15],
    popupAnchor:[0, -18],
  });
}

function createUserIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:#2563eb;border:3px solid #fff;
      box-shadow:0 0 0 5px rgba(37,99,235,0.28);"></div>`,
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
    popupAnchor:[0, -12],
  });
}

// ── Rich popup HTML ───────────────────────────────────────────────────────
function makePopupHtml(service: NearbyService): string {
  const labelMap: Record<string, string> = {
    hospital: "Hospital",
    pharmacy: "Pharmacy",
    ambulance: "Ambulance",
  };
  const colorMap: Record<string, string> = {
    hospital: "#2563eb",
    pharmacy: "#16a34a",
    ambulance: "#dc2626",
  };
  const label = labelMap[service.category] ?? service.category;
  const color = colorMap[service.category] ?? "#64748b";
  const distLabel = DistanceCalculator.format(service.distance);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${service.latitude},${service.longitude}`;

  const phoneRow = service.phone
    ? `<a href="tel:${service.phone}" style="display:block;color:#2563eb;font-size:11px;margin-top:3px;">📞 ${service.phone}</a>`
    : "";

  const addressRow = service.address
    ? `<p style="font-size:11px;color:#475569;margin:2px 0 0;line-height:1.4">${service.address}</p>`
    : "";

  const demoRow = service.is_demo
    ? `<span style="display:inline-block;margin-top:4px;padding:1px 6px;border-radius:9px;
         background:#fef3c7;color:#92400e;font-size:9px;font-weight:700;">Demo data</span>`
    : "";

  return `
    <div style="font-family:system-ui,sans-serif;min-width:180px;max-width:220px">
      <p style="font-weight:700;font-size:13px;margin:0 0 2px;color:#0f172a;line-clamp:2">
        ${service.name}
      </p>
      <span style="display:inline-block;padding:1px 7px;border-radius:99px;
        background:${color}20;color:${color};border:1px solid ${color}40;
        font-size:10px;font-weight:700;">${label}</span>
      <p style="font-size:11px;color:#64748b;margin:4px 0 0">📍 ${distLabel}</p>
      ${addressRow}
      ${phoneRow}
      ${demoRow}
      <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
        style="display:inline-block;margin-top:6px;padding:4px 10px;border-radius:7px;
          background:#2563eb;color:#fff;font-size:11px;font-weight:600;text-decoration:none;">
        Directions ↗
      </a>
    </div>`;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function NearbyMap({
  userLocation,
  services,
  selectedService,
  onServiceSelect,
  onLocateMe,
  className = "",
}: NearbyMapProps) {
  const containerRef      = useRef<HTMLDivElement>(null);
  const mapRef            = useRef<LeafletMap | null>(null);
  const serviceMarkersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const userMarkerRef     = useRef<LeafletMarker | null>(null);
  const roRef             = useRef<ResizeObserver | null>(null);
  const userLocRef        = useRef<UserLocation | null>(userLocation);
  useEffect(() => { userLocRef.current = userLocation; }, [userLocation]);

  // ── Init map (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;

      // Patch broken default icon paths under Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !containerRef.current) return;

      const center: [number, number] = userLocRef.current
        ? [userLocRef.current.latitude, userLocRef.current.longitude]
        : [20, 78]; // India fallback

      const map = L.map(containerRef.current, {
        center,
        zoom: userLocRef.current ? 13 : 5,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // ── Legend ────────────────────────────────────────────────────────
      const legend = new L.Control({ position: "bottomright" });
      legend.onAdd = () => {
        const div = L.DomUtil.create("div");
        div.innerHTML = `
          <div style="background:#fff;padding:8px 12px;border-radius:10px;
            box-shadow:0 2px 8px rgba(0,0,0,.12);font-size:11px;font-weight:600;
            font-family:system-ui,sans-serif;line-height:1.9">
            <div style="color:#1e293b;font-weight:700;margin-bottom:2px">Legend</div>
            <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;
              background:#2563eb;margin-right:5px"></span>Hospital</div>
            <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;
              background:#16a34a;margin-right:5px"></span>Pharmacy</div>
            <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;
              background:#dc2626;margin-right:5px"></span>Ambulance</div>
            <div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;
              background:#2563eb;border:2px solid #fff;
              box-shadow:0 0 0 2px rgba(37,99,235,.35);margin-right:5px"></span>You</div>
          </div>`;
        return div;
      };
      legend.addTo(map);

      mapRef.current = map;

      // ── ResizeObserver keeps Leaflet in sync with CSS layout ──────────
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
        ro.observe(containerRef.current);
        roRef.current = ro;
      }

      // Deferred first invalidate — catches the case where tiles haven't
      // rendered because the container size was 0 at mount time.
      setTimeout(() => mapRef.current?.invalidateSize(), 120);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── User location marker ────────────────────────────────────────────────
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
        ).bindPopup("<b>You are here</b>").addTo(map);

        map.setView([userLocation.latitude, userLocation.longitude], 13, { animate: true });
      }
      map.invalidateSize();
    })();
  }, [userLocation]);

  // ── Service markers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current!;
      const prev = serviceMarkersRef.current;
      const nextIds = new Set(services.map((s) => s.id));

      // Remove stale markers
      for (const [id, marker] of prev) {
        if (!nextIds.has(id)) { marker.remove(); prev.delete(id); }
      }

      // Add new markers
      for (const service of services) {
        if (prev.has(service.id)) continue;
        const icon = createServiceIcon(L, service.category);
        const marker = L.marker([service.latitude, service.longitude], { icon })
          .bindPopup(makePopupHtml(service), { maxWidth: 240 })
          .addTo(map);
        marker.on("click", () => onServiceSelect(service));
        prev.set(service.id, marker);
      }

      // Fit bounds to include user + all service markers
      const allPoints: [number, number][] = [];
      const loc = userLocRef.current;
      if (loc) allPoints.push([loc.latitude, loc.longitude]);
      services.forEach((s) => allPoints.push([s.latitude, s.longitude]));

      if (allPoints.length > 1) {
        map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 15 });
      } else if (allPoints.length === 1) {
        map.setView(allPoints[0], 14);
      }

      map.invalidateSize();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  // ── Pan to selected service ─────────────────────────────────────────────
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

  // ── Locate-me button ────────────────────────────────────────────────────
  const handleLocateMe = useCallback(() => {
    if (!mapRef.current) { onLocateMe(); return; }
    if (userLocRef.current) {
      mapRef.current.setView(
        [userLocRef.current.latitude, userLocRef.current.longitude],
        15,
        { animate: true }
      );
    } else {
      onLocateMe();
    }
  }, [onLocateMe]);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      roRef.current?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`}
      style={{ minHeight: 320 }}
    >
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: 320 }}
        role="application"
        aria-label="Map showing nearby medical services"
      />

      {/* Locate-me button */}
      <button
        type="button"
        onClick={handleLocateMe}
        className="absolute top-3 right-3 z-[1000] bg-white hover:bg-slate-50
          border border-slate-200 rounded-xl p-2.5 shadow-md transition-colors
          focus-visible:outline-2 focus-visible:outline-blue-500"
        aria-label="Centre map on my location"
        title="My location"
      >
        <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M12 2v3m0 14v3M2 12h3m14 0h3" />
        </svg>
      </button>
    </div>
  );
}
