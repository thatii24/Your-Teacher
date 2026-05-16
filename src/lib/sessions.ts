import { randomUUID } from "node:crypto";

export interface TutoringSession {
  id: string;
  agentId: string;
  callId: string;
  livekitUrl: string;
  livekitToken: string;
  topic: string;
  studentName?: string;
  createdAt: number;
}

interface Store {
  byId: Map<string, TutoringSession>;
}

const GLOBAL_KEY = "__projectTeach_sessions__" as const;

type GlobalWithStore = typeof globalThis & {
  [GLOBAL_KEY]?: Store;
};

function getStore(): Store {
  const g = globalThis as GlobalWithStore;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { byId: new Map<string, TutoringSession>() };
  }
  return g[GLOBAL_KEY]!;
}

export function createSession(
  input: Omit<TutoringSession, "id" | "createdAt">,
): TutoringSession {
  const session: TutoringSession = {
    id: randomUUID(),
    createdAt: Date.now(),
    ...input,
  };
  getStore().byId.set(session.id, session);
  return session;
}

export function getSession(id: string): TutoringSession | null {
  return getStore().byId.get(id) ?? null;
}

export function deleteSession(id: string): void {
  getStore().byId.delete(id);
}
