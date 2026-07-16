import { createClient } from "@/lib/supabase/client";
import type { EmergencyRequest } from "@/types/emergency";
import type { AvailabilityStatus } from "@/types/auth";

/**
 * Fetch available emergency requests (pending and unassigned)
 * Ordered by severity (critical first) then by creation time
 */
export async function fetchAvailableRequests(): Promise<EmergencyRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("status", "pending")
    .is("assigned_responder_id", null)
    .order("severity", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[responder] fetch available requests:", error.code);
    return [];
  }
  return (data ?? []) as EmergencyRequest[];
}

/**
 * Fetch requests assigned to the current responder
 */
export async function fetchAssignedRequests(): Promise<EmergencyRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("emergency_requests")
    .select("*")
    .in("status", ["accepted", "volunteer_assigned", "hospital_assigned"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[responder] fetch assigned requests:", error.code);
    return [];
  }
  return (data ?? []) as EmergencyRequest[];
}

/**
 * Fetch completed requests for the current responder
 */
export async function fetchCompletedRequests(limit: number = 50): Promise<EmergencyRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[responder] fetch completed requests:", error.code);
    return [];
  }
  return (data ?? []) as EmergencyRequest[];
}

/**
 * Fetch requests completed today
 */
export async function fetchCompletedToday(): Promise<EmergencyRequest[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("status", "completed")
    .gte("completed_at", today.toISOString())
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[responder] fetch completed today:", error.code);
    return [];
  }
  return (data ?? []) as EmergencyRequest[];
}

/**
 * Fetch a specific emergency request by ID
 * Only accessible if unassigned/pending or assigned to current responder
 */
export async function fetchResponderRequestById(id: string): Promise<EmergencyRequest | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[responder] fetch request by id:", error.code);
    return null;
  }

  // RLS will handle access control, but we can add additional client-side checks
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const isAccessible = 
    (data.status === "pending" && !data.assigned_responder_id) ||
    data.assigned_responder_id === user.id;

  if (!isAccessible) {
    console.error("[responder] request not accessible to current responder");
    return null;
  }

  return data as EmergencyRequest;
}

/**
 * Accept an emergency request using the secure RPC function
 * This is atomic and prevents race conditions
 */
export async function acceptEmergencyRequest(requestId: string): Promise<{
  success: boolean;
  error: string | null;
  request?: EmergencyRequest;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("accept_emergency_request", {
    request_id: requestId,
  });

  if (error) {
    console.error("[responder] accept request:", error.code);
    return {
      success: false,
      error: error.message || "Failed to accept request. It may have been assigned to another responder.",
    };
  }

  // Update availability to busy
  await updateResponderAvailability("busy");

  return {
    success: true,
    error: null,
    request: data as EmergencyRequest,
  };
}

/**
 * Update emergency request status using the secure RPC function
 * Allowed transitions: accepted → in_progress, in_progress → completed
 */
export async function updateRequestStatus(
  requestId: string,
  nextStatus: "in_progress" | "completed" | "cancelled"
): Promise<{
  success: boolean;
  error: string | null;
  request?: EmergencyRequest;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("update_emergency_request_status", {
    request_id: requestId,
    next_status: nextStatus,
  });

  if (error) {
    console.error("[responder] update request status:", error.code);
    return {
      success: false,
      error: error.message || "Failed to update request status",
    };
  }

  return {
    success: true,
    error: null,
    request: data as EmergencyRequest,
  };
}

/**
 * Update responder availability status
 */
export async function updateResponderAvailability(
  status: AvailabilityStatus
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_responder_availability", {
    new_status: status,
  });

  if (error) {
    console.error("[responder] update availability:", error.code);
    return {
      success: false,
      error: error.message || "Failed to update availability",
    };
  }

  return { success: true, error: null };
}

/**
 * Fetch responder statistics
 */
export async function fetchResponderStats(): Promise<{
  availableRequests: number;
  activeAssignments: number;
  completedToday: number;
  criticalRequests: number;
}> {
  const [available, assigned, completed] = await Promise.all([
    fetchAvailableRequests(),
    fetchAssignedRequests(),
    fetchCompletedToday(),
  ]);

  return {
    availableRequests: available.length,
    activeAssignments: assigned.length,
    completedToday: completed.length,
    criticalRequests: available.filter((r) => r.severity === "critical").length,
  };
}
