import { NextResponse } from "next/server";
import { createAgent, createCall, deleteAgent, listAvatars } from "@/lib/bey";
import { buildTeachingPrompt } from "@/lib/prompt";
import { createSession } from "@/lib/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateSessionBody {
  topic?: string;
  studentName?: string;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function POST(req: Request) {
  let body: CreateSessionBody;
  try {
    body = (await req.json()) as CreateSessionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = body.topic?.trim();
  const studentName = body.studentName?.trim() || undefined;

  if (!topic || topic.length < 2) {
    return NextResponse.json(
      { error: "Please provide a topic to learn." },
      { status: 400 },
    );
  }
  if (topic.length > 300) {
    return NextResponse.json(
      { error: "Topic is too long. Keep it under 300 characters." },
      { status: 400 },
    );
  }

  let avatarId = process.env.BEY_DEFAULT_AVATAR_ID?.trim();
  if (avatarId && !isUuidLike(avatarId)) {
    console.warn(
      `[POST /api/sessions] Ignoring invalid BEY_DEFAULT_AVATAR_ID value: ${avatarId.slice(0, 24)}...`,
    );
    avatarId = undefined;
  }
  if (!avatarId) {
    console.info(
      "[POST /api/sessions] BEY_DEFAULT_AVATAR_ID missing; attempting automatic avatar discovery.",
    );
    try {
      const avatars = await listAvatars();
      avatarId = avatars[0]?.id;
      if (avatarId) {
        console.info(
          `[POST /api/sessions] Auto-selected BeyondPresence avatar: ${avatarId}`,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      console.error(
        `[POST /api/sessions] Automatic avatar discovery failed: ${message}`,
      );
      return NextResponse.json(
        {
          error: `Server could not resolve a BeyondPresence avatar automatically: ${message}`,
        },
        { status: 500 },
      );
    }
  }

  if (!avatarId) {
    console.error(
      "[POST /api/sessions] No avatar available. Create one in BeyondPresence or set BEY_DEFAULT_AVATAR_ID.",
    );
    return NextResponse.json(
      {
        error:
          "No BeyondPresence avatars were found for this API key. Create an avatar in the dashboard or set BEY_DEFAULT_AVATAR_ID in .env.local.",
      },
      { status: 500 },
    );
  }

  const systemPrompt = buildTeachingPrompt({ topic, studentName });
  const greeting = studentName
    ? `Hi ${studentName}! I'm here to teach you about ${topic}. First, let me ask a couple of quick questions so I can tailor this to you.`
    : `Hi! I'm here to teach you about ${topic}. First, let me ask a couple of quick questions so I can tailor this to you.`;

  let createdAgentId: string | null = null;
  try {
    const agent = await createAgent({
      name: `Tutor: ${topic}`.slice(0, 100),
      avatarId,
      systemPrompt,
      greeting,
      maxSessionLengthMinutes: 20,
      language: "en",
    });
    createdAgentId = agent.id;

    const call = await createCall(agent.id, {
      livekitUsername: studentName || "Student",
    });

    const session = createSession({
      agentId: agent.id,
      callId: call.id,
      livekitUrl: call.livekit_url,
      livekitToken: call.livekit_token,
      topic,
      studentName,
    });

    return NextResponse.json({
      sessionId: session.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[POST /api/sessions] failed:", message);
    if (createdAgentId) {
      deleteAgent(createdAgentId).catch(() => {});
    }
    return NextResponse.json(
      { error: `Could not create tutor: ${message}` },
      { status: 502 },
    );
  }
}
