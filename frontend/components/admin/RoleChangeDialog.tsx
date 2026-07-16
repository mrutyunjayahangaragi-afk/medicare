"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Shield, Loader2 } from "lucide-react";

interface RoleChangeDialogProps {
  userId: string;
  currentRole: string;
}

const roles = ["user", "responder", "volunteer", "hospital_staff", "admin"];

export default function RoleChangeDialog({
  userId,
  currentRole,
}: RoleChangeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newRole, setNewRole] = useState(currentRole);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleRoleChange = async () => {
    if (newRole === currentRole) {
      setError("Please select a different role");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: rpcError } = await supabase.rpc("change_user_role", {
        p_user_id: userId,
        p_admin_id: user.id,
        p_new_role: newRole,
      });

      if (rpcError) throw rpcError;

      setIsOpen(false);
      setNewRole(currentRole);
      router.refresh();
    } catch (error) {
      console.error("Failed to change role:", error);
      setError("Failed to change role. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Change Role
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Change User Role
                </h3>
                <p className="text-sm text-slate-600">
                  This action will be logged
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Current Role
              </label>
              <p className="px-3 py-2 bg-slate-100 rounded-lg capitalize">{currentRole}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                New Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                {roles.map((role) => (
                  <option key={role} value={role} className="capitalize">
                    {role}
                  </option>
                ))}
              </select>
              {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setNewRole(currentRole);
                  setError("");
                }}
                disabled={loading}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={loading || newRole === currentRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Role"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
