import { Suspense } from "react";
import { CiStudio } from "@/components/ci/ci-studio";

export const metadata = { title: "CI Studio (CrewAI)" };

export default function CiStudioPage() {
  return (
    <Suspense fallback={null}>
      <CiStudio />
    </Suspense>
  );
}
