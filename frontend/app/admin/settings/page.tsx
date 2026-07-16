export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600">Platform configuration and preferences</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="text-center text-slate-500">
          <p className="text-lg font-medium">Platform Settings</p>
          <p className="text-sm mt-2">
            Platform settings will be implemented in a future update.
          </p>
          <p className="text-sm mt-1">
            This may include configuration for notifications, system limits, and other platform-wide settings.
          </p>
        </div>
      </div>
    </div>
  );
}
