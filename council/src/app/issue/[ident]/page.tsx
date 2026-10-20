"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { findByIdentifier } from "@/lib/workspace";
import { EmptyState } from "@/components/ui";
import { IssueDetail } from "@/components/issues/IssueDetail";

export default function IssuePage() {
  const { ident } = useParams<{ ident: string }>();
  const db = useStore((s) => s.db);
  const key = decodeURIComponent(ident ?? "");
  const item = useMemo(() => {
    const byId = db.items[key];
    if (byId && byId.kind === "issue") return byId;
    return findByIdentifier(db, key);
  }, [db, key]);

  if (!item || item.archived) {
    return (
      <EmptyState
        title="Issue not found"
        body={`${key} doesn't exist or was deleted.`}
        action={
          <Link href="/my-issues" className="text-accent hover:underline">
            Go to my issues
          </Link>
        }
      />
    );
  }
  return <IssueDetail item={item} />;
}
