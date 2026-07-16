import type { Metadata } from "next";
import AuthLayout from "@/components/auth/AuthLayout";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password — Medicare",
  description: "Reset your Medicare account password. Enter your email and we'll send you reset instructions.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout showPanel={false}>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
