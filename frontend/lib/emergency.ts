import { createClient } from "@/lib/supabase/client";
import type { EmergencyRequest } from "@/types/emergency";
import type { EmergencyType, SeverityLevel } from "@/types/database";

/** Reverse-geocode lat/lng → human-readable address via Nominatim (OSM). */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en", "User-Agent": "Medicare-App/1.0" } }
    );
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/**
 * Upload evidence to the private `emergency-evidence` bucket.
 * Path: {userId}/{requestId}/{timestamp}-{safeName}
 * Returns the storage path (NOT a public URL).
 */
export async function uploadEvidence(
  userId: string,
  requestId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  const supabase = createClient();

  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg":  "jpg",
    "image/png":  "png",
    "image/webp": "webp",
  };
  const ext = mimeToExt[file.type];
  if (!ext) return { path: null, error: "Only JPEG, PNG, and WebP images are allowed." };
  if (file.size > 5 * 1024 * 1024) return { path: null, error: "Image must be under 5 MB." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const storagePath = `${userId}/${requestId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("emergency-evidence")
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[emergency] evidence upload:", uploadError.message);
    return { path: null, error: "Evidence upload failed. Please try again." };
  }

  return { path: storagePath, error: null };
}

/** Remove a previously uploaded evidence file (cleanup on insert failure). */
export async function removeEvidence(storagePath: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.storage.from("emergency-evidence").remove([storagePath]);
  } catch {
    // Non-fatal — log only
    console.error("[emergency] evidence cleanup failed for", storagePath);
  }
}

export interface CreateEmergencyParams {
  requestId: string;
  userId: string;
  emergency_type: EmergencyType;
  severity: SeverityLevel;
  description: string;
  contact_number: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  manual_address: string | null;
  evidence_path: string | null;
}

/**
 * Insert one emergency request row.
 * The caller must generate requestId with crypto.randomUUID() BEFORE uploading evidence.
 */
export async function createEmergencyRequest(
  params: CreateEmergencyParams
): Promise<{ data: EmergencyRequest | null; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("emergency_requests")
    .insert({
      id:                params.requestId,
      user_id:           params.userId,
      emergency_type:    params.emergency_type,
      severity:          params.severity,
      description:       params.description,
      contact_number:    params.contact_number,
      latitude:          params.latitude,
      longitude:         params.longitude,
      location_accuracy: params.location_accuracy,
      manual_address:    params.manual_address,
      evidence_path:     params.evidence_path,
      status:            "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("[emergency] insert:", error.code);
    return { data: null, error: "Failed to submit emergency request. Please try again." };
  }

  return { data: data as EmergencyRequest, error: null };
}

/** Fetch current user's requests ordered by newest first.
 *
 * Throws on error so callers can show a proper error state.
 * Never returns a stale empty array when the real cause is a fetch failure.
 */
export async function fetchMyEmergencyRequests(): Promise<EmergencyRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("emergency_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Rethrow so RequestsPage.loadRequests() catch block sets fetchError
    console.error("[emergency] fetch list error code:", error.code);
    throw new Error(error.message || "Failed to fetch emergency requests");
  }
  return (data ?? []) as EmergencyRequest[];
}

/** Fetch one request by ID (RLS ensures only the owner can read it). */
export async function fetchEmergencyById(id: string): Promise<EmergencyRequest | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("emergency_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[emergency] fetch by id:", error.code);
    return null;
  }
  return data as EmergencyRequest;
}

/**
 * Cancel a pending emergency request using the secure RPC.
 * Direct status UPDATE is blocked by RLS — must use the RPC.
 */
export async function cancelEmergencyRequest(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("cancel_emergency_request", {
    p_request_id: id,
  });

  if (error) {
    console.error("[emergency] cancel rpc error:", error.message);
    return { success: false, error: "Failed to cancel request. It may no longer be pending." };
  }

  // RPC returns { success: boolean, request_id: string }
  const result = data as { success?: boolean } | null;
  if (!result?.success) {
    return { success: false, error: "Unable to cancel this request." };
  }

  return { success: true, error: null };
}
