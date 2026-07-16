"use client";

import { motion } from "framer-motion";
import { UserPlus, Shield } from "lucide-react";

interface EmptyContactsStateProps {
  onAddContact: () => void;
}

export default function EmptyContactsState({ onAddContact }: EmptyContactsStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-slate-400" />
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 mb-2">
        No emergency contacts added
      </h3>
      
      <p className="text-sm text-slate-600 max-w-md mb-6">
        Add trusted contacts who can be reached during an emergency. These contacts will be notified when you request emergency assistance.
      </p>
      
      <motion.button
        onClick={onAddContact}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
        Add Emergency Contact
      </motion.button>
    </motion.div>
  );
}
