"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { LessonSummary } from "@/lib/summary";

interface ReadyResponse {
  status: "ready";
  topic: string;
  studentName?: string;
  callId: string;
  durationSeconds: number | null;
  messageCount: number;
  summary: LessonSummary;
}

interface PendingResponse {
  status: "pending";
  reason?: string;
  topic?: string;
}

interface ErrorResponse {
  status: "error";
  error?: string;
}

interface NotFoundResponse {
  status: "not_found";
  error?: string;
}

type SummaryResponse =
  | ReadyResponse
  | PendingResponse
  | ErrorResponse
  | NotFoundResponse;

export default function SummaryPage() {
  const params = useParams<{ id: string }>();
  const sessionId = typeof params?.id === "string" ? params.id : "";
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [attempts, setAttempts] = useState(0);
  const stopRef = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setData({ status: "not_found", error: "Session id is missing." });
      return;
    }
    stopRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const POLL_DELAYS = [800, 1200, 1800, 2500, 3500, 5000];
    let nextAttempt = 0;

    async function poll() {
      if (stopRef.current) return;
      try {
        const res = await fetch(`/api/summary/${sessionId}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as SummaryResponse;
        if (stopRef.current) return;
        setData(json);
        setAttempts((n) => n + 1);

        if (json.status === "ready" || json.status === "not_found") {
          return;
        }
      } catch {
        if (stopRef.current) return;
        setAttempts((n) => n + 1);
      }
      const delay =
        POLL_DELAYS[Math.min(nextAttempt, POLL_DELAYS.length - 1)];
      nextAttempt += 1;
      timer = setTimeout(poll, delay);
    }

    poll();

    return () => {
      stopRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  if (!data) {
    return <LoadingState message="Fetching your session..." />;
  }

  if (data.status === "not_found") {
    return (
      <ErrorState
        title="Session not found"
        description="This session no longer exists. Start a new one from the home page."
      />
    );
  }

  if (data.status === "error") {
    return (
      <ErrorState
        title="Something went wrong"
        description={data.error ?? "Please try again in a moment."}
      />
    );
  }

  if (data.status === "pending") {
    return (
      <LoadingState
        message={
          data.reason ??
          "Waiting for the call transcript to be ready. This usually takes a few seconds after you end the call."
        }
        attempts={attempts}
      />
    );
  }

  const { summary, topic, durationSeconds, messageCount, studentName } = data;

  return (
    <div className="pt-4 sm:pt-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-ink-500">
          Session summary
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-white to-ink-300 bg-clip-text text-transparent">
          {topic}
        </h1>
        {studentName ? (
          <div className="mt-1 text-sm text-ink-400">
            Nice work, {studentName}.
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Duration"
          value={durationSeconds ? formatDuration(durationSeconds) : "—"}
        />
        <Stat label="Messages" value={String(messageCount)} />
        <Stat label="You said" value={String(summary.studentMessages)} />
        <Stat label="Tutor said" value={String(summary.tutorMessages)} />
      </div>

      {summary.recommendedTopics.length > 0 ? (
        <Section title="Recommended next topics">
          <ol className="space-y-3">
            {summary.recommendedTopics.map((rec, idx) => (
              <li
                key={`${idx}-${rec}`}
                className="rounded-2xl border border-ink-800/70 bg-ink-900/40 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white border border-fuchsia-400/30 shadow-md shadow-fuchsia-500/20 bg-[radial-gradient(120%_120%_at_30%_0%,rgba(198,72,236,0.85),rgb(15,23,42)_85%)]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 text-sm text-ink-100 leading-relaxed">
                    {rec}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-ink-500">
            A mix of theory and practical paths that build on what you just
            covered.
          </p>
        </Section>
      ) : null}

      <Section title="Full transcript">
        <div className="rounded-2xl border border-ink-800/70 bg-ink-900/40 divide-y divide-ink-800/70 max-h-[520px] overflow-y-auto">
          {summary.transcript.map((m, i) => (
            <div key={i} className="px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-1">
                {m.sender === "ai" ? "Tutor" : "You"} ·{" "}
                {new Date(m.sentAt).toLocaleTimeString()}
              </div>
              <div className="text-sm text-ink-200 leading-relaxed whitespace-pre-wrap">
                {m.message}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-[radial-gradient(120%_120%_at_30%_0%,rgba(198, 72, 236, 0.25),rgb(8, 16, 36)_70%)] px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-95 transition"
        >
          Start a new lesson
        </Link>
        <Link
          href={`/session/${sessionId}`}
          className="inline-flex items-center justify-center rounded-xl border border-ink-700 bg-ink-900 px-5 py-3 font-medium text-ink-100 hover:bg-ink-800 transition"
        >
          Back to the tutor
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-800/70 bg-ink-900/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-ink-500">
        {label}
      </div>
      <div className="mt-1 font-medium text-ink-100">{value}</div>
    </div>
  );
}

function LoadingState({
  message,
  attempts,
}: {
  message: string;
  attempts?: number;
}) {
  return (
    <div className="pt-16 max-w-xl mx-auto text-center">
      <div className="mx-auto size-10 rounded-full border-2 border-ink-700 border-t-indigo-400 animate-spin" />
      <h2 className="mt-5 text-xl font-medium text-ink-100">Preparing your feedback</h2>
      <p className="mt-2 text-sm text-ink-400 leading-relaxed">{message}</p>
      {attempts && attempts > 1 ? (
        <p className="mt-2 text-xs text-ink-500">
          Still working... checked {attempts} times.
        </p>
      ) : null}
    </div>
  );
}

function ErrorState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="pt-16 max-w-xl mx-auto text-center">
      <h2 className="text-xl font-semibold text-ink-100">{title}</h2>
      <p className="mt-2 text-sm text-ink-400">{description}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-xl border border-ink-700 bg-ink-900 px-4 py-2.5 text-sm font-medium text-ink-100 hover:bg-ink-800 transition"
      >
        Back to home
      </Link>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
