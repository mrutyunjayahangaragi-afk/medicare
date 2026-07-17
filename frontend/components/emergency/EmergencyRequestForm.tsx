"use client";

import { useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Siren, Loader2, AlertCircle, Phone, ChevronDown, ChevronUp } from "lucide-react";
import dynamic from "next/dynamic";
import EmergencyTypeSelector from "./EmergencyTypeSelector";
import SeveritySelector from "./SeveritySelector";
import LocationCapture from "./LocationCapture";
import EvidenceUpload from "./EvidenceUpload";
import PredictSeverityButton from "./PredictSeverityButton";
import SeverityPredictionCard from "./SeverityPredictionCard";
import { createEmergencyRequest, removeEvidence } from "@/lib/emergency";
import { predictEmergencySeverity } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import type { EmergencyFormValues, LocationState } from "@/types/emergency";
import type { EmergencyType, SeverityLevel, SeverityPredictionResponse } from "@/types/database";

const EmergencyMap = dynamic(() => import("./EmergencyMap"), { ssr: false });

/* ── Zod schema ─────────────────────────────────────────────────────────── */
const schema = z.object({
  emergency_type: z.string().min(1, "Select an emergency type"),
  severity:       z.string().min(1, "Select a severity level"),
  description:    z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must not exceed 500 characters"),
  contact_number: z.string().min(1, "Contact number is required").trim(),
  confirmed:      z.boolean().refine((v) => v, {
    message: "Please confirm this is a genuine emergency",
  }),
});

type FormSchema = z.infer<typeof schema>;

interface EmergencyRequestFormProps {
  userId: string;
  initialPhone?: string;
  onValuesChange?: (v: EmergencyFormValues) => void;
}

const defaultLocationState: LocationState = { status: "idle" };

/* ── Risk indicator type ─────────────────────────────────────────────────── */
interface RiskIndicators {
  conscious: boolean | null;
  breathing_difficulty: boolean | null;
  severe_breathing_difficulty: boolean | null;
  bleeding_level: "none" | "minor" | "moderate" | "severe" | null;
  chest_pain: boolean | null;
  seizure: boolean | null;
  stroke_signs: boolean | null;
  burn_level: "none" | "minor" | "moderate" | "severe" | null;
  allergic_reaction: boolean | null;
  pregnancy_emergency: boolean | null;
  major_accident: boolean | null;
  violence_risk: boolean | null;
}

const defaultIndicators: RiskIndicators = {
  conscious: null,
  breathing_difficulty: null,
  severe_breathing_difficulty: null,
  bleeding_level: null,
  chest_pain: null,
  seizure: null,
  stroke_signs: null,
  burn_level: null,
  allergic_reaction: null,
  pregnancy_emergency: null,
  major_accident: null,
  violence_risk: null,
};

