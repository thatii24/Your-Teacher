import { notFound } from "next/navigation";
import SessionRoom from "@/components/SessionRoom";
import { getSession } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default function SessionPage({ params }: { params: { id: string } }) {
  const session = getSession(params.id);
  if (!session) notFound();

  return (
    <div className="pt-4 sm:pt-6">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-wider text-ink-500">
          Today's lesson
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink-50 mt-1">
          {session.topic}
        </h1>
        {session.studentName ? (
          <div className="mt-1 text-sm text-ink-400">
            Hi {session.studentName}, your tutor is ready.
          </div>
        ) : null}
      </div>

      <SessionRoom
        sessionId={session.id}
        livekitUrl={session.livekitUrl}
        livekitToken={session.livekitToken}
      />

      <div className="mt-5 grid sm:grid-cols-2 gap-3">
        <Tip title="Speak or type">
          Talk through your microphone or type answers in the box below the
          video. Use Mute if you need a quiet moment.
        </Tip>
        <Tip title="Click End session when you're done">
          When the tutor says the session is complete, or whenever you want to
          stop, click <span className="text-ink-100">End session</span>. You'll
          get a written summary on the next page.
        </Tip>
      </div>
    </div>
  );
}

function Tip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-800/70 bg-ink-900/40 p-4">
      <div className="text-sm font-medium text-ink-100">{title}</div>
      <div className="text-sm text-ink-400 mt-1 leading-relaxed">{children}</div>
    </div>
  );
}
