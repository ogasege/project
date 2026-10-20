"use client";

import { Suspense } from "react";
import { Lobby } from "@/components/call/Lobby";

export default function CallLobbyPage() {
  return (
    <Suspense fallback={null}>
      <Lobby />
    </Suspense>
  );
}
