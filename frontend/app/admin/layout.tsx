import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopNavbar from "@/components/admin/AdminTopNavbar";
import { normalizeRole } from "@/lib/auth/get-user-role";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Verify admin role — use maybeSingle() to avoid PGRST116 on missing row.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      `[AdminLayout] Profile query failed for userId=${user.id}:`,
      profileError.message,
      profileError.code
    );
    // Query failure — do not grant access.
    redirect("/unauthorized");
  }

  // normalizeRole trims + lower-cases to prevent "Admin" / " admin" mismatches.
  // normalizeRole now returns "hospital" (not "hospital_staff") as the canonical value.
  const role = normalizeRole(profile?.role as string | null | undefined);

  if (role !== "admin") {
    // Redirect to the correct portal based on the user's actual role.
    const destination =
      role === "hospital" || role === "hospital_staff" ? "/hospital"
      : role === "responder" || role === "volunteer" ? "/responder"
      : "/dashboard";

    console.info("[AdminLayout] Non-admin access attempt redirected", {
      userId: user.id,
      databaseRole: role,
      destination,
    });
    redirect(destination);
  }

  console.info("[AdminLayout] Resolved access", {
    userId: user.id,
    databaseRole: role,
    destination: "/admin",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminTopNavbar />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
