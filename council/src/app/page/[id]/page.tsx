"use client";

import { useParams } from "next/navigation";
import { PageView } from "@/components/pages/PageView";

export default function PageRoute() {
  const { id } = useParams<{ id: string }>();
  return <PageView id={id} />;
}
