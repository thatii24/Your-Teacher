import type { BeyCallMessage } from "./bey";

export interface TranscriptHighlight {
  message: string;
  sentAt: string;
}

export interface LessonSummary {
  topic: string;
  totalMessages: number;
  studentMessages: number;
  tutorMessages: number;
  averageStudentWords: number;
  longestStudentResponses: TranscriptHighlight[];
  keyTutorExplanations: TranscriptHighlight[];
  transcript: Array<{
    sender: "ai" | "user";
    message: string;
    sentAt: string;
  }>;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function pickLongest(
  messages: BeyCallMessage[],
  limit: number,
): TranscriptHighlight[] {
  return [...messages]
    .sort((a, b) => wordCount(b.message) - wordCount(a.message))
    .slice(0, limit)
    .map((m) => ({ message: m.message, sentAt: m.sent_at }));
}

export function summarizeLesson(
  topic: string,
  messages: BeyCallMessage[],
): LessonSummary {
  const student = messages.filter((m) => m.sender === "user");
  const tutor = messages.filter((m) => m.sender === "ai");

  const totalStudentWords = student.reduce(
    (sum, m) => sum + wordCount(m.message),
    0,
  );
  const averageStudentWords =
    student.length > 0 ? Math.round(totalStudentWords / student.length) : 0;

  return {
    topic,
    totalMessages: messages.length,
    studentMessages: student.length,
    tutorMessages: tutor.length,
    averageStudentWords,
    longestStudentResponses: pickLongest(student, 3),
    keyTutorExplanations: pickLongest(tutor, 3),
    transcript: messages.map((m) => ({
      sender: m.sender,
      message: m.message,
      sentAt: m.sent_at,
    })),
  };
}
