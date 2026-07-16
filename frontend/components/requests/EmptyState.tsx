"use client";

import { motion } from "framer-motion";
import { AlertCircle, Plus } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  onNewRequest?: () => void;
}

export default function EmptyState({ onNewRequest }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-slate-400" />
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        No Emergency Requests Yet
      </h3>

      <p className="text-slate-500 text-center max-w-md mb-8">
        When you submit an emergency request it will appear here.
      </p>

      {onNewRequest ? (
        <button
          onClick={onNewRequest}
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Request Emergency
        </button>
      ) : (
        <Link
          href="/dashboard/emergency"
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Request Emergency
        </Link>
      )}
    </motion.div>
  );
}
