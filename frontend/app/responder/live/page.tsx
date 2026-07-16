"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Navigation, MapPin, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LiveMap from "@/components/tracking/LiveMap";
import TrackingCard from "@/components/tracking/TrackingCard";
import ETAWidget from "@/components/tracking/ETAWidget";
import StatusTimeline from "@/components/tracking/StatusTimeline";
import LocationUpdater from "@/components/tracking/LocationUpdater";
import { fetchResponderLocation, subscribeToResponderLocation, calculateDistance, calculateETA, formatDistance, calculateRoute } from "@/lib/tracking";
import type { EmergencyRequest } from "@/types/emergency";
import { EMERGENCY_TYPES, SEVERITY_LEVELS } from "@/types/emergency";

export default function ResponderLivePage() {
  const router = useRouter();
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; heading?: number; speed?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [eta, setEta] = useState("--");
  const [distance, setDistance] = useState("--");
  const [route, setRoute] = useState<{ lat: number; lng: number }[] | null>(null);

  const loadActiveAssignment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      
      // Fetch current responder's active assignment
      const { data: assignments, error } = await supabase
        .from("emergency_requests")
        .select("*")
        .in("status", ["accepted", "volunteer_assigned", "hospital_assigned"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        setError("No active assignment found");
        return;
      }

      const activeRequest = assignments[0];
      setRequest(activeRequest);

      // Load user profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", activeRequest.user_id)
        .single();
      setUserProfile(profileData);

      // Load current location
      const locationData = await fetchResponderLocation(activeRequest.id);
      if (locationData) {
        setCurrentLocation({
          lat: locationData.latitude,
          lng: locationData.longitude,
          heading: locationData.heading || undefined,
          speed: locationData.speed || undefined,
        });

        // Calculate distance and ETA
        if (activeRequest.latitude && activeRequest.longitude) {
          const dist = calculateDistance(
            locationData.latitude,
            locationData.longitude,
            activeRequest.latitude,
            activeRequest.longitude
          );
          setDistance(formatDistance(dist));
          setEta(calculateETA(dist, locationData.speed || 40));

          // Calculate route
          const routePoints = calculateRoute(
            locationData.latitude,
            locationData.longitude,
            activeRequest.latitude,
            activeRequest.longitude
          );
          setRoute(routePoints);
        }
      }
    } catch (err) {
      console.error("Failed to load assignment:", err);
      setError("Failed to load active assignment");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveAssignment();
  }, []);

  const handleLocationUpdate = (location: { lat: number; lng: number; heading?: number; speed?: number }) => {
    setCurrentLocation(location);

    if (request && request.latitude && request.longitude) {
      const dist = calculateDistance(
        location.lat,
        location.lng,
        request.latitude,
        request.longitude
      );
      setDistance(formatDistance(dist));
      setEta(calculateETA(dist, location.speed || 40));

      const routePoints = calculateRoute(
        location.lat,
        location.lng,
        request.latitude,
        request.longitude
      );
      setRoute(routePoints);
    }
  };

  const handleStartNavigation = async () => {
    setIsTracking(true);
    try {
      const supabase = createClient();
      await supabase.rpc("update_emergency_request_status", {
        request_id: request!.id,
        next_status: "in_progress",
      });
      await loadActiveAssignment();
    } catch (error) {
      console.error("Failed to start navigation:", error);
      alert("Failed to start navigation. Please try again.");
      setIsTracking(false);
    }
  };

  const handleArrived = async () => {
    try {
      const supabase = createClient();
      await supabase.rpc("update_emergency_request_status", {
        request_id: request!.id,
        next_status: "completed",
      });
      await loadActiveAssignment();
      setIsTracking(false);
    } catch (error) {
      console.error("Failed to mark as arrived:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleComplete = async () => {
    try {
      const supabase = createClient();
      await supabase.rpc("update_emergency_request_status", {
        request_id: request!.id,
        next_status: "completed",
      });
      router.push("/responder/requests");
    } catch (error) {
      console.error("Failed to complete request:", error);
      alert("Failed to complete request. Please try again.");
    }
  };

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
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {error || "No Active Assignment"}
            </h2>
            <p className="text-slate-500 text-center max-w-md mb-8">
              {error || "You don't have any active emergency assignments. Check the dashboard for available requests."}
            </p>
            <button
              onClick={() => router.push("/responder")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              Back to Dashboard
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === request.emergency_type);
  const severity = SEVERITY_LEVELS.find((s) => s.id === request.severity);
  const destinationLocation = request.latitude && request.longitude ? { lat: request.latitude, lng: request.longitude } : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <LocationUpdater
        requestId={request.id}
        isActive={isTracking}
        onLocationUpdate={handleLocationUpdate}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/responder")}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Live Navigation</h1>
              <p className="text-slate-600">
                {emergencyType?.label} - {severity?.label} Severity
              </p>
            </div>
          </div>
          {isTracking && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Tracking Active</span>
            </div>
          )}
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-sm">
              <LiveMap
                userLocation={destinationLocation}
                responderLocation={currentLocation}
                route={route}
                followResponder={isTracking}
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
            {currentLocation && destinationLocation && (
              <ETAWidget
                eta={eta}
                distance={distance}
                speed={currentLocation.speed}
                isMoving={isTracking}
              />
            )}

            {/* Patient Card */}
            {userProfile && (
              <TrackingCard
                type="user"
                name={userProfile.full_name || "Patient"}
                phone={request.contact_number}
                status={request.status === "completed" ? "Completed" : "Active"}
                emergencyType={emergencyType?.label}
                severity={severity?.label}
                destination={request.manual_address || `${request.latitude?.toFixed(4)}, ${request.longitude?.toFixed(4)}`}
                eta={eta}
                distance={distance}
              />
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-white border border-slate-200 rounded-2xl p-6"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {!isTracking && request.status === "accepted" && (
                  <button
                    onClick={handleStartNavigation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    <Navigation className="w-5 h-5" />
                    Start Navigation
                  </button>
                )}
                {isTracking && (
                  <>
                    <button
                      onClick={handleArrived}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      <MapPin className="w-5 h-5" />
                      Arrived at Location
                    </button>
                    <button
                      onClick={handleComplete}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Complete Request
                    </button>
                  </>
                )}
                <a
                  href={`tel:${request.contact_number}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Call Patient
                </a>
              </div>
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
