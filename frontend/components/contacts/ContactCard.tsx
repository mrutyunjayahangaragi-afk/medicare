"use client";

import { Phone, Mail, Star, Edit, Trash2, Bell, BellOff } from "lucide-react";
import { motion } from "framer-motion";
import type { EmergencyContact } from "@/types/database";

interface ContactCardProps {
  contact: EmergencyContact;
  onEdit: (contact: EmergencyContact) => void;
  onDelete: (contact: EmergencyContact) => void;
  onSetPrimary: (contact: EmergencyContact) => void;
}

export default function ContactCard({ contact, onEdit, onDelete, onSetPrimary }: ContactCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-bold text-slate-900 truncate">
              {contact.full_name}
            </h3>
            {contact.is_primary && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                <Star className="w-3 h-3 fill-current" /> Primary
              </span>
            )}
          </div>
          
          <p className="text-sm text-slate-600 mb-3">{contact.relationship}</p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">{contact.phone_number}</span>
            </div>
            
            {contact.alternate_phone && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{contact.alternate_phone}</span>
              </div>
            )}
            
            {contact.email && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </div>

          {contact.notes && (
            <p className="mt-3 text-sm text-slate-500 italic line-clamp-2">
              {contact.notes}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3">
            {contact.notify_during_emergency ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                <Bell className="w-3 h-3" /> Emergency alerts enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                <BellOff className="w-3 h-3" /> Emergency alerts disabled
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {!contact.is_primary && (
            <button
              onClick={() => onSetPrimary(contact)}
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              aria-label="Set as primary contact"
              title="Set as primary contact"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(contact)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            aria-label="Edit contact"
            title="Edit contact"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(contact)}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            aria-label="Delete contact"
            title="Delete contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
