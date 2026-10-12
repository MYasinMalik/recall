import type { ReactNode } from "react";

/** Remounts on every tab change, so each lesson view fades up into place. */
export default function LessonViewTemplate({ children }: { children: ReactNode }) {
  return <div className="anim-rise">{children}</div>;
}
