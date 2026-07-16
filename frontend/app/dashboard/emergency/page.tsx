import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import EmergencyPageClient from "@/components/emergency/EmergencyPageClient";

export const metadata: Metadata = { title: "Emergency Help — Medicare" };

export default async function EmergencyPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use maybeSingle() — Google OAuth users may not have a profile row yet
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // Resolve values with metadata fallback (works for Google OAuth users)
  const resolvedName =
    profileData?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    "User";

  const resolvedPhone =
    profileData?.phone ||
    (user.user_metadata?.phone as string | undefined) ||
    "";

  const resolvedAvatar =
    profileData?.avatar_url ||
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.picture as string | undefined) ||
    null;

  return (
    <EmergencyPageClient
      userId={user.id}
      profileName={resolvedName}
      initialPhone={resolvedPhone}
      avatarUrl={resolvedAvatar}
      userEmail={user.email ?? ""}
    />
  );
}
