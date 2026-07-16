"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus, Shield, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import ContactList from "@/components/contacts/ContactList";
import ContactDialog from "@/components/contacts/ContactDialog";
import DeleteContactDialog from "@/components/contacts/DeleteContactDialog";
import EmptyContactsState from "@/components/contacts/EmptyContactsState";
import { fetchEmergencyContacts, createEmergencyContact, updateEmergencyContact, deleteEmergencyContact, setPrimaryEmergencyContact } from "@/lib/contacts";
import type { EmergencyContact } from "@/types/database";

export default function ContactsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [deletingContact, setDeletingContact] = useState<EmergencyContact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmergencyContacts();
      setContacts(data);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      toast("Failed to load contacts. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAddContact = () => {
    setEditingContact(null);
    setIsDialogOpen(true);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setIsDialogOpen(true);
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    setDeletingContact(contact);
    setIsDeleteDialogOpen(true);
  };

  const handleSetPrimary = async (contact: EmergencyContact) => {
    try {
      const { error } = await setPrimaryEmergencyContact(contact.id);
      if (error) {
        toast(error, "error");
        return;
      }
      toast("Primary contact updated successfully!", "success");
      await loadContacts();
    } catch (error) {
      console.error("Failed to set primary contact:", error);
      toast("Failed to set primary contact. Please try again.", "error");
    }
  };

  const handleContactSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingContact) {
        const { error } = await updateEmergencyContact(editingContact.id, data);
        if (error) {
          toast(error, "error");
          return;
        }
        toast("Contact updated successfully!", "success");
      } else {
        const { error } = await createEmergencyContact(data);
        if (error) {
          toast(error, "error");
          return;
        }
        toast("Contact added successfully!", "success");
      }
      setIsDialogOpen(false);
      await loadContacts();
    } catch (error) {
      console.error("Failed to save contact:", error);
      toast("Failed to save contact. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContact) return;
    
    setIsDeleting(true);
    try {
      const { error } = await deleteEmergencyContact(deletingContact.id);
      if (error) {
        toast(error, "error");
        return;
      }
      toast("Contact deleted successfully!", "success");
      setIsDeleteDialogOpen(false);
      await loadContacts();
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast("Failed to delete contact. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const primaryContact = contacts.find((c) => c.is_primary);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Emergency Contacts
              </h1>
              <p className="text-slate-600">
                Manage trusted contacts for emergencies
              </p>
            </div>
          </div>

          <button
            onClick={handleAddContact}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
        </motion.div>

        {/* Primary Contact Summary */}
        {primaryContact && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-emerald-600 fill-current" />
              <span className="text-sm font-bold text-emerald-800">Primary Emergency Contact</span>
            </div>
            <p className="text-sm text-emerald-700">
              <strong>{primaryContact.full_name}</strong> ({primaryContact.relationship}) - {primaryContact.phone_number}
            </p>
          </motion.div>
        )}

        {/* Contact Count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="mb-4"
        >
          <p className="text-sm text-slate-600">
            {contacts.length === 0
              ? "No contacts added yet"
              : contacts.length === 1
              ? "1 contact"
              : `${contacts.length} contacts`}
          </p>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <EmptyContactsState onAddContact={handleAddContact} />
        ) : (
          <ContactList
            contacts={contacts}
            onEdit={handleEditContact}
            onDelete={handleDeleteContact}
            onSetPrimary={handleSetPrimary}
          />
        )}

        {/* Dialogs */}
        <ContactDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          contact={editingContact || undefined}
          onSubmit={handleContactSubmit}
          isSubmitting={isSubmitting}
        />

        <DeleteContactDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          contact={deletingContact}
          onConfirm={handleDeleteConfirm}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
