"use client";

import { useParams } from "next/navigation";
import { catalogApp } from "@/lib/integrations-catalog";
import { EmptyState } from "@/components/ui";
import { IntegrationDetail } from "@/components/integrations/IntegrationDetail";

export default function IntegrationPage() {
  const { id } = useParams<{ id: string }>();
  const app = catalogApp(id);
  if (!app) return <EmptyState title="No such integration" body="It may have been renamed. Go back to Integrations to find it." />;
  return <IntegrationDetail app={app} />;
}
