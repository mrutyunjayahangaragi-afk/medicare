"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Signing out…</>
      ) : (
        <><LogOut className="w-4 h-4" /> Sign Out</>
      )}
    </button>
  );
}
