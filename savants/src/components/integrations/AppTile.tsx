import { Plug, Mail, Webhook } from "lucide-react";
import type { CatalogApp, IntegrationSource } from "@/lib/integrations-catalog";
import { INTEGRATION_LOGOS } from "@/lib/integration-logos";

// The real brand mark on a neutral tile. Full-colour marks need a constant light ground, so the
// tile stays white in both themes. Apps without an open-licensed mark get a mono monogram.
export function AppTile({ app, size = 32 }: { app: CatalogApp; size?: number }) {
  const logo = INTEGRATION_LOGOS[app.id];
  const inner = Math.round(size * 0.58);
  let mark: React.ReactNode;
  if (app.id === "savants-mcp") {
    // eslint-disable-next-line @next/next/no-img-element
    mark = <img src="/brand/emeka-icon-black.svg" alt="" style={{ height: inner, width: "auto" }} />;
  } else if (app.id === "webhook") {
    mark = <Webhook size={inner} className="text-[#0b0d0e]" />;
  } else if (app.id === "email-intake") {
    mark = <Mail size={inner} className="text-[#0b0d0e]" />;
  } else if (logo) {
    mark = (
      <svg width={inner} height={inner} viewBox={`0 0 ${logo.width} ${logo.height}`} aria-hidden dangerouslySetInnerHTML={{ __html: logo.body }} />
    );
  } else {
    mark = app.glyph ? (
      <span className="font-medium text-[#0b0d0e]" style={{ fontSize: size * 0.32 }}>
        {app.glyph.slice(0, 2)}
      </span>
    ) : (
      <Plug size={inner} className="text-[#0b0d0e]" />
    );
  }
  return (
    <span
      aria-hidden
      title={logo ? undefined : "No open-licensed logo available"}
      className="flex shrink-0 items-center justify-center border-[0.5px] border-line-strong bg-white"
      style={{ width: size, height: size, borderRadius: Math.max(6, Math.round(size * 0.22)) }}
    >
      {mark}
    </span>
  );
}

// Where an app comes from, as a quiet line of text rather than badges.
export function sourceNote(sources: IntegrationSource[]): string {
  if (sources.includes("savants")) return "Built in";
  const l = sources.includes("linear");
  const n = sources.includes("notion");
  return l && n ? "Linear and Notion" : l ? "From Linear" : "From Notion";
}
