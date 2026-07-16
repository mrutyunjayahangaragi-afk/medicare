import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

/**
 * Email link confirmation handler (used for password-reset links).
 * For Google OAuth the callback is handled by /auth/callback instead.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.error("[auth/confirm] OTP verification failed:", error.code);
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  // For password-reset type, send to update-password page
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/auth/update-password`);
  }

  // All other confirmations → dashboard
  return NextResponse.redirect(`${origin}/dashboard`);
}
