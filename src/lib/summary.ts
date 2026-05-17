import type { BeyCallMessage } from "./bey";

export interface LessonSummary {
  topic: string;
  totalMessages: number;
  studentMessages: number;
  tutorMessages: number;
  averageStudentWords: number;
  recommendedTopics: string[];
  transcript: Array<{
    sender: "ai" | "user";
    message: string;
    sentAt: string;
  }>;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractCoreTopic(topic: string): string {
  const cleaned = topic
    .replace(
      /^(how\s+(to|do(es)?|can|did)|what\s+(is|are|was|were)|why\s+(is|do(es)?|are)|introduction\s+to|intro\s+to|basics\s+of|the\s+basics\s+of|learn(ing)?|teach\s+me(\s+about)?|tell\s+me\s+about|explain)\s+/i,
      "",
    )
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/[.?!]+\s*$/, "")
    .trim();
  return cleaned.length > 0 ? cleaned : topic.trim();
}

export function generateRecommendedTopics(topic: string): string[] {
  const core = extractCoreTopic(topic);
  return [
    `Deep dive: advanced ${core} concepts and theory`,
    `Hands-on practice: build a small project applying ${core}`,
    `Common pitfalls and how to debug issues in ${core}`,
    `Best practices and design patterns for ${core}`,
    `Real-world case studies that use ${core}`,
    `${core} interview-style questions and self-review`,
  ];
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
    recommendedTopics: generateRecommendedTopics(topic),
    transcript: messages.map((m) => ({
      sender: m.sender,
      message: m.message,
      sentAt: m.sent_at,
    })),
  };
}
