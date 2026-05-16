"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = [
  "Binary search and its edge cases",
  "How DNS resolves a domain name",
  "Photosynthesis at a high-school level",
  "The basics of options trading",
  "Recursion vs iteration in programming",
  "What a transformer model is, in plain English",
];

export default function TopicForm() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          studentName: studentName.trim() || undefined,
        }),
      });
      const data = (await res.json()) as
        | { sessionId: string; agentId: string }
        | { error: string };

      if (!res.ok || !("sessionId" in data)) {
        setError("error" in data ? data.error : "Could not start the session.");
        setLoading(false);
        return;
      }

      router.prefetch(`/session/${data.sessionId}`);
      router.push(`/session/${data.sessionId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error while starting the session.",
      );
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-2xl mx-auto rounded-2xl border border-ink-800/70 bg-ink-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/40"
    >
      <label className="block">
        <span className="text-sm font-medium text-ink-200">
          What do you want to learn?
        </span>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. How does Kalman filtering work"
          maxLength={300}
          rows={3}
          required
          className="mt-2 w-full rounded-xl border border-ink-700 bg-ink-950/80 px-4 py-3 text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
        />
      </label>

      <label className="block mt-4">
        <span className="text-sm font-medium text-ink-200">
          Your name <span className="text-ink-500">(optional)</span>
        </span>
        <input
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Name here"
          maxLength={60}
          className="mt-2 w-full rounded-xl border border-ink-700 bg-ink-950/80 px-4 py-3 text-ink-50 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </label>

      <div className="mt-5">
        <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">
          Need an idea?
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setTopic(s)}
              className="text-xs rounded-full border border-ink-700 px-3 py-1.5 text-ink-300 hover:text-ink-50 hover:border-ink-500 transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading || topic.trim().length < 2}
       className="mt-6 w-full rounded-xl px-5 py-3 font-semibold text-white border border-white/10 hover:border-fuchsia-400/50 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 transition bg-[radial-gradient(120%_120%_at_30%_0%,rgba(198, 72, 236, 0.25),rgb(8, 16, 36)_70%)]"
      >
        {loading ? "Setting up your tutor…" : "Start the lesson"}
      </button>

      <p className="mt-3 text-xs text-ink-500 text-center">
        The avatar will ask you a few short questions before teaching, then end
        the session once the topic is covered.
      </p>
    </form>
  );
}
