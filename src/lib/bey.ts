const BEY_BASE = "https://api.bey.dev";

export interface CreateAgentInput {
  name: string;
  avatarId: string;
  systemPrompt: string;
  greeting?: string;
  maxSessionLengthMinutes?: number;
  language?: string;
}

export interface BeyAgent {
  id: string;
  name: string;
  avatar_id: string;
  system_prompt: string;
}

export type BeyCallStatusType = "to_start" | "ongoing" | "completed";

export interface BeyCallStatus {
  type: BeyCallStatusType;
  started_at?: string;
  ended_at?: string;
}

export interface BeyCall {
  id: string;
  agent_id: string;
  user_name?: string | null;
  user_email?: string | null;
  tags?: Record<string, string>;
  status: BeyCallStatus;
}

export interface BeyCallMessage {
  message: string;
  sent_at: string;
  sender: "ai" | "user";
}

export interface BeyAvatar {
  id: string;
  name?: string;
}

function apiKey(): string {
  const key = process.env.BEY_API_KEY;
  if (!key) {
    throw new Error(
      "BEY_API_KEY is not set. Add it to .env.local (get one from https://app.bey.chat/settings).",
    );
  }
  return key;
}

async function beyFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${BEY_BASE}${path}`, {
    ...rest,
    headers: {
      "x-api-key": apiKey(),
      "content-type": "application/json",
      accept: "application/json",
      ...(headers as Record<string, string> | undefined),
    },
    body: json !== undefined ? JSON.stringify(json) : (rest.body as BodyInit | undefined),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `BeyondPresence API ${rest.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText} ${text}`,
    );
  }

  // DELETE may return 204 No Content.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function createAgent(input: CreateAgentInput): Promise<BeyAgent> {
  return beyFetch<BeyAgent>("/v1/agents", {
    method: "POST",
    json: {
      name: input.name.slice(0, 100),
      avatar_id: input.avatarId,
      system_prompt: input.systemPrompt.slice(0, 10000),
      greeting: input.greeting?.slice(0, 1000),
      max_session_length_minutes: input.maxSessionLengthMinutes ?? 20,
      language: input.language ?? "en",
    },
  });
}

export async function deleteAgent(agentId: string): Promise<void> {
  await beyFetch<void>(`/v1/agents/${agentId}`, { method: "DELETE" });
}

export async function listCallMessages(callId: string): Promise<BeyCallMessage[]> {
  return beyFetch<BeyCallMessage[]>(`/v1/calls/${callId}/messages`);
}

export interface CreatedCall extends BeyCall {
  livekit_url: string;
  livekit_token: string;
}

export async function createCall(
  agentId: string,
  opts: { livekitUsername?: string; tags?: Record<string, string> } = {},
): Promise<CreatedCall> {
  return beyFetch<CreatedCall>("/v1/calls", {
    method: "POST",
    json: {
      agent_id: agentId,
      livekit_username: opts.livekitUsername?.slice(0, 100) || "Student",
      ...(opts.tags ? { tags: opts.tags } : {}),
    },
  });
}

export async function retrieveCall(callId: string): Promise<BeyCall> {
  return beyFetch<BeyCall>(`/v1/calls/${callId}`);
}

interface AvatarCache {
  avatars: BeyAvatar[];
  expiresAt: number;
}
let avatarCache: AvatarCache | null = null;
const AVATAR_CACHE_MS = 5 * 60 * 1000;

export async function getCachedAvatars(): Promise<BeyAvatar[]> {
  if (avatarCache && avatarCache.expiresAt > Date.now()) {
    return avatarCache.avatars;
  }
  const avatars = await listAvatars();
  avatarCache = { avatars, expiresAt: Date.now() + AVATAR_CACHE_MS };
  return avatars;
}

export async function listAvatars(): Promise<BeyAvatar[]> {
  const payload = await beyFetch<unknown>("/v1/avatars");
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is BeyAvatar =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof (item as { id: unknown }).id === "string",
    );
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: unknown[] }).data.filter(
      (item): item is BeyAvatar =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof (item as { id: unknown }).id === "string",
    );
  }

  throw new Error("Unexpected /v1/avatars response format from BeyondPresence API.");
}
