"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Phone, Mail, MapPin, Shield, Calendar, Edit2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AvailabilityToggle from "@/components/responder/AvailabilityToggle";
import type { AvailabilityStatus } from "@/types/auth";

export default function ResponderProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    experience_years: "",
    skills: "",
  });

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setEditForm({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          experience_years: profileData.experience_years?.toString() || "",
          skills: profileData.skills?.join(", ") || "",
        });

        // Load organization if responder
        if (profileData.role === "responder") {
          const { data: memberData } = await supabase
            .from("organization_members")
            .select("organizations(*)")
            .eq("user_id", user.id)
            .eq("status", "approved")
            .single();

          if (memberData && memberData.organizations) {
            setOrganization(memberData.organizations);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          experience_years: parseInt(editForm.experience_years) || null,
          skills: editForm.skills.split(",").map(s => s.trim()).filter(s => s),
        })
        .eq("id", user.id);

      if (error) throw error;

      await loadProfile();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert("Failed to save profile. Please try again.");
    }
  };

  const handleAvailabilityChange = (status: AvailabilityStatus) => {
    if (profile) {
      setProfile({ ...profile, availability_status: status });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded-xl" />
            <div className="h-64 bg-slate-200 rounded-xl" />
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-48 bg-slate-200 rounded-xl" />
              <div className="h-48 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <p className="text-slate-500">Profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/responder")}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Responder Profile</h1>
              <p className="text-slate-600">Manage your responder information and availability</p>
            </div>
          </div>
          <AvailabilityToggle
            currentStatus={profile.availability_status || "offline"}
            onStatusChange={handleAvailabilityChange}
          />
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{profile.full_name || "Responder"}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600 capitalize">{profile.role}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Edit profile"
            >
              <Edit2 className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Years of Experience</label>
                <input
                  type="number"
                  value={editForm.experience_years}
                  onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={editForm.skills}
                  onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="First Aid, CPR, Emergency Response"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Email</p>
                  <p className="font-medium text-slate-900">{profile.email}</p>
                </div>
              </div>
              {profile.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Phone</p>
                    <p className="font-medium text-slate-900">{profile.phone}</p>
                  </div>
                </div>
              )}
              {profile.experience_years && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Experience</p>
                    <p className="font-medium text-slate-900">{profile.experience_years} years</p>
                  </div>
                </div>
              )}
              {profile.skills && profile.skills.length > 0 && (
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Skills</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.skills.map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Member Since</p>
                  <p className="font-medium text-slate-900">{formatDate(profile.created_at)}</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Organization Card */}
        {organization && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white border border-slate-200 rounded-2xl p-6 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Organization</h3>
                <p className="text-sm text-slate-600">{organization.name}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Address</p>
                  <p className="font-medium text-slate-900">{organization.address || "N/A"}</p>
                </div>
              </div>
              {organization.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Organization Phone</p>
                    <p className="font-medium text-slate-900">{organization.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Availability Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white border border-slate-200 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Availability Status</h3>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${
              profile.availability_status === "available" ? "bg-green-500" :
              profile.availability_status === "busy" ? "bg-amber-500" :
              "bg-slate-400"
            }`} />
            <span className="font-medium text-slate-900 capitalize">
              {profile.availability_status || "offline"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {profile.availability_status === "available" && "You are available to accept new emergency requests."}
            {profile.availability_status === "busy" && "You are currently busy with an active assignment."}
            {profile.availability_status === "offline" && "You are offline and will not receive new assignments."}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
