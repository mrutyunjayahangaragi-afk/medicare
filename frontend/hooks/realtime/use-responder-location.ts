/**
 * hooks/realtime/use-responder-location.ts
 * Manages sending (GPS watch + Broadcast + DB update) and receiving (Broadcast subscribe) of live location.
 *
 * Rules:
 *   - Use request:{requestId}:location as a private Broadcast channel.
 *   - Validate payloads using Zod (safeValidateLocationPayload).
 *   - Send mode throttles by min interval (8s) and min movement (10m).
 *   - Send mode updates FastAPI database location periodically (every 20s).
 *   - Receive mode considers location stale after 30 seconds.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { RealtimeConnectionState } from "@/lib/realtime/types";
import { requestLocationChannelName } from "@/lib/realtime/channel-names";
import { subscriptionStatusToConnectionState } from "@/lib/realtime/connection-state";
import { safeValidateLocationPayload, validateBrowserCoordinates } from "@/lib/realtime/location-validator";
import { createLocationThrottle } from "@/lib/realtime/location-throttle";
import { updateResponderLocation, fetchResponderLocation } from "@/lib/tracking";
import { realtimeChannelManager } from "@/lib/realtime/realtime-client";

export interface UseResponderLocationOptions {
  requestId: string;
  role: "user" | "responder";
  isSharing?: boolean; // only for responder role
}

export function useResponderLocation({ requestId, role, isSharing = false }: UseResponderLocationOptions) {
  const { toast } = useToast();
  const [location, setLocation] = useState<{ lat: number; lng: number; heading?: number; speed?: number; accuracy?: number } | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("idle");
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const throttleRef = useRef(createLocationThrottle());
  const lastDbUpdateRef = useRef<number>(0);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasDisconnectedRef = useRef(false);

  // Receive mode: Stale location detection (30 seconds)
  const resetStaleTimer = useCallback(() => {
    if (staleTimerRef.current) {
      clearTimeout(staleTimerRef.current);
    }
    setIsStale(false);
    staleTimerRef.current = setTimeout(() => {
      setIsStale(true);
    }, 30000);
  }, []);

  const loadLatestDbLocation = useCallback(async () => {
    try {
      const loc = await fetchResponderLocation(requestId);
      if (loc) {
        setLocation({
          lat: loc.latitude,
          lng: loc.longitude,
          heading: loc.heading ?? undefined,
          speed: loc.speed ?? undefined,
          accuracy: loc.accuracy ?? undefined,
        });
        setLastUpdatedAt(loc.updated_at);
        resetStaleTimer();
      }
    } catch (err) {
      console.error("[useResponderLocation] Failed to load DB location:", err);
    }
  }, [requestId, resetStaleTimer]);

  useEffect(() => {
    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, []);

  // 1. RECEIVE MODE (for User/Patient)
  useEffect(() => {
    if (role !== "user" || !requestId) return;

    // Load initial fallback from DB
    const init = async () => {
      await loadLatestDbLocation();
    };
    init();

    const topic = requestLocationChannelName(requestId);
    const wasDisconnected = wasDisconnectedRef;

    const channel = realtimeChannelManager.getOrCreateChannel(topic, (chan) => {
      chan.on("broadcast", { event: "location_update" }, (payload) => {
        // Validate Broadcast payload using Zod
        const validated = safeValidateLocationPayload(payload.payload);
        if (!validated || validated.requestId !== requestId) return;

        setLocation({
          lat: validated.latitude,
          lng: validated.longitude,
          heading: validated.heading ?? undefined,
          speed: validated.speed ?? undefined,
          accuracy: validated.accuracy ?? undefined,
        });
        setLastUpdatedAt(validated.capturedAt);
        resetStaleTimer();
      });

      chan.subscribe((status) => {
        const nextState = subscriptionStatusToConnectionState(status);
        setConnectionState(nextState);

        if (nextState === "disconnected" || nextState === "error") {
          wasDisconnected.current = true;
        }

        // Recovery: Refetch latest location from DB on reconnect
        if (nextState === "connected" && wasDisconnected.current) {
          loadLatestDbLocation();
          wasDisconnected.current = false;
        }
      });
    });

    return () => {
      realtimeChannelManager.releaseChannel(topic);
    };
  }, [role, requestId, loadLatestDbLocation, resetStaleTimer]);

  // 2. SEND MODE (for Responder)
  useEffect(() => {
    if (role !== "responder" || !requestId || !isSharing) {
      // Cleanup GPS watcher when sharing stops
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const topic = requestLocationChannelName(requestId);
    const channel = realtimeChannelManager.getOrCreateChannel(topic, (chan) => {
      chan.subscribe((status) => {
        setConnectionState(subscriptionStatusToConnectionState(status));
      });
    });

    // Start watching position
    if (!navigator.geolocation) {
      setTimeout(() => setGpsError("Geolocation is not supported by your browser"), 0);
      return;
    }

    throttleRef.current.reset();
    lastDbUpdateRef.current = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords = validateBrowserCoordinates(position.coords);
        if (!coords) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[useResponderLocation] GPS returned invalid coords:", position.coords);
          }
          return;
        }

        const now = Date.now();
        const shouldSendBroadcast = throttleRef.current.shouldSend(
          { latitude: coords.latitude, longitude: coords.longitude },
          lastDbUpdateRef.current === 0 // Force send on start
        );

        if (shouldSendBroadcast) {
          const payload = {
            requestId,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            capturedAt: new Date(position.timestamp).toISOString(),
          };

          // Broadcast to private channel
          channel.send({
            type: "broadcast",
            event: "location_update",
            payload,
          });

          setLocation({
            lat: coords.latitude,
            lng: coords.longitude,
            heading: coords.heading ?? undefined,
            speed: coords.speed ?? undefined,
            accuracy: coords.accuracy,
          });
          setLastUpdatedAt(payload.capturedAt);

          // Periodically save to DB via FastAPI (every 20 seconds)
          if (now - lastDbUpdateRef.current >= 20000) {
            updateResponderLocation(
              requestId,
              coords.latitude,
              coords.longitude,
              coords.heading,
              coords.speed,
              coords.accuracy
            )
              .then(() => {
                lastDbUpdateRef.current = now;
              })
              .catch((err) => {
                console.error("[useResponderLocation] Failed to persist location to FastAPI:", err);
              });
          }
        }
      },
      (err) => {
        console.error("[useResponderLocation] GPS error:", err);
        let msg = "Failed to retrieve your location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied. Please enable GPS.";
        } else if (err.code === err.TIMEOUT) {
          msg = "GPS tracking timed out. Retrying...";
        }
        setGpsError(msg);
        toast(msg, "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      realtimeChannelManager.releaseChannel(topic);
    };
  }, [role, requestId, isSharing, toast]);

  return {
    location,
    lastUpdatedAt,
    isStale,
    gpsError,
    connectionState,
  };
}
