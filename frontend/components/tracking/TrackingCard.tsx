"use client";

import { motion } from "framer-motion";
import { Phone, MapPin, Shield, Clock } from "lucide-react";

interface TrackingCardProps {
  type: "user" | "responder";
  name: string;
  role?: string;
  phone: string;
  status: string;
  eta?: string;
  distance?: string;
  destination?: string;
  vehicle?: string;
  emergencyType?: string;
  severity?: string;
}

export default function TrackingCard({
  type,
  name,
  role,
  phone,
  status,
  eta,
  distance,
  destination,
  vehicle,
  emergencyType,
  severity,
}: TrackingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            type === "user" ? "bg-blue-100" : "bg-amber-100"
          }`}>
            {type === "user" ? (
              <Shield className="w-6 h-6 text-blue-600" />
            ) : (
              <MapPin className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{name}</h3>
            {role && <p className="text-sm text-slate-500">{role}</p>}
          </div>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
          {status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-3">
        {emergencyType && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Emergency</p>
              <p className="font-medium text-slate-900">{emergencyType}</p>
            </div>
          </div>
        )}

        {severity && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Severity</p>
              <p className="font-medium text-slate-900">{severity}</p>
            </div>
          </div>
        )}

        {vehicle && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Vehicle</p>
              <p className="font-medium text-slate-900">{vehicle}</p>
            </div>
          </div>
        )}

        {destination && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Destination</p>
              <p className="font-medium text-slate-900 truncate">{destination}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <Phone className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Contact</p>
            <a
              href={`tel:${phone}`}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {phone}
            </a>
          </div>
        </div>
      </div>

      {/* ETA & Distance */}
      {(eta || distance) && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
          {eta && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">ETA</p>
                <p className="font-semibold text-slate-900">{eta}</p>
              </div>
            </div>
          )}
          {distance && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Distance</p>
                <p className="font-semibold text-slate-900">{distance}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
