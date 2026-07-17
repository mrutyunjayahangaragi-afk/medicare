import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { UserRealtimeProvider } from "@/components/realtime/UserRealtimeProvider";
import { ResponderRealtimeProvider } from "@/components/realtime/ResponderRealtimeProvider";

export const metadata: Metadata = {
  title: "Responder Dashboard | Medicare",
  description: "Emergency responder dashboard for Medicare",
};

export default async function ResponderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is a responder or volunteer
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;

  if (!profile || (role !== "responder" && role !== "volunteer")) {
    // Check for a pending application before showing generic unauthorized
    const { data: pendingApp } = await supabase
      .from("portal_applications")
      .select("status")
      .eq("user_id", user.id)
      .eq("application_type", "responder")
      .single();

    if (pendingApp?.status === "pending") {
      redirect("/application-pending");
    }
    redirect("/unauthorized");
  }

  // For responders, organization membership is optional.
  // The role on the profile is the authoritative access grant.
  // (Some standalone responders may not belong to an organization.)

  return (
    <UserRealtimeProvider userId={user.id}>
      <ResponderRealtimeProvider responderId={user.id}>
        <div className="min-h-screen bg-slate-50">{children}</div>
      </ResponderRealtimeProvider>
    </UserRealtimeProvider>
  );
}
