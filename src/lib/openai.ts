import OpenAI from "openai";
import type { BeyCallMessage } from "./bey";

export type StudentLevel = "beginner" | "intermediate" | "advanced";

export interface ImprovementArea {
  area: string;
  why: string;
  suggestedNextStep: string;
}

export interface LessonAnalysis {
  covered: string[];
  studentLevel: StudentLevel;
  improvementAreas: ImprovementArea[];
  summary: string;
}

const ANALYSIS_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local.",
    );
  }
  return new OpenAI({ apiKey });
}

function formatTranscript(messages: BeyCallMessage[]): string {
  return messages
    .map((m) => `${m.sender === "ai" ? "Tutor" : "Student"}: ${m.message}`)
    .join("\n");
}

export async function analyzeLesson(
  topic: string,
  messages: BeyCallMessage[],
): Promise<LessonAnalysis> {
  const transcript = formatTranscript(messages);

  const system = `You are an experienced learning coach. You will be given the transcript of a one-on-one voice tutoring session.
Your job is to review the transcript and produce a structured assessment of what the student learned and what they should study next.
Be honest, specific, and concrete. Do not invent things that did not happen in the transcript.`;

  const user = `The intended topic of this session was: "${topic}".

Transcript:
"""
${transcript || "(no transcript was captured)"}
"""

Return STRICT JSON with this exact shape and no extra commentary:
{
  "covered": string[],                 // 3-6 short phrases describing what was actually covered in the session
  "studentLevel": "beginner" | "intermediate" | "advanced",
  "summary": string,                   // 1-2 sentence summary of how the session went
  "improvementAreas": [                // 3-6 concrete things the student should study next to improve
    {
      "area": string,                  // short title, e.g. "Edge cases in binary search"
      "why": string,                   // 1 sentence why this matters for this student given the transcript
      "suggestedNextStep": string      // 1 concrete next action, e.g. "Work through 5 LeetCode problems on..."
    }
  ]
}`;

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: ANALYSIS_MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<LessonAnalysis>;
  try {
    parsed = JSON.parse(raw) as Partial<LessonAnalysis>;
  } catch {
    parsed = {};
  }

  return {
    covered: Array.isArray(parsed.covered) ? parsed.covered.slice(0, 8) : [],
    studentLevel:
      parsed.studentLevel === "beginner" ||
      parsed.studentLevel === "intermediate" ||
      parsed.studentLevel === "advanced"
        ? parsed.studentLevel
        : "beginner",
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    improvementAreas: Array.isArray(parsed.improvementAreas)
      ? parsed.improvementAreas
          .filter((a): a is ImprovementArea =>
            !!a &&
            typeof a.area === "string" &&
            typeof a.why === "string" &&
            typeof a.suggestedNextStep === "string",
          )
          .slice(0, 8)
      : [],
  };
}
