# projectTeach — Adaptive Teaching Avatar

A Next.js app where a student types a topic, a [BeyondPresence](https://docs.bey.dev)
avatar tutor adaptively teaches it (asking diagnostic and check-for-understanding
questions), ends the session once the topic is covered, then shows the student a
deterministic, transcript-driven summary built directly from BeyondPresence call data.

## How it works

1. Student types a topic (and optionally their name) on the landing page.
2. The server creates a one-off BeyondPresence agent with a system prompt that
   encodes an adaptive teaching protocol (diagnose → adapt → teach → check →
   stop with a verbal list of areas to improve).
3. The session page embeds the avatar via `https://bey.chat/{agent-id}` in an
   iframe.
4. When the student clicks "I'm done — see my feedback", the summary page polls
   the server, which fetches the call transcript from BeyondPresence and builds
   a deterministic summary (message counts, durations, longest student responses,
   key tutor explanations, full transcript) — no external LLM call.
5. The student sees their session stats, highlights, and the complete transcript.

## Prerequisites

- Node.js 18.18 or newer
- A [BeyondPresence](https://app.bey.chat) account with API key + at least one
  avatar

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env example and fill in your keys:

   ```bash
   cp .env.example .env.local
   ```

   Then edit `.env.local`:

   ```
   BEY_API_KEY=...                # from https://app.bey.chat/settings (API Keys tab)
   BEY_DEFAULT_AVATAR_ID=...      # optional, see below
   ```

3. Optional: **pick an avatar UUID** for `BEY_DEFAULT_AVATAR_ID`:

   - If omitted, the server automatically picks the first avatar available to
     your API key.
   - Easiest manual option: open the [BeyondPresence dashboard](https://app.bey.chat) and pick
     a default avatar — its UUID appears in the URL when you select it.
   - Or call the List Avatars endpoint:
     ```bash
     curl -H "x-api-key: $BEY_API_KEY" https://api.bey.dev/v1/avatars
     ```
     and copy the `id` of any avatar you want to use.

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Usage

- On the home page, type any topic ("Binary search and its edge cases",
  "Photosynthesis at a high-school level", etc.) and click **Start the lesson**.
- The avatar will greet you, ask 2–3 short diagnostic questions, then teach the
  topic adaptively. When the topic is covered, the avatar verbally lists areas
  you can explore next and tells you the session is concluded.
- Click **I'm done — see my feedback** (or use the avatar's end-call control)
  to land on the summary page, where you'll see the session stats, highlight
  exchanges, and the full transcript pulled from BeyondPresence.

## Project layout

```
src/
  app/
    layout.tsx                       # global shell + styles
    page.tsx                         # landing page
    session/[id]/page.tsx            # iframe avatar session
    session/[id]/summary/page.tsx    # post-call summary (polls /api/summary)
    api/
      sessions/route.ts              # POST: create BeyondPresence agent + session
      summary/[id]/route.ts          # GET: fetch transcript + build deterministic summary
  lib/
    bey.ts                           # BeyondPresence API client
    summary.ts                       # deterministic summarizer over BeyondPresence transcript
    prompt.ts                        # adaptive teaching system-prompt builder
    sessions.ts                      # in-memory session store
  components/
    TopicForm.tsx
    AvatarRoom.tsx
    SessionRoom.tsx
```

## Notes / limitations

- **Session storage is in-memory**. Restarting the dev server clears all active
  sessions. For production, replace `src/lib/sessions.ts` with a database.
- **Call discovery uses polling**. The `GET /v1/calls` endpoint does not support
  filtering by `agent_id` server-side, so we paginate the most recent calls and
  match locally. For higher volumes, switch to BeyondPresence webhooks.
- **Single-use agents**. Each session creates a fresh agent customized to the
  topic; the agent is best-effort deleted after analysis.
- **Camera/mic permissions**. The iframe needs both. Make sure your browser
  grants them for `https://bey.chat`.

## Tech stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- BeyondPresence managed agents + LiveKit-backed avatar room
- Deterministic transcript-driven summary (no external LLM)
