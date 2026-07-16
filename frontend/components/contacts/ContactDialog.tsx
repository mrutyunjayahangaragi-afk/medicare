"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import ContactForm from "./ContactForm";
import type { EmergencyContact } from "@/types/database";

interface ContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: EmergencyContact;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ContactDialog({ isOpen, onClose, contact, onSubmit, isSubmitting }: ContactDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Emergency Contact" : "Add Emergency Contact"}</DialogTitle>
        </DialogHeader>
        <ContactForm
          contact={contact}
          onSubmit={onSubmit}
          onCancel={onClose}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
