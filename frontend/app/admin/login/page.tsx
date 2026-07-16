import type { Metadata } from "next";
import { Suspense } from "react";
import AdminLoginForm from "@/components/auth/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login — Medicare",
  description: "Sign in to Medicare Admin Portal",
};

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
