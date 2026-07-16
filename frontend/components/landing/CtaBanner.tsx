"use client";

import { Bell, Smartphone } from "lucide-react";

interface CtaBannerProps {
  onRequestHelp?: () => void;
}

export default function CtaBanner({ onRequestHelp }: CtaBannerProps) {
  return (
    <section className="py-12 lg:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="cta-banner flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="cta-banner__title">
                Every Second Matters. We&apos;re Always Ready.
              </h3>
              <p className="cta-banner__desc mt-2">
                Medicare is here for you 24/7 — one tap away from emergency support.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRequestHelp}
            suppressHydrationWarning
            className="cta-banner__btn relative z-10 flex-shrink-0"
          >
            <Bell className="w-4 h-4 text-primary" />
            Request Help Now
          </button>

          <svg
            className="cta-banner__ecg"
            viewBox="0 0 400 80"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M0 40 H80 L90 20 L100 60 L110 30 L120 50 L130 40 H400" />
          </svg>
        </div>
      </div>
    </section>
  );
}
