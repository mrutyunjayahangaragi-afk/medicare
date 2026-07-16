import { redirect } from "next/navigation";

// /account is now superseded by /dashboard
export default function AccountPage() {
  redirect("/dashboard");
}
