"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import type { EmergencyContact } from "@/types/database";

interface DeleteContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contact: EmergencyContact | null;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export default function DeleteContactDialog({ isOpen, onClose, contact, onConfirm, isDeleting }: DeleteContactDialogProps) {
  if (!contact) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Emergency Contact</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Are you sure you want to remove this emergency contact?</p>
              <p className="mt-1 text-red-700">
                <strong>{contact.full_name}</strong> ({contact.relationship})
              </p>
            </div>
          </div>

          {contact.is_primary && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <strong>Warning:</strong> This is your primary emergency contact. You can select another primary contact after deletion.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1"
          >
            {isDeleting ? "Deleting..." : "Delete Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
