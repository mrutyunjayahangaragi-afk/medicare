import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Medicare",
  description: "Terms of Service for Medicare emergency response platform.",
};

export default function TermsPage() {
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
          <h1 className="text-3xl font-black text-slate-900 mb-6">Terms of Service</h1>
          
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-600 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-600">
                By accessing and using Medicare, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Purpose of Service</h2>
              <p className="text-slate-600">
                Medicare is an emergency response platform designed to connect users with healthcare 
                services, hospitals, and emergency responders. The service is intended for legitimate 
                emergency situations and healthcare needs.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Responsibilities</h2>
              <ul className="list-disc list-inside text-slate-600 space-y-2">
                <li>Use the service only for legitimate emergency situations</li>
                <li>Provide accurate and truthful information</li>
                <li>Do not misuse the service for non-emergency purposes</li>
                <li>Respect healthcare providers and responders</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Emergency Services</h2>
              <p className="text-slate-600">
                Medicare facilitates connections with emergency services but does not guarantee 
                immediate response. For life-threatening emergencies, always call your local 
                emergency number directly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Privacy and Data</h2>
              <p className="text-slate-600">
                Your use of Medicare is also governed by our Privacy Policy. By using our service, 
                you consent to the collection and use of your information as described in our 
                Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Limitation of Liability</h2>
              <p className="text-slate-600">
                Medicare is provided on an "as is" basis. We make no warranties regarding the 
                availability, accuracy, or reliability of the service. We are not liable for any 
                damages arising from the use or inability to use our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Modifications</h2>
              <p className="text-slate-600">
                We reserve the right to modify these terms at any time. Continued use of the 
                service after modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Contact</h2>
              <p className="text-slate-600">
                For questions about these Terms of Service, please contact us through our support channels.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
