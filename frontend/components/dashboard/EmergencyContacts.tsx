"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Phone, UserPlus, Star, Bell, BellOff } from "lucide-react";
import type { EmergencyContact } from "@/types/database";

interface EmergencyContactsProps {
  contacts: EmergencyContact[];
}

export default function EmergencyContacts({ contacts }: EmergencyContactsProps) {
  const shouldReduceMotion = useReducedMotion();
  const primaryContact = contacts.find((c) => c.is_primary) ?? null;
  // Show primary first, then up to 2 more
  const displayed = [
    ...contacts.filter((c) => c.is_primary),
    ...contacts.filter((c) => !c.is_primary).slice(0, 2),
  ].slice(0, 3);

  return (
    <motion.section
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      aria-labelledby="emergency-contacts-heading"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          id="emergency-contacts-heading"
          className="text-base font-black text-slate-900"
        >
          Emergency Contacts
        </h2>
        {contacts.length > 0 && (
          <Link
            href="/dashboard/contacts"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            aria-label="Manage emergency contacts"
          >
            Manage
          </Link>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
        {contacts.length === 0 ? (
          /* ── Empty State ── */
          <div className="flex flex-col items-center justify-center text-center py-6">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-5">
              <Phone className="w-7 h-7 text-slate-300" aria-hidden="true" />
            </div>
            <p className="text-sm font-bold text-slate-700 mb-1">
              No emergency contacts added.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mb-5">
              Add trusted contacts who can be reached during an emergency.
            </p>
            <Link
              href="/dashboard/contacts"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 min-h-[44px]"
              aria-label="Add your first emergency contact"
            >
              <UserPlus className="w-4 h-4" aria-hidden="true" />
              Add Emergency Contact
            </Link>
          </div>
        ) : (
          /* ── Contacts List ── */
          <div className="space-y-3">
            {displayed.map((contact) => (
              <div
                key={contact.id}
                className={[
                  "flex items-center justify-between gap-3 p-3 rounded-xl border",
                  contact.is_primary
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-slate-50 border-slate-100",
                ].join(" ")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar initial */}
                  <div
                    className={[
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                      contact.is_primary
                        ? "bg-emerald-200 text-emerald-800"
                        : "bg-slate-200 text-slate-700",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    {contact.full_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {contact.full_name}
                      </span>
                      {contact.is_primary && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                          <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {contact.relationship
                        ? `${contact.relationship} · ${contact.phone_number}`
                        : contact.phone_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Notification indicator */}
                  {contact.notify_during_emergency ? (
                    <Bell
                      className="w-3.5 h-3.5 text-emerald-500"
                      aria-label="Will be notified"
                    />
                  ) : (
                    <BellOff
                      className="w-3.5 h-3.5 text-slate-300"
                      aria-label="Notifications off"
                    />
                  )}
                  {/* Call link */}
                  <a
                    href={`tel:${contact.phone_number}`}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                    aria-label={`Call ${contact.full_name}`}
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ))}

            {/* Show count overflow + manage link */}
            <div className="flex items-center justify-between pt-1">
              {contacts.length > 3 && (
                <p className="text-xs text-slate-400">
                  +{contacts.length - 3} more contact{contacts.length - 3 !== 1 ? "s" : ""}
                </p>
              )}
              <Link
                href="/dashboard/contacts"
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                aria-label="View and manage all emergency contacts"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Add / manage contacts
              </Link>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
