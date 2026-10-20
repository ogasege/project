"use client";

import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { EmptyState } from "@/components/ui";
import { OutcomeRoom } from "@/components/outcomes/OutcomeRoom";

export default function OutcomePage() {
  const { id } = useParams<{ id: string }>();
  const outcome = useStore((s) => s.db.outcomes?.[id]);
  if (!outcome) return <EmptyState title="Outcome not found" body="It may still be loading, or it was removed." />;
  return <OutcomeRoom outcome={outcome} />;
}
