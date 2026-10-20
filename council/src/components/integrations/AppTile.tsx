import type { CatalogApp, IntegrationSource } from "@/lib/integrations-catalog";

export function AppTile({ app, size = 36 }: { app: CatalogApp; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-lg font-semibold text-white shadow-inner"
      style={{ width: size, height: size, background: `linear-gradient(145deg, ${app.color}, ${app.color}cc)`, fontSize: app.glyph.length > 2 ? size * 0.28 : size * 0.38 }}
    >
      {app.glyph}
    </span>
  );
}

const SOURCE_STYLE: Record<IntegrationSource, { label: string; cls: string }> = {
  linear: { label: "Linear", cls: "border-[#5e6ad2]/40 text-[#8e97f0]" },
  notion: { label: "Notion", cls: "border-line-strong text-muted" },
  council: { label: "Council", cls: "border-accent/40 text-accent" },
};

export function SourceBadges({ sources }: { sources: IntegrationSource[] }) {
  return (
    <span className="mt-0.5 flex gap-1">
      {sources.map((s) => (
        <span key={s} className={`rounded border px-1 text-[10px] ${SOURCE_STYLE[s].cls}`}>
          {SOURCE_STYLE[s].label}
        </span>
      ))}
    </span>
  );
}
