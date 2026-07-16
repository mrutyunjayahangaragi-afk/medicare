"use client";

import { motion } from "framer-motion";
import type { EmergencyContact } from "@/types/database";
import ContactCard from "./ContactCard";

interface ContactListProps {
  contacts: EmergencyContact[];
  onEdit: (contact: EmergencyContact) => void;
  onDelete: (contact: EmergencyContact) => void;
  onSetPrimary: (contact: EmergencyContact) => void;
}

export default function ContactList({ contacts, onEdit, onDelete, onSetPrimary }: ContactListProps) {
  if (contacts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact, index) => (
        <motion.div
          key={contact.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <ContactCard
            contact={contact}
            onEdit={onEdit}
            onDelete={onDelete}
            onSetPrimary={onSetPrimary}
          />
        </motion.div>
      ))}
    </div>
  );
}
