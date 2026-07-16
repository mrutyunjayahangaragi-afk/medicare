import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Medicare",
  description: "Privacy Policy for Medicare emergency response platform.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/60 via-white to-rose-50/40 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-red-500 transition-colors mb-8"
        >
          ← Back to Home
        </Link>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_40px_rgba(15,23,42,0.08)] p-8 sm:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-6">Privacy Policy</h1>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
              <p className="text-slate-600 mb-3">
                Medicare collects the following types of information:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2">
                <li>Personal information (name, email, phone number)</li>
                <li>Location data (with your consent)</li>
                <li>Emergency request details</li>
                <li>Authentication and usage data</li>
                <li>Device and browser information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
              <p className="text-slate-600 mb-3">
                We use your information to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2">
                <li>Provide emergency response services</li>
                <li>Connect you with healthcare providers</li>
                <li>Improve our services</li>
                <li>Ensure platform security</li>
                <li>Communicate with you about your requests</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Sharing</h2>
              <p className="text-slate-600">
                We share your information with:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2">
                <li>Healthcare providers and hospitals (for emergency response)</li>
                <li>Emergency responders (when you request assistance)</li>
                <li>Service providers (to operate our platform)</li>
                <li>Legal authorities (when required by law)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Data Security</h2>
              <p className="text-slate-600">
                We implement industry-standard security measures to protect your data, including 
                encryption, secure authentication, and regular security audits. However, no method of 
                transmission over the internet is completely secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Your Rights</h2>
              <p className="text-slate-600 mb-3">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Opt out of non-essential data collection</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Location Data</h2>
              <p className="text-slate-600">
                We collect location data only with your explicit consent to provide emergency response 
                services. You can revoke location access at any time through your device settings.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Children's Privacy</h2>
              <p className="text-slate-600">
                Medicare is not intended for children under 13. We do not knowingly collect personal 
                information from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Changes to This Policy</h2>
              <p className="text-slate-600">
                We may update this privacy policy from time to time. We will notify you of significant 
                changes by posting the new policy on our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Contact Us</h2>
              <p className="text-slate-600">
                For questions about this privacy policy or your personal data, please contact us 
                through our support channels.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
