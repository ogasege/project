// Capture the design tokens a web app actually renders with, from its DevTools console.
// Paste into the Console of any open page (e.g. a list view, then an open item, in each theme).
// It downloads ui-tokens-<page>-<theme>.json and copies the same JSON to the clipboard.
// Collects: CSS custom properties, font stacks, and how often each font size, weight, colour,
// background, border, radius, shadow and row height is used on screen. Reads only what is
// rendered; it sends nothing anywhere.
(() => {
  const count = (map, key) => key && map.set(key, (map.get(key) || 0) + 1);
  const top = (map, n = 40) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  // 1. Custom properties (design tokens), from readable stylesheets and from computed style.
  const vars = {};
  const rootStyle = getComputedStyle(document.documentElement);
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin sheet
    const walk = (list) => {
      for (const r of list) {
        if (r.cssRules) walk(r.cssRules);
        if (!r.style) continue;
        for (const prop of r.style) {
          if (!prop.startsWith("--")) continue;
          const sel = r.selectorText || "@" + (r.conditionText || "rule");
          (vars[sel] ||= {})[prop] = r.style.getPropertyValue(prop).trim();
        }
      }
    };
    walk(rules);
  }
  const resolved = {};
  for (const prop of rootStyle) if (prop.startsWith("--")) resolved[prop] = rootStyle.getPropertyValue(prop).trim();

  // 2. What visible elements actually use.
  const fonts = new Map(), sizes = new Map(), weights = new Map(), colors = new Map(), bgs = new Map(),
    borders = new Map(), radii = new Map(), shadows = new Map(), heights = new Map(), spacing = new Map();
  const visible = [...document.querySelectorAll("body *")].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  });
  for (const el of visible) {
    const s = getComputedStyle(el);
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      count(fonts, s.fontFamily);
      count(sizes, `${s.fontSize} / ${s.lineHeight} / ${s.letterSpacing}`);
      count(weights, s.fontWeight);
      count(colors, s.color);
    }
    if (s.backgroundColor !== "rgba(0, 0, 0, 0)") count(bgs, s.backgroundColor);
    if (s.borderTopWidth !== "0px" && s.borderTopStyle !== "none") count(borders, `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`);
    if (s.borderRadius !== "0px") count(radii, s.borderRadius);
    if (s.boxShadow !== "none") count(shadows, s.boxShadow);
    if (s.paddingLeft !== "0px" || s.paddingTop !== "0px") count(spacing, `${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft}`);
    // Repeated rows: an element whose siblings share its height (list rows, menu items).
    const p = el.parentElement;
    if (p && p.children.length >= 4) {
      const h = Math.round(el.getBoundingClientRect().height);
      const same = [...p.children].filter((c) => Math.round(c.getBoundingClientRect().height) === h).length;
      if (same >= 4 && h >= 20 && h <= 80) count(heights, `${h}px`);
    }
  }

  // 3. Layout landmarks.
  const box = (el) => el && (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }))(el.getBoundingClientRect());
  const landmarks = {
    viewport: { width: innerWidth, height: innerHeight },
    nav: box(document.querySelector("nav, aside, [role=navigation]")),
    main: box(document.querySelector("main, [role=main]")),
    header: box(document.querySelector("header, [role=banner]")),
    dialog: box(document.querySelector("[role=dialog]")),
    menu: box(document.querySelector("[role=menu], [role=listbox]")),
  };

  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const out = {
    url: location.origin + location.pathname,
    title: document.title,
    capturedAt: new Date().toISOString(),
    devicePixelRatio,
    themeHint: { prefersDark: dark, bodyBackground: bodyBg, htmlClass: document.documentElement.className, dataset: { ...document.documentElement.dataset } },
    body: (({ fontFamily, fontSize, lineHeight, letterSpacing, fontFeatureSettings, color }) => ({ fontFamily, fontSize, lineHeight, letterSpacing, fontFeatureSettings, color }))(getComputedStyle(document.body)),
    landmarks,
    customProperties: { resolvedOnRoot: resolved, byRule: vars },
    usage: {
      fontFamilies: top(fonts, 10), textSizes: top(sizes), fontWeights: top(weights, 10), textColors: top(colors),
      backgrounds: top(bgs), borders: top(borders), radii: top(radii, 20), shadows: top(shadows, 20),
      repeatedRowHeights: top(heights, 15), paddings: top(spacing),
    },
  };

  const json = JSON.stringify(out, null, 2);
  const slug = (location.pathname.split("/").filter(Boolean).slice(-2).join("-") || "home").replace(/[^a-z0-9-]/gi, "");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  a.download = `ui-tokens-${slug}-${bodyBg.replace(/[^0-9,]/g, "")}.json`;
  a.click();
  try { copy(json); } catch { /* copy() exists only in DevTools */ }
  console.log(`Captured ${Object.keys(resolved).length} tokens and ${visible.length} elements. File downloaded and JSON copied.`);
  return out;
})();
