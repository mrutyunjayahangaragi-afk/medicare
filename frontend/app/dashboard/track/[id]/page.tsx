"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LiveMap from "@/components/tracking/LiveMap";
import TrackingCard from "@/components/tracking/TrackingCard";
import ETAWidget from "@/components/tracking/ETAWidget";
import StatusTimeline from "@/components/tracking/StatusTimeline";
import RecommendationPanel from "@/components/recommendation/RecommendationPanel";
import { fetchResponderLocation, subscribeToResponderLocation, calculateDistance, calculateETA, formatDistance, calculateRoute } from "@/lib/tracking";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS } from "@/types/emergency";

export default function UserTrackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [responderLocation, setResponderLocation] = useState<{ lat: number; lng: number; heading?: number; speed?: number } | null>(null);
  const [responderProfile, setResponderProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eta, setEta] = useState("--");
  const [distance, setDistance] = useState("--");
  const [route, setRoute] = useState<{ lat: number; lng: number }[] | null>(null);

  const loadRequest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;

      // Check if user owns this request
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || data.user_id !== user.id) {
        setError("You don't have permission to view this request");
        return;
      }

      setRequest(data);

      // Load responder location if assigned
      if (data.assigned_responder_id) {
        const locationData = await fetchResponderLocation(params.id);
        if (locationData) {
          setResponderLocation({
            lat: locationData.latitude,
            lng: locationData.longitude,
            heading: locationData.heading || undefined,
            speed: locationData.speed || undefined,
          });

          // Calculate distance and ETA
          if (data.latitude && data.longitude) {
            const dist = calculateDistance(
              locationData.latitude,
              locationData.longitude,
              data.latitude,
              data.longitude
            );
            setDistance(formatDistance(dist));
            setEta(calculateETA(dist, locationData.speed || 40));

            // Calculate route
            const routePoints = calculateRoute(
              locationData.latitude,
              locationData.longitude,
              data.latitude,
              data.longitude
            );
            setRoute(routePoints);
          }
        }

        // Load responder profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.assigned_responder_id)
          .single();
        setResponderProfile(profileData);
      }
    } catch (err) {
      console.error("Failed to load request:", err);
      setError("Failed to load request details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, [params.id]);

  useEffect(() => {
    if (!request || !request.assigned_responder_id) return;

    const channel = subscribeToResponderLocation(params.id, (location) => {
      setResponderLocation({
        lat: location.latitude,
        lng: location.longitude,
        heading: location.heading || undefined,
        speed: location.speed || undefined,
      });

      // Recalculate distance and ETA
      if (request.latitude && request.longitude) {
        const dist = calculateDistance(
          location.latitude,
          location.longitude,
          request.latitude,
          request.longitude
        );
        setDistance(formatDistance(dist));
        setEta(calculateETA(dist, location.speed || 40));

        // Update route
        const routePoints = calculateRoute(
          location.latitude,
          location.longitude,
          request.latitude,
          request.longitude
        );
        setRoute(routePoints);
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [request, params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-96 bg-slate-200 rounded-xl" />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-48 bg-slate-200 rounded-xl" />
              <div className="h-48 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {error || "Request Not Found"}
            </h2>
            <p className="text-slate-500 text-center max-w-md mb-8">
              The emergency request you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <button
              onClick={() => router.push("/dashboard/requests")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              Back to Requests
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const severity = SEVERITY_LEVELS.find((s) => s.id === request.severity);
  const userLocation = request.latitude && request.longitude ? { lat: request.latitude, lng: request.longitude } : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => router.push("/dashboard/requests")}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Go back to requests"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Live Tracking</h1>
            <p className="text-slate-600">
              {emergencyType?.label} - {severity?.label} Severity
            </p>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* Recommendations above map */}
            <RecommendationPanel
              requestId={request.id}
              severity={request.severity}
              latitude={request.latitude}
              longitude={request.longitude}
              emergencyType={request.emergency_type}
            />

            <div className="h-[500px] lg:h-[500px] rounded-2xl overflow-hidden shadow-sm">
              <LiveMap
                userLocation={userLocation}
                responderLocation={responderLocation}
                route={route}
                className="w-full h-full"
              />
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="space-y-6"
          >
            {/* ETA Widget */}
            {responderLocation && userLocation && (
              <ETAWidget
                eta={eta}
                distance={distance}
                speed={responderLocation.speed}
                isMoving={request.status === "volunteer_assigned" || request.status === "hospital_assigned"}
              />
            )}

            {/* Responder Card */}
            {responderProfile && (
              <TrackingCard
                type="responder"
                name={responderProfile.full_name || "Responder"}
                role={responderProfile.responder_type || "Responder"}
                phone={request.contact_number}
                status={request.status === "completed" ? "Completed" : request.status === "cancelled" ? "Cancelled" : "Active"}
                eta={eta}
                distance={distance}
                vehicle={responderProfile.responder_type}
              />
            )}

            {/* Emergency Contact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-white border border-slate-200 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Emergency Contact</h3>
              <a
                href={`tel:${request.contact_number}`}
                className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Call Responder</p>
                  <p className="text-sm text-slate-600">{request.contact_number}</p>
                </div>
              </a>
            </motion.div>

            {/* Status Timeline */}
            <StatusTimeline
              currentStatus={request.status}
              timestamps={{
                accepted_at: request.accepted_at,
                in_progress_at: request.in_progress_at,
                completed_at: request.completed_at,
              }}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
