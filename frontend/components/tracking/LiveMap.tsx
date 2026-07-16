"use client";

import { useEffect, useRef, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

interface LiveMapProps {
  userLocation: { lat: number; lng: number } | null;
  responderLocation: { lat: number; lng: number; heading?: number } | null;
  route: { lat: number; lng: number }[] | null;
  followResponder?: boolean;
  onRecenter?: () => void;
  className?: string;
}

export default function LiveMap({
  userLocation,
  responderLocation,
  route,
  followResponder = false,
  onRecenter,
  className = "",
}: LiveMapProps) {
  const mapRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: userLocation?.lng || 0,
    latitude: userLocation?.lat || 0,
    zoom: 13,
  });

  const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

  useEffect(() => {
    if (followResponder && responderLocation) {
      setViewState((prev) => ({
        ...prev,
        longitude: responderLocation.lng,
        latitude: responderLocation.lat,
      }));
    }
  }, [followResponder, responderLocation]);

  useEffect(() => {
    if (!followResponder && userLocation && !responderLocation) {
      setViewState({
        longitude: userLocation.lng,
        latitude: userLocation.lat,
        zoom: 13,
      });
    }
  }, [followResponder, userLocation, responderLocation]);

  const fitBounds = () => {
    if (!mapRef.current) return;

    const bounds = [];
    if (userLocation) bounds.push([userLocation.lng, userLocation.lat]);
    if (responderLocation) bounds.push([responderLocation.lng, responderLocation.lat]);

    if (bounds.length >= 2) {
      mapRef.current.fitBounds(bounds as any, {
        padding: 50,
        maxZoom: 16,
      });
    } else if (bounds.length === 1) {
      mapRef.current.flyTo({
        center: bounds[0] as any,
        zoom: 14,
        duration: 1000,
      });
    }
  };

  useEffect(() => {
    fitBounds();
  }, [userLocation, responderLocation]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`bg-slate-200 rounded-2xl flex items-center justify-center ${className}`}>
        <p className="text-slate-600">Mapbox token not configured</p>
      </div>
    );
  }

  const routeGeoJSON = route && route.length > 0 ? {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: route.map((point) => [point.lng, point.lat]),
    },
  } : null;

  return (
    <div className={`relative ${className}`}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
      >
        {/* User Marker */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div className="w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
          </Marker>
        )}

        {/* Responder Marker */}
        {responderLocation && (
          <Marker
            longitude={responderLocation.lng}
            latitude={responderLocation.lat}
            anchor="center"
            rotation={responderLocation.heading || 0}
          >
            <div className="w-10 h-10 bg-amber-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
            </div>
          </Marker>
        )}

        {/* Route Polyline */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 4,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}
      </Map>

      {/* Recenter Button */}
      {onRecenter && (
        <button
          onClick={() => {
            fitBounds();
            onRecenter();
          }}
          className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors"
          aria-label="Recenter map"
        >
          <svg
            className="w-5 h-5 text-slate-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
