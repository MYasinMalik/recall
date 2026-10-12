"use client";

import { Folder as FolderIcon, FolderPlus, Library, Menu, Moon, Plus, Search, Settings, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as RDialog } from "radix-ui";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { Logo } from "@/components/logo";
import { ButtonLink, IconButton, Kbd } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { applyTheme, shownTheme } from "@/lib/theme";
import { useData } from "@/lib/use-data";

function NavLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm",
        "transition-colors duration-[var(--m-fast)]",
        active ? "bg-accent-soft font-semibold text-accent-text" : "font-medium text-muted hover:bg-sunken hover:text-text",
      )}
    >
      {children}
    </Link>
  );
}

function ThemeButton() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(shownTheme() === "dark"), []);
  return (
    <IconButton
      label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => {
        applyTheme(dark ? "light" : "dark");
        setDark(!dark);
      }}
    >
      {dark ? <Sun className="size-4.5" aria-hidden /> : <Moon className="size-4.5" aria-hidden />}
    </IconButton>
  );
}

function SidebarContent({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  const folders = useData(() => data.listFolders(), []);
  const lessons = useData(() => data.listLessons(), []);
  const me = useData(() => data.me(), []);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      <Link href="/app" className="flex h-10 items-center rounded-md px-1">
        <Logo />
      </Link>

      <div className="flex flex-col gap-2">
        <ButtonLink href="/app/new" variant="primary" icon={<Plus className="size-4" aria-hidden />}>
          New lesson
        </ButtonLink>
        <button
          type="button"
          onClick={onSearch}
          className={cn(
            "flex h-11 items-center gap-2.5 rounded-md border border-border bg-bg px-3 text-sm text-muted",
            "transition-colors duration-[var(--m-fast)] hover:border-border-input hover:text-text",
          )}
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">Search</span>
          <Kbd>Ctrl K</Kbd>
        </button>
      </div>

      <nav aria-label="Library" className="flex flex-col gap-0.5">
        <NavLink href="/app" active={pathname === "/app"}>
          <Library className="size-4 shrink-0" aria-hidden /> All lessons
        </NavLink>
      </nav>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between pl-2.5">
          <p className="eyebrow">Folders</p>
          <IconButton label="New folder" className="size-9" aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
            <FolderPlus className="size-4" aria-hidden />
          </IconButton>
        </div>
        {adding ? (
          <form
            className="anim-rise mb-2"
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
              hideLabel
              placeholder="Folder name"
              value={name}
              autoFocus
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
              hint="Enter to add, Esc to cancel."
            />
          </form>
        ) : null}
        {folders.value?.length === 0 && !adding ? (
          <p className="px-2.5 py-1 text-sm text-muted">No folders yet.</p>
        ) : null}
        {folders.value?.map((f) => (
          <NavLink key={f.id} href={`/app/f/${f.id}`} active={pathname === `/app/f/${f.id}`}>
            <FolderIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{f.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex min-h-0 flex-col gap-0.5">
        <p className="eyebrow px-2.5 pb-1">Recent</p>
        {lessons.loading ? (
          <div className="flex flex-col gap-3 px-2.5 py-1">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : null}
        {lessons.value?.slice(0, 6).map((l) => (
          <NavLink key={l.id} href={`/app/n/${l.id}`} active={pathname.startsWith(`/app/n/${l.id}`)}>
            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-pill",
                l.status === "generating" ? "animate-pulse bg-accent" : l.status === "failed" ? "bg-danger" : "bg-border-input",
              )}
            />
            <span className="truncate">{l.title}</span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-1 border-t border-border pt-3">
        <Link
          href="/app/settings"
          aria-current={pathname === "/app/settings" ? "page" : undefined}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-sm",
            "transition-colors duration-[var(--m-fast)] hover:bg-sunken",
            pathname === "/app/settings" && "bg-sunken",
          )}
        >
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-accent-soft text-xs font-bold text-accent-text"
          >
            {me.value?.name.trim().charAt(0).toUpperCase() || <Settings className="size-3.5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{me.value?.name ?? "Settings"}</span>
            <span className="block truncate text-xs text-muted">Settings</span>
          </span>
        </Link>
        <ThemeButton />
      </div>
    </div>
  );
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement ||
  (target instanceof HTMLElement && target.isContentEditable);

export function AppShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setMenu(false), [pathname]);

  // Ctrl K or / opens search; N starts a new lesson.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      // Leave single-key shortcuts alone while a dialog is asking something.
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === "/") {
        e.preventDefault();
        setPalette(true);
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/app/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const search = () => {
    setMenu(false);
    setPalette(true);
  };

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[var(--l-sidebar)_1fr]">
      <header className="sticky top-0 z-20 flex h-(--l-header) items-center gap-1 border-b border-border bg-bg/85 px-2 backdrop-blur md:hidden">
        <IconButton label="Open menu" aria-expanded={menu} onClick={() => setMenu(true)}>
          <Menu className="size-5" aria-hidden />
        </IconButton>
        <Link href="/app" className="flex-1">
          <Logo />
        </Link>
        <IconButton label="Search" onClick={search}>
          <Search className="size-5" aria-hidden />
        </IconButton>
        <Link
          href="/app/new"
          aria-label="New lesson"
          className="flex size-11 items-center justify-center rounded-md bg-accent text-on-accent active:scale-[0.94]"
        >
          <Plus className="size-5" aria-hidden />
        </Link>
      </header>

      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface md:block">
        <SidebarContent onSearch={search} />
      </aside>

      <RDialog.Root open={menu} onOpenChange={setMenu}>
        <RDialog.Portal>
          <RDialog.Overlay className="overlay-scrim fixed inset-0 z-30 bg-text/45 md:hidden" />
          <RDialog.Content
            aria-describedby={undefined}
            className="overlay-drawer fixed inset-y-0 left-0 z-40 w-(--l-sidebar) max-w-[85vw] border-r border-border bg-surface shadow-pop md:hidden"
          >
            <RDialog.Title className="sr-only">Menu</RDialog.Title>
            <RDialog.Close asChild>
              <IconButton label="Close menu" className="absolute top-3 right-2">
                <X className="size-5" aria-hidden />
              </IconButton>
            </RDialog.Close>
            <SidebarContent onSearch={search} />
          </RDialog.Content>
        </RDialog.Portal>
      </RDialog.Root>

      <CommandPalette open={palette} onOpenChange={setPalette} />

      <main className="min-w-0">{children}</main>
    </div>
  );
}
