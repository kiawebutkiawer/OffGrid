import { Suspense } from "react";
import SimWorkspace from "@/components/SimWorkspace";

export default function SimPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F6F5F9] flex items-center justify-center font-mono text-sm text-[#24112B]">
          Connecting to OffGrid ap-south-1 war-room terminal...
        </div>
      }
    >
      <SimWorkspace />
    </Suspense>
  );
}

