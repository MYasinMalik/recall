"use client";

import { Folder as FolderIcon, FolderPlus, Library, Menu, Plus, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ButtonLink, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        "transition-colors duration-[var(--m-fast)]",
        active ? "bg-accent-soft font-medium text-accent-text" : "text-text hover:bg-sunken",
      )}
    >
      {children}
    </Link>
  );
}

function SidebarContent() {
  const pathname = usePathname();
  const folders = useData(() => data.listFolders(), []);
  const lessons = useData(() => data.listLessons(), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <Link href="/app" className="font-serif text-lg font-semibold">
        Recall
      </Link>

      <ButtonLink href="/app/new" variant="primary" icon={<Plus className="size-4" aria-hidden />}>
        New lesson
      </ButtonLink>

      <nav aria-label="Library" className="flex flex-col gap-1">
        <NavLink href="/app" active={pathname === "/app"}>
          <Library className="size-4 shrink-0" aria-hidden /> All lessons
        </NavLink>
      </nav>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Folders</p>
          <IconButton label="New folder" className="size-8" onClick={() => setAdding((a) => !a)}>
            <FolderPlus className="size-4" aria-hidden />
          </IconButton>
        </div>
        {adding ? (
          <form
            className="mb-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              await data.createFolder(name);
              setName("");
              setAdding(false);
            }}
          >
            <Input
              label="Folder name"
              value={name}
              autoFocus
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              hint="Press Enter to add."
            />
          </form>
        ) : null}
        {folders.value?.length === 0 && !adding ? (
          <p className="px-2 text-sm text-muted">No folders yet.</p>
        ) : null}
        {folders.value?.map((f) => (
          <NavLink key={f.id} href={`/app/f/${f.id}`} active={pathname === `/app/f/${f.id}`}>
            <FolderIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{f.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex min-h-0 flex-col gap-1">
        <p className="eyebrow">Recent</p>
        {lessons.loading ? (
          <div className="flex flex-col gap-2 px-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : null}
        {lessons.value?.slice(0, 8).map((l) => (
          <NavLink key={l.id} href={`/app/n/${l.id}`} active={pathname.startsWith(`/app/n/${l.id}`)}>
            <span className="truncate">{l.title}</span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto border-t border-border pt-4">
        <NavLink href="/app/settings" active={pathname === "/app/settings"}>
          <Settings className="size-4 shrink-0" aria-hidden /> Settings
        </NavLink>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[var(--l-sidebar)_1fr]">
      <header className="sticky top-0 z-20 flex h-(--l-header) items-center gap-2 border-b border-border bg-bg px-2 md:hidden">
        <IconButton label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
          <Menu className="size-5" aria-hidden />
        </IconButton>
        <Link href="/app" className="font-serif text-lg font-semibold">
          Recall
        </Link>
      </header>

      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface md:block">
        <SidebarContent />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-text/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-(--l-sidebar) max-w-[85vw] border-r border-border bg-surface shadow-pop">
            <IconButton label="Close menu" className="absolute top-2 right-2" onClick={() => setOpen(false)}>
              <X className="size-5" aria-hidden />
            </IconButton>
            <SidebarContent />
          </div>
        </div>
      ) : null}

      <main className="min-w-0">{children}</main>
    </div>
  );
}
