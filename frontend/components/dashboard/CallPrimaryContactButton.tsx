"use client";

/**
 * CallPrimaryContactButton
 *
 * Mobile-first "Call Primary Contact" emergency button.
 *
 * Behaviour:
 *   - On mount, loads the authenticated user's primary emergency contact
 *     via the backend API (/api/v1/emergency-contacts) using the
 *     existing apiFetch helper (token attached automatically).
 *   - If no primary contact exists, the button is disabled and a hint is
 *     shown below it: "Add a primary emergency contact in Profile."
 *   - If the phone number fails basic validation, the button is also
 *     disabled.
 *   - Tapping opens a confirmation dialog ("Call your primary emergency
 *     contact now?" / Call / Cancel).
 *   - On confirm:
 *       1. window.location.href = `tel:${phone}` — opens the device dialler
 *       2. An audit log row is written to Supabase (best-effort, non-fatal)
 *       3. A toast is shown: "Opening your phone app…"
 *   - On desktop the tel: link may open the OS calling app (Skype, FaceTime,
 *     etc.) or do nothing — no error is thrown in either case.
 *
 * Accessibility:
 *   - aria-label describes the action and the contact name when known
 *   - Keyboard-accessible (button element, focus-visible ring)
 *   - Disabled state uses aria-disabled + visual opacity
 *   - Confirmation dialog has role="alertdialog", aria-modal, aria-labelledby
 */

import { useEffect, useState, useCallback } from "react";
import { Phone } from "lucide-react";
import Link from "next/link";

import { getPrimaryEmergencyContact, type PrimaryContactResult } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import CallPrimaryContactModal from "@/components/dashboard/CallPrimaryContactModal";

// ── Phone validation ───────────────────────────────────────────────────────

/**
 * Accepts international formats like +91-9876543210, +1 (800) 555-0100,
 * plain 10-digit numbers, etc.
 * Requires at least 7 digits (after stripping non-numeric chars).
 */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CallPrimaryContactButton() {
  const { toast } = useToast();

  const [contact, setContact]       = useState<PrimaryContactResult | null>(null);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [calling, setCalling]       = useState(false);

  // ── Load primary contact on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const primary = await getPrimaryEmergencyContact();
        if (!cancelled) setContact(primary);
      } catch {
        // Non-fatal — button will show disabled state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Derived state ──────────────────────────────────────────────────
  const phoneValid = contact ? isValidPhone(contact.phone_number) : false;
  const isReady    = !loading && contact !== null && phoneValid;

  // ── Handlers ───────────────────────────────────────────────────────

  const handleButtonClick = useCallback(() => {
    if (!isReady || calling) return;
    setModalOpen(true);
  }, [isReady, calling]);

  const handleCancel = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!contact) return;
    setCalling(true);
    setModalOpen(false);

    // 1. Launch tel: link — opens the device phone app
    window.location.href = `tel:${contact.phone_number}`;

    // 2. Toast feedback
    toast("Opening your phone app…", "info");

    // 3. Write audit log — best-effort, never blocks the call
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          actor_id:    user.id,
          action:      "call_primary_contact",
          entity_type: "emergency_contact",
          entity_id:   contact.id,
          new_data:    {
            contact_name: contact.full_name,
            // phone intentionally omitted from audit log for privacy
            timestamp:    new Date().toISOString(),
          },
        });
      }
    } catch {
      // Audit log failure is non-fatal — the call was already initiated
    }

    // Reset after a short delay so the button doesn't stay disabled
    // if the user navigates back after the OS call screen
    setTimeout(() => setCalling(false), 3000);
  }, [contact, toast]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex flex-col items-start gap-1.5">
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={!isReady || calling}
          aria-label={
            isReady
              ? `Call primary emergency contact${contact ? ` — ${contact.full_name}` : ""}`
              : "Call primary emergency contact — no contact configured"
          }
          aria-disabled={!isReady || calling}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-red-200 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-red-600 min-h-[38px]"
        >
          <Phone className="w-4 h-4" aria-hidden="true" />
          <span>
            {calling
              ? "Calling…"
              : contact
                ? `Call ${contact.full_name}`
                : "Call Primary Contact"}
          </span>
        </button>

        {/* Show hint only after loading completes and no valid contact exists */}
        {!loading && (!contact || !phoneValid) && (
          <p className="text-[11px] text-slate-500 leading-snug pl-0.5">
            <Link
              href="/dashboard/contacts"
              className="font-semibold text-red-600 hover:underline focus-visible:underline"
              aria-label="Add a primary emergency contact in Contacts"
            >
              Add a primary emergency contact
            </Link>{" "}
            in Profile.
          </p>
        )}
      </div>

      {/* Confirmation modal — rendered outside the button container for z-index */}
      {contact && (
        <CallPrimaryContactModal
          isOpen={modalOpen}
          contactName={contact.full_name}
          contactPhone={contact.phone_number}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      )}
    </>
  );
}
