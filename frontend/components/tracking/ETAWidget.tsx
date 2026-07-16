"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, Navigation } from "lucide-react";

interface ETAWidgetProps {
  eta: string;
  distance: string;
  speed?: number;
  isMoving?: boolean;
}

export default function ETAWidget({
  eta,
  distance,
  speed,
  isMoving = false,
}: ETAWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-blue-100">Estimated Arrival</p>
          <p className="text-2xl font-bold">{eta}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-200" />
          <div>
            <p className="text-xs text-blue-100">Distance</p>
            <p className="font-semibold">{distance}</p>
          </div>
        </div>
        {speed !== undefined && (
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-200" />
            <div>
              <p className="text-xs text-blue-100">Speed</p>
              <p className="font-semibold">{speed} km/h</p>
            </div>
          </div>
        )}
      </div>

      {isMoving && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 pt-4 border-t border-white/20"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <p className="text-sm text-blue-100">Responder is on the way</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
