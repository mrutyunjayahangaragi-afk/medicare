/**
 * lib/api/client.ts
 * Authenticated fetch helper for the Medicare FastAPI backend.
 *
 * Security rules:
 *   - Tokens are never hardcoded or logged.
 *   - Bearer token is read from the live Supabase session on every request.
 *   - Content-Type is NOT set automatically for multipart/form-data uploads
 *     (pass the header explicitly in that case, or omit it and let the browser set it).
 *   - All server error messages are preserved and surfaced as ApiError instances.
 *   - Expired sessions return null token — requests are sent without Authorization
 *     so the server returns 401 rather than failing silently.
 */

import { createClient } from "@/lib/supabase/client";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

// ── Error type ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Response envelope types ────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface PaginatedData<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  has_next: boolean;
}

export interface HealthCheckResponse {
  status: string;
  app: string;
  version: string;
  environment: string;
}

// ── Core fetch helper ──────────────────────────────────────────────────────

/**
 * apiFetch — authenticated request wrapper for the FastAPI backend.
 *
 * Automatically:
 *   - Attaches the Supabase Bearer token from the current session.
 *   - Sets Accept: application/json on every request.
 *   - Sets Content-Type: application/json unless the caller provides a
 *     body that is not a string/object (e.g. FormData), in which case
 *     the header is omitted to let the browser set it correctly.
 *   - Throws ApiError on non-2xx responses with the server message.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token ?? null;

  // Determine whether to set Content-Type automatically
  const isFormData = options.body instanceof FormData;
  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      // Caller-provided headers override defaults (allows overriding Content-Type)
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    let message = `API error ${response.status}`;
    let data: unknown;
    try {
      const body = (await response.json()) as Partial<ApiResponse>;
      if (body.message) message = body.message;
      data = body.data;
    } catch {
      // Body was not JSON — keep default message
    }
    throw new ApiError(response.status, message, data);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ── Convenience wrappers ───────────────────────────────────────────────────

/** GET /api/v1/health — unauthenticated liveness check */
export async function getBackendHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_URL}/api/v1/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Backend health check failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<HealthCheckResponse>;
}

/** GET /api/v1/auth/me — verify FastAPI authentication is working */
export async function getAuthMe(): Promise<ApiResponse<{
  id: string;
  email: string | null;
  role: string | null;
  full_name: string | null;
  avatar_url: string | null;
}>> {
  return apiFetch("/api/v1/auth/me");
}

/** GET /api/v1/profile — fetch authenticated user's profile */
export async function getMyProfile(): Promise<ApiResponse> {
  return apiFetch("/api/v1/profile");
}

// ── Emergency Requests ─────────────────────────────────────────────────────

/** GET /api/v1/emergency-requests — fetch paginated emergency request history */
export async function getMyEmergencyRequests(
  params?: {
    page?: number;
    page_size?: number;
    status?: string;
    severity?: string;
    emergency_type?: string;
    search?: string;
  }
): Promise<ApiResponse<PaginatedData<unknown>>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.status) qs.set("status", params.status);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.emergency_type) qs.set("emergency_type", params.emergency_type);
  if (params?.search) qs.set("search", params.search);

  const query = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch(`/api/v1/emergency-requests${query}`, { cache: "no-store" } as RequestInit);
}

/** GET /api/v1/emergency-requests/:id */
export async function getEmergencyRequest(id: string): Promise<ApiResponse<unknown>> {
  return apiFetch(`/api/v1/emergency-requests/${id}`, { cache: "no-store" } as RequestInit);
}

/** POST /api/v1/emergency-requests/:id/cancel */
export async function cancelEmergencyRequestApi(id: string): Promise<ApiResponse<unknown>> {
  return apiFetch(`/api/v1/emergency-requests/${id}/cancel`, { method: "POST" });
}

// ── ML Severity Prediction ─────────────────────────────────────────────────

import { SeverityPredictionRequest, SeverityPredictionResponse } from "@/types/database";

