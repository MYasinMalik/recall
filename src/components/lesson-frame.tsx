"use client";

import { ChevronLeft, FileSearch, FileText, GraduationCap, Layers, ListChecks } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Banner, Skeleton } from "@/components/ui/surface";
import { cn } from "@/lib/cn";
import { data } from "@/lib/data";
import { useData } from "@/lib/use-data";

export function useLessonId() {
  return useParams<{ id: string }>().id;
}

export function LessonFrame({ children }: { children: ReactNode }) {
  const id = useLessonId();
  const pathname = usePathname();
  const lesson = useData(() => data.getLesson(id), [id]);
  const base = `/app/n/${id}`;
  const nav = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);

  // Slide the underline to whichever tab is current.
  useLayoutEffect(() => {
    const measure = () => {
      const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
      setBar(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pathname, lesson.value?.cardCount, lesson.value?.questionCount]);

  if (lesson.value === null) {
    return (
      <div className="mx-auto max-w-(--l-read) px-4 py-12">
        <Banner tone="danger" title="This lesson does not exist">
          It may have been deleted.{" "}
          <Link href="/app" className="underline underline-offset-4">
            Back to the library
          </Link>
        </Banner>
      </div>
    );
  }

  const l = lesson.value;
  const tabs = [
    { href: base, label: "Lesson", icon: GraduationCap, count: 0 },
    { href: `${base}/notes`, label: "Notes", icon: FileText, count: 0 },
    { href: `${base}/cards`, label: "Cards", icon: Layers, count: l?.cardCount ?? 0 },
    { href: `${base}/quiz`, label: "Quiz", icon: ListChecks, count: l?.questionCount ?? 0 },
    { href: `${base}/source`, label: "Source", icon: FileSearch, count: 0 },
  ];

  return (
    <div className="mx-auto max-w-(--l-workspace) px-4 pt-4 md:px-8 md:pt-6">
      <header>
        <Link
          href="/app"
          className="-ml-2 inline-flex h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted transition-colors duration-[var(--m-fast)] hover:bg-sunken hover:text-text"
        >
          <ChevronLeft className="size-4" aria-hidden /> Library
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {l ? (
            <h1 className="text-xl break-words">{l.title}</h1>
          ) : (
            <Skeleton className="h-8 w-3/5" />
          )}
          {l?.status === "generating" ? <Badge tone="accent">Writing…</Badge> : null}
          {l?.status === "failed" ? <Badge tone="danger">Stopped</Badge> : null}
        </div>
        <p className="mt-1 truncate text-sm text-muted">{l ? l.sourceName : " "}</p>
      </header>

      <nav
        ref={nav}
        aria-label="Lesson views"
        className="relative mt-4 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]"
      >
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-t-md px-3 text-sm",
                "transition-colors duration-[var(--m-fast)]",
                active ? "font-semibold text-text" : "font-medium text-muted hover:bg-sunken hover:text-text",
              )}
            >
              <t.icon className={cn("size-4", active && "text-accent")} aria-hidden />
              {t.label}
              {t.count > 0 ? (
                <span className="rounded-pill bg-sunken px-1.5 text-xs font-semibold text-muted">{t.count}</span>
              ) : null}
            </Link>
          );
        })}
        {bar ? (
          <span
            aria-hidden
            className="absolute bottom-0 left-0 h-0.5 w-px origin-left rounded-pill bg-accent transition-transform duration-[var(--m-slow)] ease-out"
            style={{ transform: `translateX(${bar.x}px) scaleX(${bar.w})` }}
          />
        ) : null}
      </nav>
      <div className="py-8">{children}</div>
    </div>
  );
}

/** Shown on Cards, Quiz and Lesson while notes are still being written. */
export function NotReadyNotice({ id }: { id: string }) {
  return (
    <div className="max-w-(--l-read)">
      <Banner
        tone="info"
        title="The notes are still being written"
        action={
          <ButtonLink href={`/app/n/${id}/notes`} size="sm">
            Watch them appear
          </ButtonLink>
        }
      >
        This view opens up once they are finished.
      </Banner>
    </div>
  );
}
