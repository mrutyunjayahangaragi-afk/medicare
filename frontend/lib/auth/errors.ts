/**
 * Maps raw Supabase auth error messages to user-friendly strings.
 * Never expose internal Supabase details or raw error text to the UI.
 */
export function getAuthErrorMessage(error: { message?: string; code?: string } | null): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  // OTP-specific
  if (code === "otp_expired" || msg.includes("otp has expired") || msg.includes("otp_expired")) {
    return "The verification code has expired. Please request a new one.";
  }
  if (code === "otp_disabled") {
    return "Email OTP is not enabled. Please contact support.";
  }
  if (
    msg.includes("token is invalid") ||
    msg.includes("invalid token") ||
    msg.includes("invalid otp") ||
    code === "token_invalid"
  ) {
    return "Incorrect verification code. Please check and try again.";
  }

  // Login
  if (msg.includes("invalid login credentials") || code === "invalid_credentials") {
    return "Incorrect email or password. Please try again.";
  }
  if (msg.includes("email not confirmed")) {
    return "Your email address has not been verified yet.";
  }

  // Registration
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (msg.includes("password should be at least")) {
    return "Your password is too weak. Use at least 8 characters with uppercase, lowercase, and a number.";
  }

  // Link / token expiry (password reset, etc.)
  if (msg.includes("token has expired")) {
    return "This link has expired. Please request a new one.";
  }

  // OAuth
  if (msg.includes("oauth") || msg.includes("provider")) {
    return "Google sign-in failed or was cancelled. Please try again.";
  }

  // Network
  if (msg.includes("network") || msg.includes("fetch failed")) {
    return "Network error. Please check your connection and try again.";
  }

  // Config
  if (msg.includes("supabase") || msg.includes("missing")) {
    return "Service configuration error. Please contact support.";
  }

  return "Something went wrong. Please try again.";
}
