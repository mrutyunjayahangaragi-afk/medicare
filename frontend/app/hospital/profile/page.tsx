import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";

export default async function HospitalProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: hospitalProfile } = await supabase
    .from("hospital_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Hospital Profile</h1>
        <p className="text-slate-600 mt-1">
          {hospitalProfile ? "Update your hospital information" : "Create your hospital profile"}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        {hospitalProfile ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {hospitalProfile.hospital_name}
              </h3>
              <p className="text-slate-600">License: {hospitalProfile.license_number}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number
                </label>
                <p className="text-slate-900">{hospitalProfile.phone_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <p className="text-slate-900">{hospitalProfile.email || "Not provided"}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address
                </label>
                <p className="text-slate-900">{hospitalProfile.address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Beds
                </label>
                <p className="text-slate-900">{hospitalProfile.total_beds}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  ICU Beds
                </label>
                <p className="text-slate-900">{hospitalProfile.total_icu_beds}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Emergency Beds
                </label>
                <p className="text-slate-900">{hospitalProfile.total_emergency_beds}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Button>Edit Profile</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-600">
              Complete your hospital profile to start accepting emergency requests.
            </p>
            <Button>Create Profile</Button>
          </div>
        )}
      </div>
    </div>
  );
}
