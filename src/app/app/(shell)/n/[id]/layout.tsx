import type { ReactNode } from "react";
import { LessonFrame } from "@/components/lesson-frame";

export default function LessonLayout({ children }: { children: ReactNode }) {
  return <LessonFrame>{children}</LessonFrame>;
}
