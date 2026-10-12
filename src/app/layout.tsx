import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Recall",
  description: "Turn a lecture into notes, a guided lesson, flashcards and quizzes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script
          // Applies a saved theme before first paint so the page does not flash.
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('recall.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