export default function EmergencyRequestForm({
  userId,
  initialPhone = "",
  onValuesChange,
}: EmergencyRequestFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const shouldReduceMotion = useReducedMotion();

  const [emergencyType, setEmergencyType] = useState<EmergencyType | null>(null);
  const [severity, setSeverity]           = useState<SeverityLevel | null>(null);
  const [locationState, setLocationState] = useState<LocationState>(defaultLocationState);
  const [manualAddress, setManualAddress] = useState("");
  const [evidencePath, setEvidencePath]   = useState<string | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [submitting, setSubmitting]       = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [typeError, setTypeError]         = useState("");
  const [sevError, setSevError]           = useState("");
  const [locError, setLocError]           = useState("");

  // ML prediction state
  const [isPredicting, setIsPredicting]       = useState(false);
  const [prediction, setPrediction]           = useState<SeverityPredictionResponse | null>(null);
  const [showIndicators, setShowIndicators]   = useState(false);
  const [indicators, setIndicators]           = useState<RiskIndicators>(defaultIndicators);
  const predictionCardRef                     = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: { contact_number: initialPhone, confirmed: false },
  });

  const descValue     = watch("description") ?? "";
  const descRemaining = 500 - descValue.length;

  const notifyParent = useCallback(
    (overrides: Partial<EmergencyFormValues> = {}) => {
      onValuesChange?.({
        emergency_type: emergencyType,
        severity,
        description: descValue,
        contact_number: watch("contact_number") ?? "",
        location: locationState,
        manual_address: manualAddress,
        evidence_path: evidencePath,
        confirmed: watch("confirmed") ?? false,
        ...overrides,
      });
    },
    [emergencyType, severity, descValue, locationState, manualAddress, evidencePath, onValuesChange, watch],
  );

  const handleTypeChange = (t: EmergencyType) => { setEmergencyType(t); setTypeError(""); notifyParent({ emergency_type: t }); };
  const handleSeverityChange = (s: SeverityLevel) => { setSeverity(s); setSevError(""); setPrediction(null); notifyParent({ severity: s }); };
  const handleLocationChange = (s: LocationState) => { setLocationState(s); setLocError(""); notifyParent({ location: s }); };
  const handleEvidenceChange = (path: string | null, preview: string | null) => {
    setEvidencePath(path); setEvidencePreview(preview); notifyParent({ evidence_path: path });
  };

  /* ── ML prediction ─────────────────────────────────────────────────────── */
  const canPredict = !!emergencyType && descValue.trim().length >= 10;

  const handlePredict = async () => {
    if (!canPredict || isPredicting) return;
    setIsPredicting(true);
    setPrediction(null);
    try {
      const response = await predictEmergencySeverity({
        emergency_type: emergencyType!,
        description: descValue.trim(),
        age_group: "unknown",
        conscious: indicators.conscious ?? undefined,
        breathing_difficulty: indicators.breathing_difficulty ?? undefined,
        severe_breathing_difficulty: indicators.severe_breathing_difficulty ?? undefined,
        bleeding_level: indicators.bleeding_level ?? undefined,
        chest_pain: indicators.chest_pain ?? undefined,
        seizure: indicators.seizure ?? undefined,
        stroke_signs: indicators.stroke_signs ?? undefined,
        burn_level: indicators.burn_level ?? undefined,
        allergic_reaction: indicators.allergic_reaction ?? undefined,
        pregnancy_emergency: indicators.pregnancy_emergency ?? undefined,
        major_accident: indicators.major_accident ?? undefined,
        violence_risk: indicators.violence_risk ?? undefined,
      });
      if (response.success && response.data) {
        setPrediction(response.data as SeverityPredictionResponse);
        // Scroll prediction card into view
        setTimeout(() => predictionCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
      }
    } catch {
      // ML unavailable — silently ignore, never block form
    } finally {
      setIsPredicting(false);
    }
  };

  const handleAcceptPrediction = (sev: SeverityLevel) => {
    setSeverity(sev);
    setSevError("");
    setPrediction(null);
    notifyParent({ severity: sev });
  };

  /* ── Validation ─────────────────────────────────────────────────────────── */
  const validateExtra = (): boolean => {
    let ok = true;
    if (!emergencyType) { setTypeError("Select an emergency type."); ok = false; }
    if (!severity) { setSevError("Select a severity level."); ok = false; }
    const hasCoords = locationState.status === "captured";
    const hasManual = manualAddress.trim().length > 0;
    if (!hasCoords && !hasManual) { setLocError("Detect your location or enter a manual address."); ok = false; }
    return ok;
  };

  const onValid = async (formData: FormSchema) => {
    if (!validateExtra()) return;
    setSubmitError(null);   // clear any previous submission error
    setShowConfirm(true);
    (window as { _emergencyFormData?: FormSchema })._emergencyFormData = formData;
  };

  const handleConfirm = async () => {
    const formData = (window as { _emergencyFormData?: FormSchema })._emergencyFormData;
    if (!formData || !emergencyType || !severity) return;
    if (submitting) return; // double-click guard

    setSubmitting(true);
    setShowConfirm(false);
    setSubmitError(null);

    // Guard: evidence still uploading
    if (evidencePreview?.startsWith("blob:") && !evidencePath) {
      toast("Evidence upload is still in progress. Please wait.", "warning");
      setSubmitting(false);
      return;
    }

    // Use preGeneratedId as the request ID — this is the same UUID used as
    // the evidence upload folder, so the storage path and DB row stay consistent.
    const coords = locationState.status === "captured" ? locationState : null;
    const { data, error } = await createEmergencyRequest({
      requestId: preGeneratedId,
      userId,
      emergency_type: emergencyType,
      severity,
      description: formData.description.trim(),
      contact_number: formData.contact_number.trim(),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      location_accuracy: coords?.accuracy ?? null,
      manual_address: manualAddress.trim() || null,
      evidence_path: evidencePath,
    });

    if (error || !data) {
      const msg = error ?? "Submission failed. Please try again.";
      setSubmitError(msg);
      toast(msg, "error");
      // Clean up evidence if upload happened but insert failed
      if (evidencePath) await removeEvidence(evidencePath);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    toast("Emergency Request Submitted Successfully!", "success");

    // Stop any SOS alarm that may still be playing from the TopNavbar
    try {
      const { stopSOSAlarm } = await import("@/lib/audio/sos-alarm");
      stopSOSAlarm();
    } catch { /* non-fatal */ }

    // Trigger SMS to primary emergency contact (fire-and-forget — never blocks SOS)
    const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
    try {
      const { createClient: createSupabaseClient } = await import("@/lib/supabase/client");
      const supabase2 = createSupabaseClient();
      const { data: { session } } = await supabase2.auth.getSession();
      const token = session?.access_token;
      if (token && data?.id) {
        fetch(`${API_URL}/api/v1/twilio/notify/${data.id}?send_sms=true&place_call=false`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {}); // truly fire-and-forget
      }
    } catch { /* non-fatal — SOS request already saved */ }

    // Refresh the Server Component cache before navigating so the dashboard
    // stats reflect the new request immediately when the user navigates back.
    router.refresh();
    router.push(`/dashboard/requests/${data.id}`);
  };

  const preGeneratedId = useRef(crypto.randomUUID()).current;

  // ── Form-level submission error (shown above the submit button) ───────────
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6"
      >
        <div>
          <h2 className="text-lg font-black text-slate-900">Create Emergency Request</h2>
          <p className="text-sm text-slate-500 mt-0.5">Fill in the details and we&apos;ll dispatch help immediately.</p>
        </div>

        <form
          onSubmit={handleSubmit(onValid)}
          noValidate
          aria-label="Emergency request form"
          className="space-y-6"
        >
          {/* Emergency Type */}
          <EmergencyTypeSelector value={emergencyType} onChange={handleTypeChange} error={typeError} />

          {/* Severity */}
          <SeveritySelector value={severity} onChange={handleSeverityChange} error={sevError} />

          {/* Location */}
          <LocationCapture
            state={locationState}
            onStateChange={handleLocationChange}
            manualAddress={manualAddress}
            onManualAddressChange={setManualAddress}
            error={locError}
          />

          {/* Map preview */}
          <AnimatePresence>
            {locationState.status === "captured" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <EmergencyMap
                  latitude={(locationState as { latitude: number }).latitude}
                  longitude={(locationState as { longitude: number }).longitude}
                  className="h-52 w-full rounded-xl overflow-hidden border border-slate-100"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Description */}
          <div>
            <label htmlFor="er-description" className="block text-sm font-bold text-slate-700 mb-1.5">
              Description <span className="text-[#E53935]" aria-hidden="true">*</span>
            </label>
            <textarea
              id="er-description"
              rows={4}
              maxLength={500}
              placeholder="Describe the emergency in detail (e.g. person collapsed, location details, injuries visible)."
              className={[
                "w-full px-4 py-3 rounded-xl border bg-white text-slate-900 text-sm placeholder:text-slate-400 resize-none",
                "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:border-[#E53935]",
                errors.description ? "border-[#E53935] bg-red-50/30" : "border-slate-200 hover:border-slate-300",
              ].join(" ")}
              aria-describedby="er-desc-meta"
              {...register("description", { onChange: () => notifyParent() })}
            />
            <div id="er-desc-meta" className="flex justify-between items-center mt-1">
              {errors.description
                ? <p className="text-xs font-medium text-[#E53935]" role="alert">{errors.description.message}</p>
                : <span />}
              <span className={`text-xs font-medium ml-auto ${descRemaining < 50 ? "text-amber-500" : "text-slate-400"}`}>
                {descRemaining} remaining
              </span>
            </div>

            {/* ML Predict button — below description */}
            <div className="mt-2 flex items-center gap-2">
              <PredictSeverityButton
                canPredict={canPredict}
                isPredicting={isPredicting}
                onClick={handlePredict}
              />
              {!canPredict && (
                <span className="text-[10px] text-slate-400">
                  Select type + enter description to enable
                </span>
              )}
            </div>
          </div>

          {/* ML Prediction card */}
          <AnimatePresence>
            {prediction && (
              <div ref={predictionCardRef}>
                <SeverityPredictionCard
                  prediction={prediction}
                  onAccept={handleAcceptPrediction}
                  onDismiss={() => setPrediction(null)}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Optional risk indicators (collapsible) */}
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowIndicators((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 hover:bg-slate-100 transition-colors"
              aria-expanded={showIndicators}
              aria-controls="risk-indicators-panel"
            >
              <span className="text-xs font-semibold text-slate-700">
                Optional: Risk indicators
                <span className="ml-2 text-slate-400 font-normal">(helps ML suggestion)</span>
              </span>
              {showIndicators
                ? <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
                : <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />}
            </button>

            <AnimatePresence initial={false}>
              {showIndicators && (
                <motion.div
                  id="risk-indicators-panel"
                  key="indicators"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-3 bg-white">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      These are optional. They help the ML model give a more accurate severity suggestion.
                      Leave blank if unknown.
                    </p>

                    {/* Boolean indicators */}
                    {(
                      [
                        ["conscious",                   "Person is conscious"],
                        ["breathing_difficulty",        "Breathing difficulty"],
                        ["severe_breathing_difficulty", "Severe breathing difficulty"],
                        ["chest_pain",                  "Chest pain"],
                        ["seizure",                     "Seizure"],
                        ["stroke_signs",                "Stroke signs (face droop, arm weakness, slurred speech)"],
                        ["allergic_reaction",           "Allergic reaction"],
                        ["pregnancy_emergency",         "Pregnancy emergency"],
                        ["major_accident",              "Major accident"],
                        ["violence_risk",               "Violence risk"],
                      ] as [keyof RiskIndicators, string][]
                    ).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <select
                            className="appearance-none w-24 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={
                              indicators[key] === null ? "unknown"
                              : indicators[key] === true ? "yes"
                              : "no"
                            }
                            onChange={(e) => {
                              const v = e.target.value === "yes" ? true : e.target.value === "no" ? false : null;
                              setIndicators((prev) => ({ ...prev, [key]: v as boolean | null }));
                            }}
                            aria-label={label}
                          >
                            <option value="unknown">Unknown</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                        <span className="text-xs text-slate-700">{label}</span>
                      </label>
                    ))}

                    {/* Bleeding level */}
                    <label className="flex items-center gap-3">
                      <select
                        className="w-24 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        value={indicators.bleeding_level ?? "unknown"}
                        onChange={(e) =>
                          setIndicators((prev) => ({
                            ...prev,
                            bleeding_level: e.target.value === "unknown" ? null : (e.target.value as RiskIndicators["bleeding_level"]),
                          }))
                        }
                        aria-label="Bleeding level"
                      >
                        <option value="unknown">Unknown</option>
                        <option value="none">None</option>
                        <option value="minor">Minor</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                      <span className="text-xs text-slate-700">Bleeding level</span>
                    </label>

                    {/* Burn level */}
                    <label className="flex items-center gap-3">
                      <select
                        className="w-24 text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        value={indicators.burn_level ?? "unknown"}
                        onChange={(e) =>
                          setIndicators((prev) => ({
                            ...prev,
                            burn_level: e.target.value === "unknown" ? null : (e.target.value as RiskIndicators["burn_level"]),
                          }))
                        }
                        aria-label="Burn level"
                      >
                        <option value="unknown">Unknown</option>
                        <option value="none">None</option>
                        <option value="minor">Minor</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                      <span className="text-xs text-slate-700">Burn level</span>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contact number */}
          <div>
            <label htmlFor="er-contact" className="block text-sm font-bold text-slate-700 mb-1.5">
              Contact Number <span className="text-[#E53935]" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                id="er-contact"
                type="tel"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                className={[
                  "w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-slate-900 text-sm placeholder:text-slate-400",
                  "transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#E53935]/30 focus:border-[#E53935]",
                  errors.contact_number ? "border-[#E53935] bg-red-50/30" : "border-slate-200 hover:border-slate-300",
                ].join(" ")}
                {...register("contact_number", { onChange: () => notifyParent() })}
              />
            </div>
            {errors.contact_number && (
              <p className="mt-1 text-xs font-medium text-[#E53935]" role="alert">{errors.contact_number.message}</p>
            )}
          </div>

          {/* Evidence upload */}
          <EvidenceUpload
            userId={userId}
            requestId={preGeneratedId}
            value={evidencePath}
            previewUrl={evidencePreview}
            onChange={handleEvidenceChange}
          />

          {/* Confirmation checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 flex-shrink-0 rounded border-slate-300 accent-[#E53935] cursor-pointer"
                {...register("confirmed", { onChange: () => notifyParent() })}
              />
              <span className="text-sm text-slate-700 leading-snug">
                I confirm this is a <strong>genuine emergency</strong> and the information I provided is accurate.
              </span>
            </label>
            {errors.confirmed && (
              <p className="mt-1 text-xs font-medium text-[#E53935] ml-7" role="alert">{errors.confirmed.message}</p>
            )}
          </div>

          {/* Form-level submission error */}
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl"
            >
              <AlertCircle className="w-4 h-4 text-[#E53935] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs font-medium text-red-700">{submitError}</p>
            </div>
          )}

          {/* SOS submit */}
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={submitting || shouldReduceMotion ? {} : { scale: 1.02 }}
            whileTap={submitting || shouldReduceMotion ? {} : { scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[#E53935] hover:bg-[#C62828] disabled:bg-red-300 text-white text-base font-black rounded-xl shadow-lg shadow-red-300 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Send SOS emergency request"
          >
            {submitting
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting emergency request…</>
              : <><Siren className="w-5 h-5" /> Send SOS Request</>}
          </motion.button>
        </form>
      </motion.div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => !submitting && setShowConfirm(false)}
              aria-hidden="true"
            />
            <motion.div
              key="dialog"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="er-confirm-title"
              aria-describedby="er-confirm-desc"
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-[#E53935]" />
                  </div>
                  <h3 id="er-confirm-title" className="text-base font-black text-slate-900">
                    Confirm Emergency Request
                  </h3>
                </div>
                <p id="er-confirm-desc" className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Are you sure you want to send this emergency request? Responders will be notified immediately.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={submitting}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#E53935] hover:bg-[#C62828] rounded-xl text-sm font-bold text-white transition-colors cursor-pointer disabled:bg-red-300 flex items-center justify-center gap-2"
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                      : "Send"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
