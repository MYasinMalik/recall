"use client";

import { FileText, Folder as FolderIcon, Library, Moon, Plus, Search, Settings, Sun, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog as RDialog } from "radix-ui";
import { useEffect, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { applyTheme, shownTheme } from "@/lib/theme";
import { useData } from "@/lib/use-data";

type Item = { id: string; label: string; detail?: string; icon: LucideIcon; run: () => void };

/** Search and jump: lessons, folders and the few actions worth a shortcut. Opens with Ctrl K or /. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const lessons = useData(() => (open ? data.listLessons({ query }) : Promise.resolve([])), [open, query]);
  const folders = useData(() => (open ? data.listFolders() : Promise.resolve([])), [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const go = (href: string) => () => router.push(href);
    const dark = open && shownTheme() === "dark";
    const actions: Item[] = [
      { id: "new", label: "New lesson", icon: Plus, run: go("/app/new") },
      { id: "all", label: "All lessons", icon: Library, run: go("/app") },
      { id: "settings", label: "Settings", icon: Settings, run: go("/app/settings") },
      {
        id: "theme",
        label: dark ? "Switch to light theme" : "Switch to dark theme",
        icon: dark ? Sun : Moon,
        run: () => applyTheme(dark ? "light" : "dark"),
      },
    ].filter((a) => !q || a.label.toLowerCase().includes(q));
    const lessonItems: Item[] = (lessons.value ?? []).slice(0, 7).map((l) => ({
      id: `l-${l.id}`,
      label: l.title,
      detail: l.sourceName,
      icon: FileText,
      run: go(`/app/n/${l.id}${l.status === "ready" ? "" : "/notes"}`),
    }));
    const folderItems: Item[] = (folders.value ?? [])
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .map((f) => ({ id: `f-${f.id}`, label: f.name, icon: FolderIcon, run: go(`/app/f/${f.id}`) }));
    const all = q
      ? [
          { label: "Lessons", items: lessonItems },
          { label: "Folders", items: folderItems },
          { label: "Actions", items: actions },
        ]
      : [
          { label: "Actions", items: actions },
          { label: "Recent lessons", items: lessonItems },
          { label: "Folders", items: folderItems },
        ];
    return all.filter((g) => g.items.length > 0);
  }, [query, lessons.value, folders.value, open, router]);

  const flat = groups.flatMap((g) => g.items);
  const current = flat[Math.min(active, flat.length - 1)];

  const choose = (item: Item | undefined) => {
    if (!item) return;
    onOpenChange(false);
    item.run();
  };

  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="overlay-scrim fixed inset-0 z-40 bg-text/45 backdrop-blur-[2px]" />
        <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
          <RDialog.Content
            aria-describedby={undefined}
            className="overlay-dialog pointer-events-auto flex max-h-[70vh] w-full max-w-140 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-pop"
          >
            <RDialog.Title className="sr-only">Search and jump</RDialog.Title>
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-5 shrink-0 text-muted" aria-hidden />
              <input
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={current ? `palette-${current.id}` : undefined}
                aria-label="Search lessons, folders and actions"
                value={query}
                autoFocus
                placeholder="Search lessons, or jump to…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => (a + 1) % Math.max(flat.length, 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => (a - 1 + flat.length) % Math.max(flat.length, 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    choose(current);
                  }
                }}
                className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div id="palette-list" role="listbox" aria-label="Results" className="overflow-y-auto p-2">
              {flat.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{query}”.</p>
              ) : null}
              {groups.map((g) => (
                <div key={g.label} role="group" aria-label={g.label}>
                  <p className="eyebrow px-3 pt-3 pb-1">{g.label}</p>
                  {g.items.map((item) => {
                    const selected = item === current;
                    return (
                      <div
                        key={item.id}
                        id={`palette-${item.id}`}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => setActive(flat.indexOf(item))}
                        onClick={() => choose(item)}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm",
                          selected ? "bg-accent-soft text-accent-text" : "text-text",
                        )}
                      >
                        <item.icon className="size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                        {item.detail ? (
                          <span className="hidden max-w-40 truncate text-xs text-muted sm:block">{item.detail}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> to move
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>Enter</Kbd> to open
              </span>
            </div>
          </RDialog.Content>
        </div>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
