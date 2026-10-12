import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { cn } from "@/lib/cn";

/** Anchor id for a heading, shared by the rendered notes and their table of contents. */
export function headingId(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section"
  );
}

function plainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return plainText(node.props.children);
  return "";
}

/** Renders model-written Markdown with tables, code and math. Raw HTML in the source is not rendered. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-note", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h2: ({ children: heading }) => <h2 id={headingId(plainText(heading))}>{heading}</h2>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
