"use client";

import { useParams } from "next/navigation";
import { CallRoom } from "@/components/call/CallRoom";

export default function CallRoomPage() {
  const { id } = useParams<{ id: string }>();
  return <CallRoom key={id} callId={id} />;
}
