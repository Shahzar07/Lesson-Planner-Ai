import type { Metadata } from "next";
import Planner from "@/components/planner/Planner";

export const metadata: Metadata = {
  title: "Lesson planner",
  description:
    "Generate a B.Ed-standard lesson plan for Cambridge, Sindh Board, Oxford or FBISE, in English or Urdu.",
};

export default function PlanPage() {
  return <Planner />;
}
