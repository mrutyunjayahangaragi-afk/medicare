"use client";

/**
 * CallPrimaryContactModal
 *
 * Confirmation dialog shown before launching a tel: call to the user's
 * primary emergency contact.
 *
 * Flow:
 *   1. User taps "Call Primary Contact" button
 *   2. This modal opens with the contact's name and masked phone
 *   3. Cancel → modal closes, no call initiated
 *   4. Call  → window.location.href = `tel:${phone}`, modal closes,
 *              audit log written, toast shown
 *
 * On desktop the OS may open a calling application (Skype, FaceTime, etc.)
 * or do nothing — we do not throw an error in that case.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Phone, X } from "lucide-react";

interface CallPrimaryContactModalProps {
  isOpen: boolean;
  contactName: string;
  contactPhone: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CallPrimaryContactModal({
  isOpen,
  contactName,
  contactPhone,
  onCancel,
  onConfirm,
}: CallPrimaryContactModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ──────────────────────────────────────────── */}
          <motion.div
            key="call-contact-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* ── Dialog ────────────────────────────────────────────── */}
          <motion.div
            key="call-contact-dialog"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4"
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="call-modal-title"
              aria-describedby="call-modal-desc"
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={onCancel}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
                aria-label="Cancel — do not place call"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="flex items-center justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-300/50">
                  <Phone className="w-7 h-7 text-white" aria-hidden="true" />
                </div>
              </div>

              {/* Title */}
              <h2
                id="call-modal-title"
                className="text-lg font-black text-slate-900 text-center mb-2"
              >
                Call your primary emergency contact now?
              </h2>

              {/* Contact info */}
              <div
                id="call-modal-desc"
                className="flex flex-col items-center gap-1 mt-3 mb-5 px-3 py-3 bg-red-50 border border-red-100 rounded-xl"
              >
                <p className="text-sm font-bold text-slate-800">{contactName}</p>
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  {contactPhone}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors focus-visible:outline-2 focus-visible:outline-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-xl text-sm font-bold text-white shadow-md shadow-red-200 transition-colors focus-visible:outline-2 focus-visible:outline-red-600"
                  aria-label={`Call ${contactName}`}
                >
                  Call
                </button>
              </div>

              <p className="text-center text-[10px] text-slate-400 mt-4 leading-relaxed">
                This will open your device&apos;s phone app.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
