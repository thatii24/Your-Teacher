"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import AvatarRoom from "./AvatarRoom";

interface SessionRoomProps {
  sessionId: string;
  livekitUrl: string;
  livekitToken: string;
}

export default function SessionRoom({
  sessionId,
  livekitUrl,
  livekitToken,
}: SessionRoomProps) {
  const router = useRouter();

  const onEnded = useCallback(() => {
    router.push(`/session/${sessionId}/summary`);
  }, [router, sessionId]);

  return (
    <AvatarRoom
      livekitUrl={livekitUrl}
      livekitToken={livekitToken}
      onEnded={onEnded}
    />
  );
}
