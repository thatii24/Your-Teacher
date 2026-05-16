import { NextRequest, NextResponse } from "next/server";
import { deleteAgent, listCallMessages, retrieveCall } from "@/lib/bey";
import { summarizeLesson } from "@/lib/summary";
import { getSession } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) {
    return NextResponse.json(
      { status: "not_found", error: "Session not found." },
      { status: 404 },
    );
  }

  try {
    const [call, messagesResult] = await Promise.all([
      retrieveCall(session.callId),
      listCallMessages(session.callId).catch(() => [] as Awaited<
        ReturnType<typeof listCallMessages>
      >),
    ]);
    const startedAt = call.status?.started_at;
    const endedAt = call.status?.ended_at;

    if (call.status?.type !== "completed" || !endedAt) {
      return NextResponse.json({
        status: "pending",
        reason:
          call.status?.type === "to_start"
            ? "Waiting for the call to start."
            : "The call has not ended yet.",
        topic: session.topic,
        callId: call.id,
      });
    }

    const messages = messagesResult;
    if (messages.length === 0) {
      return NextResponse.json({
        status: "pending",
        reason: "Transcript not ready yet.",
        topic: session.topic,
        callId: call.id,
      });
    }

    const summary = summarizeLesson(session.topic, messages);

    deleteAgent(session.agentId).catch((err) => {
      console.warn(
        `[summary] best-effort delete of agent ${session.agentId} failed:`,
        err instanceof Error ? err.message : err,
      );
    });

    return NextResponse.json({
      status: "ready",
      topic: session.topic,
      studentName: session.studentName,
      callId: call.id,
      durationSeconds:
        endedAt && startedAt
          ? Math.max(
              0,
              Math.round(
                (new Date(endedAt).getTime() - new Date(startedAt).getTime()) /
                  1000,
              ),
            )
          : null,
      messageCount: messages.length,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[GET /api/summary] failed:", message);
    return NextResponse.json(
      { status: "error", error: message },
      { status: 502 },
    );
  }
}
