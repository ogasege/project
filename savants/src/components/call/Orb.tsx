"use client";

import type { PresenceLook, PresenceState } from "@/lib/presence";
import { Presence } from "@/components/presence/Presence";

export type OrbState = PresenceState;

/** A call participant in the look they picked (the signal meter unless they chose another). */
export function Orb({ color, state, getLevel, size = 160, dim = false, look = "signal" }: { color: string; state: OrbState; getLevel: () => number; size?: number; dim?: boolean; look?: PresenceLook }) {
  return <Presence look={look} color={color} state={state} getLevel={getLevel} size={size} dim={dim} />;
}
