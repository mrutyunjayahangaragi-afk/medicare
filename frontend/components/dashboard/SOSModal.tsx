"use client";

/**
 * SOSModal — confirmation modal that fires when the SOS button is clicked.
 *
 * Flow:
 *  1. User clicks SOS → alarm starts → this modal opens
 *  2. User reads confirmation, optionally enables "Also call contact"
 *  3. Cancel → alarm stops, modal closes, no request created
 *  4. Confirm → navigate to /dashboard/emergency (full form)
 *     OR if a quick-SOS path is desired later this component can be
 *     extended to submit directly.
 *
 * The modal is intentionally kept simple: the actual emergency request
 * is always created through the full emergency form so the user can
 * supply description, severity and contact number.
 * Twilio notification is triggered by the backend automatically after
 * request creation via POST /api/v1/twilio/notify/{request_id}.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Phone, Siren, VolumeX, X } from "lucide-react";
import { playSOSAlarm, stopSOSAlarm } from "@/lib/audio/sos-alarm";

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryContactName?: string | null;
  hasPrimaryContact?: boolean;
}

export default function SOSModal({
  isOpen,
  onClose,
  primaryContactName,
  hasPrimaryContact = false,
}: SOSModalProps) {
  const router   = useRouter();
  const [alarmActive, setAlarmActive] = useState(false);
  const alarmStarted = useRef(false);

  // ── Start alarm when modal opens ─────────────────────────────────
  useEffect(() => {
    if (isOpen && !alarmStarted.current) {
      alarmStarted.current = true;
      playSOSAlarm();
      setAlarmActive(true);
    }
    if (!isOpen) {
      alarmStarted.current = false;
      stopSOSAlarm();
      setAlarmActive(false);
    }
  }, [isOpen]);

  // ── Stop alarm on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopSOSAlarm();
    };
  }, []);

  const handleStopAlarm = () => {
    stopSOSAlarm();
    setAlarmActive(false);
  };

  const handleCancel = () => {
    stopSOSAlarm();
    setAlarmActive(false);
    onClose();
  };

  const handleConfirm = () => {
    // Alarm keeps playing while user fills the form; the emergency form
    // page will call stopSOSAlarm when the request is submitted.
    // We stop it here anyway so it doesn't distract during form filling.
    stopSOSAlarm();
    setAlarmActive(false);
    onClose();
    router.push("/dashboard/emergency");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sos-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={handleCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            key="sos-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sos-modal-title"
            aria-describedby="sos-modal-desc"
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full">
              {/* Close */}
              <button
                type="button"
                onClick={handleCancel}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
                aria-label="Cancel SOS"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="flex items-center justify-center mb-5">
                <div className="relative w-20 h-20">
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-red-400"
                    aria-hidden="true"
                  />
                  <div className="relative w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-300/50">
                    <Siren className="w-9 h-9 text-white" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <h2
                id="sos-modal-title"
                className="text-xl font-black text-slate-900 text-center mb-2"
              >
                Emergency SOS
              </h2>

              {/* Description */}
              <p
                id="sos-modal-desc"
                className="text-sm text-slate-600 text-center leading-relaxed mb-1"
              >
                You&apos;re about to submit an emergency request. Fill in the
                details and we&apos;ll dispatch help immediately.
              </p>

              {/* Primary contact notice */}
              {hasPrimaryContact ? (
                <div className="flex items-center gap-2 mt-4 mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
                  <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700 font-medium leading-snug">
                    {primaryContactName
                      ? `${primaryContactName} will be notified by SMS after submission.`
                      : "Your primary emergency contact will be notified by SMS."}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 mt-4 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-snug">
                    No primary emergency contact set.{" "}
                    <a
                      href="/dashboard/contacts"
                      className="font-semibold underline hover:text-amber-800"
                      onClick={handleCancel}
                    >
                      Add one in Contacts
                    </a>{" "}
                    to enable SMS alerts.
                  </p>
                </div>
              )}

              {/* Alarm control */}
              {alarmActive && (
                <button
                  type="button"
                  onClick={handleStopAlarm}
                  className="w-full mb-3 flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <VolumeX className="w-4 h-4" />
                  Stop Alarm
                </button>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-2 focus-visible:outline-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-bold text-white shadow-md shadow-red-200 transition-colors focus-visible:outline-2 focus-visible:outline-red-600"
                >
                  Send SOS Request
                </button>
              </div>

              {/* Disclaimer */}
              <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
                For life-threatening emergencies call{" "}
                <strong>112 / 911</strong> directly.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
