import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import TopNavbar from "@/components/dashboard/TopNavbar";
import ProfileForm from "@/components/profile/ProfileForm";
import AvatarUpload from "@/components/profile/AvatarUpload";
import MedicalInformationForm from "@/components/profile/MedicalInformationForm";
import type { Database } from "@/types/database";

export const metadata: Metadata = {
  title: "My Profile — Medicare",
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      avatar_url,
      phone,
      date_of_birth,
      gender,
      address,
      blood_group,
      allergies,
      medical_conditions,
      current_medications,
      medical_notes,
      created_at,
      updated_at,
      role,
      hospital_name,
      is_verified,
      availability_status,
      responder_type
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[dashboard/profile] query error:", profileError.message);
  }

  if (profileData?.role === "volunteer") {
    redirect("/coming-soon?role=volunteer");
  }

  if (profileData?.role === "hospital") {
    redirect("/coming-soon?role=hospital");
  }

  const resolvedName =
    profileData?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    "User";

  const resolvedAvatar =
    profileData?.avatar_url ||
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    null;

  // If profile data is missing, this is a data integrity issue - do not silently default
  if (!profileData) {
    console.error("[dashboard/profile] No profile data found for user:", user.id);
    redirect("/login?error=no_profile");
  }

  const profile: ProfileRow = {
    id: user.id,
    full_name: profileData?.full_name ?? resolvedName,
    email: user.email ?? null,
    phone: profileData?.phone ?? null,
    role: profileData.role,
    hospital_name: profileData?.hospital_name ?? null,
    avatar_url: resolvedAvatar,
    is_verified: profileData?.is_verified ?? true,
    availability_status: profileData?.availability_status ?? "offline",
    responder_type: profileData?.responder_type ?? null,
    organization_id: null,
    date_of_birth: profileData?.date_of_birth ?? null,
    gender: profileData?.gender ?? null,
    address: profileData?.address ?? null,
    blood_group: profileData?.blood_group ?? null,
    allergies: profileData?.allergies ?? null,
    medical_conditions: profileData?.medical_conditions ?? null,
    current_medications: profileData?.current_medications ?? null,
    medical_notes: profileData?.medical_notes ?? null,
    created_at: profileData?.created_at ?? new Date().toISOString(),
    updated_at: profileData?.updated_at ?? new Date().toISOString(),
  };

  const navUser = {
    email: user.email ?? "",
    fullName: resolvedName,
    avatarUrl: resolvedAvatar,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopNavbar user={navUser} />

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 bg-slate-50/50">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#E53935] transition-colors mb-5 group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Back to Dashboard
            </Link>

            <h1 className="text-2xl font-black text-slate-900">My Profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your personal details, medical information, and profile photo.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">
              Profile Photo
            </h2>
            <AvatarUpload currentUrl={resolvedAvatar} displayName={resolvedName} />
          </div>

          <ProfileForm
            profile={{
              id: profile.id,
              full_name: profile.full_name,
              phone: profile.phone,
              created_at: profile.created_at,
            }}
            userEmail={user.email ?? ""}
          />

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
            <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">
              Medical Information
            </h2>
            <MedicalInformationForm profile={profile} />
          </div>
        </div>
      </main>
    </div>
  );
}
