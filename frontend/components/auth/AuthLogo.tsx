import Link from "next/link";
import { Heart } from "lucide-react";

export default function AuthLogo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2.5 group"
      aria-label="Medicare — back to home"
    >
      <div className="relative flex items-center justify-center w-10 h-10 bg-red-500 rounded-xl shadow-lg shadow-red-200 group-hover:bg-red-600 transition-all duration-200 hover:scale-105 active:scale-95">
        <Heart className="w-5 h-5 text-white fill-white" />
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      </div>
      <div className="flex flex-col text-left leading-none">
        <span className="text-lg font-black text-slate-900 tracking-tight">
          Medi<span className="text-red-500">care</span>
        </span>
        <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
          We Care. We Help.
        </span>
      </div>
    </Link>
  );
}
