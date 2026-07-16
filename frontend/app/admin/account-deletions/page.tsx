import { createClient } from "@/lib/supabase/server";

export default async function AdminAccountDeletionsPage() {
  const supabase = await createClient();

  // Placeholder - account deletion requests table doesn't exist yet
  // This will be implemented when the account deletion workflow is added

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Deletion Requests</h1>
        <p className="text-slate-600">Review and manage account deletion requests</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="text-center text-slate-500">
          <p className="text-lg font-medium">Account deletion requests</p>
          <p className="text-sm mt-2">
            This feature will be implemented when the account deletion workflow is added.
          </p>
        </div>
      </div>
    </div>
  );
}
