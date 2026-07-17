"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, Activity, CheckCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AvailabilityToggle from "@/components/responder/AvailabilityToggle";
import ResponderStats from "@/components/responder/ResponderStats";
import AvailableRequestCard from "@/components/responder/AvailableRequestCard";
import AssignedRequestCard from "@/components/responder/AssignedRequestCard";
import ResponderRealtimeSync from "@/components/responder/ResponderRealtimeSync";
import ResponderEmptyState from "@/components/responder/ResponderEmptyState";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";
import type { EmergencyRequest } from "@/types/emergency";
import type { AvailabilityStatus } from "@/types/auth";

export default function ResponderDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ full_name: string | null; availability_status: AvailabilityStatus } | null>(null);
  const [availableRequests, setAvailableRequests] = useState<EmergencyRequest[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<EmergencyRequest[]>([]);
  const [recentlyCompleted, setRecentlyCompleted] = useState<EmergencyRequest[]>([]);
  const [stats, setStats] = useState({
    availableRequests: 0,
    activeAssignments: 0,
    completedToday: 0,
    criticalRequests: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // Load profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, availability_status")
          .eq("id", user.id)
          .single();
        setProfile(profileData);
      }

      // Load available requests (pending, unassigned)
      const { data: availableData } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("status", "pending")
        .is("assigned_responder_id", null)
        .order("severity", { ascending: false })
        .order("created_at", { ascending: true });

      setAvailableRequests(availableData || []);

      // Load active assignments
      const { data: assignedData } = await supabase
        .from("emergency_requests")
        .select("*")
        .in("status", ["accepted", "volunteer_assigned", "hospital_assigned"])
        .order("created_at", { ascending: false });

      setActiveAssignments(assignedData || []);

      // Load recently completed (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: completedData } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("status", "completed")
        .gte("completed_at", today.toISOString())
        .order("completed_at", { ascending: false })
        .limit(5);

      setRecentlyCompleted(completedData || []);

      // Calculate stats
      setStats({
        availableRequests: availableData?.length || 0,
        activeAssignments: assignedData?.length || 0,
        completedToday: completedData?.length || 0,
        criticalRequests: availableData?.filter((r) => r.severity === "critical").length || 0,
      });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAvailabilityChange = (status: AvailabilityStatus) => {
    if (profile) {
      setProfile({ ...profile, availability_status: status });
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setIsAccepting(requestId);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("accept_emergency_request", {
        request_id: requestId,
      });

      if (rpcError) {
        // Log the full error details so we can see the actual DB message
        console.error("Failed to accept request — RPC error:", rpcError.message, rpcError.details, rpcError.hint);
        alert(`Failed to accept request: ${rpcError.message || "It may have been assigned to another responder."}`);
        return;
      }

      // Update availability to busy
      const { error: availError } = await supabase.rpc("update_responder_availability", {
        new_status: "busy",
      });
      if (availError) {
        console.error("Failed to update availability after accepting:", availError.message);
      }

      // Reload dashboard
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Failed to accept request:", msg);
      alert("Failed to accept request. Please try again.");
    } finally {
      setIsAccepting(null);
    }
  };

  const handleViewDetails = (requestId: string) => {
    router.push(`/responder/requests/${requestId}`);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-16 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <ResponderRealtimeSync
        onRequestUpdate={() => loadDashboardData()}
        onRequestRemoved={(id) => {
          setAvailableRequests((prev) => prev.filter((r) => r.id !== id));
          loadDashboardData();
        }}
        onStatsUpdate={() => loadDashboardData()}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Responder Dashboard
              </h1>
              <p className="text-slate-600">
                Welcome, {profile?.full_name || "Responder"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <NotificationBell onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)} />
              <NotificationDropdown
                isOpen={notificationDropdownOpen}
                onClose={() => setNotificationDropdownOpen(false)}
                userRole="responder"
              />
            </div>
            <AvailabilityToggle
              currentStatus={profile?.availability_status || "offline"}
              onStatusChange={handleAvailabilityChange}
            />
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <ResponderStats
          availableRequests={stats.availableRequests}
          activeAssignments={stats.activeAssignments}
          completedToday={stats.completedToday}
          criticalRequests={stats.criticalRequests}
          isLoading={isLoading}
        />

        {/* Safety Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Safety Notice:</p>
              <p className="mt-1">
                Always prioritize your safety when responding to emergencies. Follow proper protocols and use appropriate protective equipment.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Active Assignments */}
        {activeAssignments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-900">Active Assignments</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAssignments.map((request) => (
                <AssignedRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Available Requests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-slate-900">Available Requests</h2>
            </div>
            <button
              onClick={() => router.push("/responder/requests?view=available")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>

          {availableRequests.length === 0 ? (
            <ResponderEmptyState type="available" />
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableRequests.slice(0, 6).map((request) => (
                <AvailableRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                  onAccept={handleAcceptRequest}
                  isAccepting={isAccepting === request.id}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Recently Completed */}
        {recentlyCompleted.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mt-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-slate-900">Recently Completed</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentlyCompleted.map((request) => (
                <AssignedRequestCard
                  key={request.id}
                  request={request}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
