import { createClient } from "@/lib/supabase/server";

export default async function HospitalSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: hospitalProfile } = await supabase
    .from("hospital_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!hospitalProfile) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Please complete your hospital profile first.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Hospital Settings</h1>
        <p className="text-slate-600 mt-1">Configure your hospital preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <p className="text-slate-600">Settings interface coming soon.</p>
      </div>
    </div>
  );
}
