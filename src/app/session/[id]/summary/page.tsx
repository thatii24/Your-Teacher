"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ImprovementList from "@/components/ImprovementList";
import type { LessonAnalysis, StudentLevel } from "@/lib/openai";

interface ReadyResponse {
  status: "ready";
  topic: string;
  studentName?: string;
  callId: string;
  durationSeconds: number | null;
  messageCount: number;
  analysis: LessonAnalysis;
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

const LEVEL_LABEL: Record<StudentLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

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
      timer = setTimeout(poll, 4000);
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

  const { analysis, topic, durationSeconds, messageCount, studentName } = data;

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
        <Stat label="Level" value={LEVEL_LABEL[analysis.studentLevel]} />
        <Stat
          label="Duration"
          value={durationSeconds ? formatDuration(durationSeconds) : "—"}
        />
        <Stat label="Messages" value={String(messageCount)} />
        <Stat label="Topics covered" value={String(analysis.covered.length)} />
      </div>

      {analysis.summary ? (
        <div className="mb-6 rounded-2xl border border-ink-800/70 bg-ink-900/40 p-4 sm:p-5">
          <div className="text-xs uppercase tracking-wider text-ink-500 mb-1">
            How it went
          </div>
          <p className="text-ink-200 leading-relaxed">{analysis.summary}</p>
        </div>
      ) : null}

      {analysis.covered.length > 0 ? (
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">
            What we covered
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.covered.map((c, i) => (
              <span
                key={`${i}-${c}`}
                className="text-sm rounded-full border border-ink-700 bg-ink-900/60 px-3 py-1 text-ink-200"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <div className="text-xs uppercase tracking-wider text-ink-500 mb-2">
          Areas to explore next
        </div>
        <ImprovementList items={analysis.improvementAreas} />
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-400 px-5 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:opacity-95 transition"
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
