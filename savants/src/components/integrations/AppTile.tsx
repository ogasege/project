import { Plug, Mail, Webhook } from "lucide-react";
import type { CatalogApp, IntegrationSource } from "@/lib/integrations-catalog";
import { INTEGRATION_LOGOS } from "@/lib/integration-logos";

// The real brand mark on a neutral tile. Full-colour marks need a constant light ground, so the
// tile stays white in both themes. Apps without an open-licensed mark get a mono monogram.
export function AppTile({ app, size = 36 }: { app: CatalogApp; size?: number }) {
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
      <span className="font-mono font-medium text-[#0b0d0e]" style={{ fontSize: size * 0.3, letterSpacing: "0.04em" }}>
        {app.glyph.slice(0, 2).toUpperCase()}
      </span>
    ) : (
      <Plug size={inner} className="text-[#0b0d0e]" />
    );
  }
  return (
    <span
      aria-hidden
      title={logo ? undefined : "No open-licensed logo available"}
      className="flex shrink-0 items-center justify-center rounded border border-line bg-white"
      style={{ width: size, height: size }}
    >
      {mark}
    </span>
  );
}

const SOURCE_STYLE: Record<IntegrationSource, { label: string; cls: string }> = {
  linear: { label: "Linear", cls: "border-line text-faint" },
  notion: { label: "Notion", cls: "border-line text-faint" },
  savants: { label: "Savants", cls: "border-accent text-accent" },
};

export function SourceBadges({ sources }: { sources: IntegrationSource[] }) {
  return (
    <span className="mt-0.5 flex gap-1">
      {sources.map((s) => (
        <span key={s} className={`rounded-[2px] border px-1 font-mono text-[9px] uppercase tracking-[0.12em] ${SOURCE_STYLE[s].cls}`}>
          {SOURCE_STYLE[s].label}
        </span>
      ))}
    </span>
  );
}
