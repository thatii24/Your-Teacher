import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "projectTeach — Adaptive Avatar Tutor",
  description:
    "Tell an AI avatar what you want to learn. It asks you questions, teaches adaptively, and tells you what to study next.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full">
        <div className="min-h-screen flex flex-col">
          <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
            <a href="/" className="flex items-center gap-2 group">
              <div className="size-8 rounded-lg bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-emerald-400 shadow-lg shadow-indigo-500/20" />
              <span className="font-semibold tracking-tight">projectTeach</span>
            </a>
            <a
              href="https://docs.bey.dev"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-ink-400 hover:text-ink-100 transition"
            >
              powered by BeyondPresence
            </a>
          </header>
          <main className="flex-1 px-6 pb-12 max-w-6xl mx-auto w-full">{children}</main>
          <footer className="px-6 py-6 text-center text-xs text-ink-500">
            Made for curious learners. One topic at a time.
          </footer>
        </div>
      </body>
    </html>
  );
}
