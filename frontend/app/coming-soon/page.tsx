import type { Metadata } from "next";
import { Suspense } from "react";
import ComingSoonView from "@/components/ComingSoonView";

export const metadata: Metadata = {
  title: "Coming Soon — Medicare",
};

export default function ComingSoonPage() {
  return (
    <Suspense>
      <ComingSoonView />
    </Suspense>
  );
}
