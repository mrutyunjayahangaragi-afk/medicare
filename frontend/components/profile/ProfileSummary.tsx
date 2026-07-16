"use client";

import { motion } from "framer-motion";
import { User, Mail, Phone, Calendar, MapPin, Droplet, Activity, Pill, FileText } from "lucide-react";
import type { Database } from "@/types/database";

interface ProfileSummaryProps {
  profile: Database["public"]["Tables"]["profiles"]["Row"];
  email: string;
}

export default function ProfileSummary({ profile, email }: ProfileSummaryProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatGender = (gender: string | null) => {
    if (!gender) return "—";
    if (gender === "prefer_not_to_say") return "Prefer not to say";
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6"
    >
      <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">
        Profile Summary
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Personal Information
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Full Name</p>
                <p className="text-sm font-medium text-slate-900">{profile.full_name || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="text-sm font-medium text-slate-900">{email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="text-sm font-medium text-slate-900">{profile.phone || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Date of Birth</p>
                <p className="text-sm font-medium text-slate-900">{formatDate(profile.date_of_birth)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Gender</p>
                <p className="text-sm font-medium text-slate-900">{formatGender(profile.gender)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="text-sm font-medium text-slate-900">{profile.address || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Medical Information
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Droplet className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Blood Group</p>
                <p className="text-sm font-medium text-slate-900">{profile.blood_group || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Activity className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Allergies</p>
                <p className="text-sm font-medium text-slate-900 line-clamp-2">{profile.allergies || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Activity className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Medical Conditions</p>
                <p className="text-sm font-medium text-slate-900 line-clamp-2">{profile.medical_conditions || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Pill className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Current Medications</p>
                <p className="text-sm font-medium text-slate-900 line-clamp-2">{profile.current_medications || "—"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Medical Notes</p>
                <p className="text-sm font-medium text-slate-900 line-clamp-2">{profile.medical_notes || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
