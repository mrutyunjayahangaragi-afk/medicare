import type { Metadata } from "next";
import UpdatePasswordForm from "@/components/auth/UpdatePasswordForm";
import AuthLayout from "@/components/auth/AuthLayout";

export const metadata: Metadata = {
  title: "Update Password — Medicare",
  description: "Set a new password for your Medicare account.",
};

export default function UpdatePasswordPage() {
  return (
    <AuthLayout showPanel={false}>
      <UpdatePasswordForm />
    </AuthLayout>
  );
}
