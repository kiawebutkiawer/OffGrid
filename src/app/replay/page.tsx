import { Suspense } from "react";
import ReplayScorecard from "@/components/ReplayScorecard";

export default function ReplayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3EEFF] flex items-center justify-center font-mono text-sm text-[#24112B]">
          Decoding OffGrid Decision Replay scorecard...
        </div>
      }
    >
      <ReplayScorecard />
    </Suspense>
  );
}

