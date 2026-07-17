/**
 * components/auth/DemoCredentials.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Displays demo login credentials in development mode ONLY.
 *
 * This component renders nothing in production.
 * Set NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true in .env.local to enable.
 *
 * NEVER ship real passwords here.  These are disposable demo accounts only.
 */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";

interface DemoAccount {
  role: string;
  email: string;
  password: string;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "Admin",      email: "admin@medicare.demo",      password: "Admin@123",     color: "text-purple-700 bg-purple-50 border-purple-200" },
  { role: "Hospital",   email: "hospital1@medicare.demo",  password: "Hospital@123",  color: "text-blue-700 bg-blue-50 border-blue-200"        },
  { role: "Responder",  email: "responder1@medicare.demo", password: "Responder@123", color: "text-green-700 bg-green-50 border-green-200"      },
  { role: "User",       email: "user1@medicare.demo",      password: "User@123",      color: "text-slate-700 bg-slate-50 border-slate-200"      },
];

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function DemoCredentials() {
  const [open, setOpen] = useState(false);

  // Only render in development (gate on env var as belt-and-suspenders)
  if (process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS !== "true") return null;

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs font-bold text-amber-700">
          <FlaskConical className="w-4 h-4" />
          Demo Accounts (development only)
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-amber-600" />
          : <ChevronDown className="w-4 h-4 text-amber-600" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-[10px] text-amber-600 mb-3">
            Click any email or password to copy it.
          </p>
          {DEMO_ACCOUNTS.map((a) => (
            <div key={a.role} className={`rounded-lg border px-3 py-2 text-xs ${a.color}`}>
              <span className="font-bold mr-2">{a.role}</span>
              <button
                type="button"
                className="underline mr-2 font-mono"
                onClick={() => copyText(a.email)}
                title="Click to copy"
              >
                {a.email}
              </button>
              <button
                type="button"
                className="underline font-mono"
                onClick={() => copyText(a.password)}
                title="Click to copy"
              >
                {a.password}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
