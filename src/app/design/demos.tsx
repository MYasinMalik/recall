"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Toast, ToastRegion } from "@/components/ui/overlay";
import { ChoiceOption, type ChoiceState } from "@/components/ui/study";

export function ThemeToggle() {
  const set = (theme: "light" | "dark") => {
    document.documentElement.dataset.theme = theme;
  };
  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => set("light")} icon={<Sun className="size-4" aria-hidden />}>
        Light
      </Button>
      <Button size="sm" onClick={() => set("dark")} icon={<Moon className="size-4" aria-hidden />}>
        Dark
      </Button>
    </div>
  );
}

const options = [
  "It can be written as a single formula.",
  "Every input gets exactly one output.",
  "Every output is reached by one input.",
  "Its outputs are all different.",
];
const answer = 1;

export function QuestionDemo() {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const stateFor = (i: number): ChoiceState => {
    if (!checked) return picked === i ? "selected" : "idle";
    if (i === answer) return "correct";
    if (i === picked) return "wrong";
    return "dimmed";
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="font-serif text-lg">What makes a rule a function?</p>
      <div role="radiogroup" aria-label="Answer options" className="flex flex-col gap-2">
        {options.map((o, i) => (
          <ChoiceOption
            key={o}
            letter={"ABCD"[i]}
            state={stateFor(i)}
            disabled={checked}
            onSelect={() => setPicked(i)}
          >
            {o}
          </ChoiceOption>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="primary" disabled={picked === null || checked} onClick={() => setChecked(true)}>
          Check
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setPicked(null);
            setChecked(false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

export function ToastDemo() {
  const [open, setOpen] = useState(false);
  return (
    <ToastRegion>
      <Button onClick={() => setOpen(true)}>Show toast</Button>
      <Toast open={open} onOpenChange={setOpen} title="Notes saved" />
    </ToastRegion>
  );
}