/** POST /api/v1/ml/severity/predict */
export async function predictEmergencySeverity(
  payload: SeverityPredictionRequest
): Promise<ApiResponse<SeverityPredictionResponse>> {
  return apiFetch("/api/v1/ml/severity/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /api/v1/ml/severity/model-info */
export async function getSeverityModelInfo(): Promise<ApiResponse<{
  model_version: string;
  status: string;
  supported_labels: string[];
  confidence_threshold: number;
  safety_rules_version: string;
  disclaimer: string;
}>> {
  return apiFetch("/api/v1/ml/severity/model-info", { cache: "no-store" } as RequestInit);
}


// ── Emergency Contacts ─────────────────────────────────────────────────────

/** GET /api/v1/emergency-contacts */
export async function getEmergencyContacts(): Promise<ApiResponse<unknown[]>> {
  return apiFetch("/api/v1/emergency-contacts", { cache: "no-store" } as RequestInit);
}

// ── Recommendations ────────────────────────────────────────────────────────

export interface RecommendationPayload {
  request_id: string;
  severity: string;
  latitude: number;
  longitude: number;
  emergency_type: string;
}

export interface HospitalRec {
  id: string;
  name: string;
  distance_km: number;
  eta_minutes: number;
  address: string | null;
  phone: string | null;
  organization_type: string | null;
  score: number;
}

export interface AmbulanceRec {
  id: string;
  name: string;
  distance_km: number;
  eta_minutes: number;
  phone: string | null;
  availability_status: string | null;
  score: number;
}

export interface ResponderRec {
  id: string;
  name: string;
  distance_km: number;
  eta_minutes: number;
  phone: string | null;
  responder_type: string | null;
  score: number;
}

export interface RecommendationResult {
  priority: string;
  request_id: string;
  hospital: HospitalRec | null;
  ambulance: AmbulanceRec | null;
  responder: ResponderRec | null;
  recommendation_available: boolean;
  disclaimer: string;
}

/** POST /api/v1/recommendations */
export async function getRecommendations(
  payload: RecommendationPayload
): Promise<ApiResponse<RecommendationResult>> {
  return apiFetch("/api/v1/recommendations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Assistant ───────────────────────────────────────────────────────────────

export async function getAssistantConfig(): Promise<{
  enabled: boolean;
  max_input_characters: number;
  conversation_history_enabled: boolean;
  disclaimer: string;
}> {
  return apiFetch("/api/v1/assistant/config");
}

export async function sendAssistantMessage(payload: {
  message: string;
  conversation_id?: string | null;
  request_id?: string | null;
  include_request_context?: boolean;
  language?: string | null;
}): Promise<any> {
  return apiFetch("/api/v1/assistant/chat", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAssistantConversations(): Promise<any[]> {
  return apiFetch("/api/v1/assistant/conversations");
}

export async function getAssistantConversation(conversationId: string): Promise<{
  conversation: any;
  messages: any[];
}> {
  return apiFetch(`/api/v1/assistant/conversations/${conversationId}`);
}

export async function deleteAssistantConversation(conversationId: string): Promise<any> {
  return apiFetch(`/api/v1/assistant/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

// ── Admin Applications ─────────────────────────────────────────────────────

export interface AdminApplication {
  id: string;
  user_id: string;
  application_type: "hospital" | "responder";
  organization_name: string | null;
  phone: string | null;
  address: string | null;
  license_or_registration_number: string | null;
  supporting_document_path: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
}

/** GET /api/v1/admin/applications/{id} */
export async function getAdminApplication(id: string): Promise<AdminApplication> {
  return apiFetch(`/api/v1/admin/applications/${id}`, { cache: "no-store" } as RequestInit);
}

/** POST /api/v1/admin/applications/{id}/approve */
export async function approveAdminApplication(id: string): Promise<AdminApplication> {
  return apiFetch(`/api/v1/admin/applications/${id}/approve`, {
    method: "POST",
  });
}

/** POST /api/v1/admin/applications/{id}/reject */
export async function rejectAdminApplication(id: string, reason: string): Promise<AdminApplication> {
  return apiFetch(`/api/v1/admin/applications/${id}/reject?reason=${encodeURIComponent(reason)}`, {
    method: "POST",
  });
}

// ── Nearby Medical Services ───────────────────────────────────────────────────

export interface NearbyServiceItem {
  id: string;
  name: string;
  type: "hospital" | "pharmacy" | "ambulance";
  latitude: number;
  longitude: number;
  distance_meters: number;
  distance_km: number;
  address: string;
  city: string;
  phone: string | null;
  website: string | null;
  categories: string[];
  source: "geoapify" | "medicare";
}

export interface NearbyServicesResponse {
  success: boolean;
  data: {
    items: NearbyServiceItem[];
    total: number;
    radius_meters: number;
  };
}

export interface NearbyServicesParams {
  latitude: number;
  longitude: number;
  type?: "all" | "hospital" | "pharmacy" | "ambulance";
  radius?: number;
  limit?: number;
}

/** GET /api/v1/nearby — search for nearby medical services */
export async function getNearbyMedicalServices(
  params: NearbyServicesParams
): Promise<NearbyServicesResponse> {
  const qs = new URLSearchParams();
  qs.set("lat", String(params.latitude));
  qs.set("lng", String(params.longitude));
  if (params.type) qs.set("type", params.type);
  if (params.radius) qs.set("radius", String(params.radius));
  if (params.limit) qs.set("limit", String(params.limit));

  const query = qs.toString();
  return apiFetch(`/api/v1/nearby?${query}`, { cache: "no-store" } as RequestInit);
}
