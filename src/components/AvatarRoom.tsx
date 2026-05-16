"use client";

import {
  ConnectionState,
  type LocalAudioTrack,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  Room,
  RoomEvent,
  Track,
} from "livekit-client";
import { useEffect, useRef, useState } from "react";

interface AvatarRoomProps {
  livekitUrl: string;
  livekitToken: string;
  onEnded: () => void;
}

type UiState =
  | "connecting"
  | "connected"
  | "ending"
  | "ended"
  | "error";

/** LiveKit Agents consume user-typed input on this text-stream topic. */
const LIVEKIT_USER_CHAT_TOPIC = "lk.chat";

export default function AvatarRoom({
  livekitUrl,
  livekitToken,
  onEnded,
}: AvatarRoomProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const [uiState, setUiState] = useState<UiState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [typedReply, setTypedReply] = useState("");
  const [sendingText, setSendingText] = useState(false);
  const [textSendError, setTextSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    function attachTrack(track: RemoteTrack) {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
      }
    }

    room
      .on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, _pub: RemoteTrackPublication, _p: RemoteParticipant) => {
          attachTrack(track);
        },
      )
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
      })
      .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const remoteSpeaking = speakers.some((s) => !s.isLocal);
        setAgentSpeaking(remoteSpeaking);
      })
      .on(RoomEvent.Disconnected, () => {
        if (cancelled) return;
        setUiState("ended");
        onEndedRef.current();
      })
      .on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Connected) setUiState("connected");
      });

    async function connect() {
      try {
        setUiState("connecting");
        await room.connect(livekitUrl, livekitToken);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        setUiState("connected");
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch (micErr) {
          console.warn("Microphone enable failed:", micErr);
          setErrorMessage(
            "Couldn't enable your microphone. Check your browser's site permissions and try again — or type your answers in the text box below.",
          );
        }

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((pub) => {
            if (pub.track) attachTrack(pub.track);
          });
        });
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Could not connect to the tutor.";
        console.error("LiveKit connect failed:", err);
        setErrorMessage(msg);
        setUiState("error");
      }
    }

    void connect();

    return () => {
      cancelled = true;
      void room.disconnect().catch(() => {});
      roomRef.current = null;
    };
  }, [livekitUrl, livekitToken]);

  async function toggleMic() {
    const room = roomRef.current;
    if (!room) return;
    const next = !micEnabled;
    const audioPub = Array.from(
      room.localParticipant.trackPublications.values(),
    ).find((p) => p.kind === Track.Kind.Audio);
    const track = audioPub?.track as LocalAudioTrack | undefined;
    try {
      if (track) {
        if (next) await track.unmute();
        else await track.mute();
      } else {
        await room.localParticipant.setMicrophoneEnabled(next);
      }
      setMicEnabled(next);
    } catch (err) {
      console.warn("toggleMic failed:", err);
    }
  }

  async function sendTypedReply() {
    const room = roomRef.current;
    const trimmed = typedReply.trim();
    if (!room || uiState !== "connected" || !trimmed || sendingText) return;

    setSendingText(true);
    setTextSendError(null);
    try {
      const lp = room.localParticipant;
      try {
        await lp.sendText(trimmed, { topic: LIVEKIT_USER_CHAT_TOPIC });
      } catch {
        try {
          await lp.sendText(trimmed);
        } catch {
          await lp.sendChatMessage(trimmed);
        }
      }
      setTypedReply("");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not send your message. Try again.";
      setTextSendError(msg);
    } finally {
      setSendingText(false);
    }
  }

  async function endSession() {
    const room = roomRef.current;
    if (!room) {
      onEndedRef.current();
      return;
    }
    setUiState("ending");
    try {
      await room.disconnect();
    } catch (err) {
      console.warn("Room.disconnect threw:", err);
    }
    onEndedRef.current();
  }

  return (
    <div className="space-y-3">
    <div className="relative rounded-2xl overflow-hidden border border-ink-800/70 bg-ink-950 shadow-2xl shadow-black/40">
      <video
        ref={videoRef}
        className="w-full h-[70vh] min-h-[480px] object-cover bg-ink-950"
        playsInline
        autoPlay
      />
      <audio ref={audioRef} autoPlay />

      {uiState === "connecting" && (
        <Overlay>
          <Spinner />
          <div className="mt-4 text-sm text-ink-200">
            Connecting to your tutor (allow camera and microphone if asked)...
          </div>
        </Overlay>
      )}

      {uiState === "error" && (
        <Overlay>
          <div className="text-base font-medium text-red-200">
            Could not start the session
          </div>
          <div className="mt-2 text-sm text-ink-300 max-w-md text-center">
            {errorMessage ?? "Unknown error. Please try again."}
          </div>
        </Overlay>
      )}

      {uiState === "ended" && (
        <Overlay>
          <div className="text-base font-medium text-ink-100">
            Session ended
          </div>
          <div className="mt-2 text-sm text-ink-400">
            Preparing your feedback...
          </div>
        </Overlay>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-xs text-ink-300">
          <span
            className={`inline-block size-2 rounded-full ${
              uiState === "connected"
                ? agentSpeaking
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-emerald-500"
                : uiState === "ended"
                  ? "bg-ink-500"
                  : "bg-amber-400 animate-pulse"
            }`}
          />
          <span>
            {uiState === "connected"
              ? agentSpeaking
                ? "Tutor speaking..."
                : "Connected"
              : uiState === "ended"
                ? "Ended"
                : uiState === "error"
                  ? "Disconnected"
                  : "Connecting"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            disabled={uiState !== "connected"}
            className={`text-sm rounded-lg border px-3 py-1.5 transition disabled:opacity-40 ${
              micEnabled
                ? "border-ink-700 bg-ink-900/80 text-ink-100 hover:bg-ink-800"
                : "border-amber-500/50 bg-amber-500/15 text-amber-100"
            }`}
          >
            {micEnabled ? "Mute mic" : "Unmute mic"}
          </button>
          <button
            type="button"
            onClick={endSession}
            disabled={uiState === "ending" || uiState === "ended"}
            className="text-sm rounded-lg bg-red-500/90 hover:bg-red-500 text-white px-4 py-1.5 font-medium transition disabled:opacity-60"
          >
            {uiState === "ending" ? "Ending..." : "End session"}
          </button>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-ink-800/70 bg-ink-900/50 p-3 sm:p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-ink-500 mb-2">
          Type your answer
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <textarea
            value={typedReply}
            onChange={(e) => setTypedReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendTypedReply();
              }
            }}
            placeholder="Answer the tutor's question in writing… (Enter to send, Shift+Enter for new line)"
            disabled={uiState !== "connected" || sendingText}
            rows={2}
            maxLength={2000}
            className="flex-1 min-h-[3rem] rounded-xl border border-ink-700 bg-ink-950/80 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-y disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void sendTypedReply()}
            disabled={
              uiState !== "connected" ||
              sendingText ||
              typedReply.trim().length === 0
            }
            className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-sm font-medium transition disabled:opacity-40 disabled:pointer-events-none"
          >
            {sendingText ? "Sending…" : "Send"}
          </button>
        </div>
        {textSendError ? (
          <p className="mt-2 text-sm text-red-300">{textSendError}</p>
        ) : (
          <p className="mt-2 text-xs text-ink-500">
            Voice and typing both work — use whichever you prefer for each answer.
          </p>
        )}
    </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/85 backdrop-blur-sm">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="size-10 rounded-full border-2 border-ink-700 border-t-indigo-400 animate-spin" />
  );
}
