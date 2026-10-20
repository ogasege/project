# Lovable prompt: Savants UI fixes

Paste this into Lovable. It is long, so it's split into four parts. Paste Part 1 first, let Lovable build, then paste the next part. Each part stands on its own.

---

## PART 1 of 4: What this is, the design system, and the signal meter

### What we're building

Savants is a web app where a person gives a team of AI teammates (called **savants**) a **goal**, such as "Grow revenue 30% by 31 December". The savants plan the work, do it, and come back only when they need a decision. The person can also talk to them out loud, like a call.

Our current UI works, but it makes users figure out too much: walls of text, rows of toggles, jargon, raw IDs and too many decisions at once. Your job is to rebuild the screens below so they are obvious at a glance. **Keep our existing visual base, which is a close copy of Linear's dark UI, exactly as specified here.**

Build it with React, Vite, TypeScript, Tailwind and shadcn/ui, using mock data in `src/data/mock.ts` shaped like the types in Part 4. Keep components presentational and data-driven, so we can wire them to our real API afterwards. Don't add a backend, authentication or Supabase.

### Design principles (apply everywhere)

1. **One obvious next action per screen.** Only one primary (accent-coloured) button is visible at a time.
2. **Recommend, don't ask.** Every question shows a recommended answer and one-tap choices.
3. **Plain words.**
   - Say "Goal", not "Outcome".
   - Say "What Mara is doing", not "Workstream".
   - Say "Needs you", not "Proposals" or "Approvals".
   - Say "Trust", not "Autonomy".
   - Never show IDs like GTM-7, raw markdown like `**bold**`, or field diffs like "Priority → High".
4. **Short by default.** At most three lines of body text in any block on a main screen. Longer content goes behind "More".
5. **Progress over activity.** Show how close the goal is ("18% there, 41 days left"), not counters like "1 of 10 reported back".
6. **Choices live in settings.** Appearance choices (how a savant looks, which team view to use) are never shown as toggles on work screens.
7. **Motion means something.** Only the savants' presences move, and only to show listening, thinking or speaking. Support `prefers-reduced-motion` by slowing animation to a quarter of its normal speed.
8. **Calm, generous spacing.** The goal and its number are large; everything else is 13px and quiet.

### Design tokens (Linear baseline: use these exactly)

Define them as CSS variables in `index.css` and map them in `tailwind.config.ts` as colours `bg`, `elev`, `panel`, `hover`, `active`, `menu`, `line`, `line-row`, `line-strong`, `fg`, `muted`, `faint`, `disabled`, `sidebar`, `accent`, `accent-fg`, `accent-soft`, `danger`, `success`, `warning`. Dark is the default theme; the light theme sits under `[data-theme="light"]`.

```css
:root, [data-theme="dark"] {
  --bg-sidebar: #09090a;
  --bg: lch(5.52% 0.4 272);          /* content panel */
  --bg-elev: #09090a;                /* app chrome around the panel */
  --bg-panel: lch(7.32% 0.85 272);   /* cards, inputs, group headers */
  --bg-hover: lch(9.345% 0.85 272);
  --bg-active: lch(13.861% 1.043 272);
  --bg-menu: lch(9.232% 0.85 272);
  --border: lch(14.16% 1.48 272);
  --border-row: lch(16.32% 1.48 272);
  --border-strong: lch(22.193% 1.93 272);
  --fg: lch(100% 0 272);
  --fg-muted: lch(90.451% 1.2 272);
  --fg-faint: lch(61.803% 1.2 272);
  --fg-disabled: lch(36.975% 1.2 272);
  --fg-sidebar: lch(60.621% 1.2 272);
  --accent: lch(47.918% 59.303 288.421);
  --accent-fg: #ffffff;
  --accent-soft: lch(47.918% 59.303 288.421 / 0.18);
  --danger: #eb5757; --success: #4cb782; --warning: #f2994a;
  --shadow-panel: 0 0.5px 1px 1px lch(0% 0 0 / 0.3);
  --shadow-menu: 0 3px 8px lch(0% 0 0 / .125), 0 2px 5px lch(0% 0 0 / .125), 0 1px 1px lch(0% 0 0 / .125);
}
[data-theme="light"] {
  --bg-sidebar: #efeff0; --bg: #fdfdfd; --bg-elev: #efeff0; --bg-panel: #f4f2f4;
  --bg-hover: #eeedef; --bg-active: #e9e8ea; --bg-menu: #ffffff;
  --border: #e9e8ea; --border-row: #e4e2e4; --border-strong: #dcdbdd;
  --fg: #282a30; --fg-muted: #3c4149; --fg-faint: #6f6e77; --fg-disabled: #86848d; --fg-sidebar: #5f5e66;
  --accent: #5e6ad2; --accent-fg: #ffffff; --accent-soft: #f1f1ff;
  --shadow-panel: 0 0.5px 1px 1px rgb(0 0 0 / .04);
  --shadow-menu: 0 3px 8px rgb(0 0 0 / .08), 0 2px 5px rgb(0 0 0 / .06), 0 1px 1px rgb(0 0 0 / .06);
}
```

Type and layout:

- **Font:** Inter Variable (`@fontsource-variable/inter`). Body is 13px at weight 450, line-height 1.5. Labels are 12px at weight 500 in `faint`. Page titles are 24–28px semibold with letter-spacing −0.015em. Mono text uses Geist Mono or the system monospace.
- **App frame:** a 244px sidebar on `bg-sidebar`. The content panel is inset 8px on the top, right and bottom, has a 12px radius, a 0.5px `line` border and the `bg` background.
- **Sizes:**
  - Page header height is 44px, with a 0.5px bottom border.
  - Sidebar rows are 28px tall, 13px, weight 500.
  - List rows are 44px.
  - Buttons are 28px high with an 8px radius and 13px weight 500 text. The primary button is `accent`. The secondary button is `panel` with a 0.5px `line-strong` border.
- **Lines and corners:** every divider and border is 0.5px. Card radius is 8px; the main panel's radius is 12px; pills are fully rounded.
- **Icons:** lucide-react at stroke width 1.75. Don't use emoji in the UI.

### The signal meter (our signature: use it everywhere a savant appears)

Every savant is drawn as a **signal meter**. **This is the default look for every savant**, used in the sidebar (16px), on cards (32–48px), on the goal page team strip (56–72px) and on the call screen (100–124px).

Build it as a `<SignalMeter color state size level? seed? />` component on a `<canvas>`.

Canvas:

- The canvas is `size × 1.7` square. Use negative margins of `size × 0.35` so layout uses `size`.
- Scale for devicePixelRatio, capped at 2.

Shape, where B is the canvas size and R = 0.24 × B:

- **Ticks:** 96 ticks around a circle of radius R, each 1px wide and pointing outwards, starting at the top (−π/2).
  - Tick length = `4 + lv × R × 0.85 × (0.35 + wave × 0.65)`.
  - `wave = 0.5 + 0.5 × sin(t·9 + i·1.7 + seed) × sin(t·3 + i·0.4)`, where `i` is the tick index and `t` is seconds.
  - Tick colour is the savant's `color` when `lv > 0.04`, otherwise `#2a2d33`.
- **Inner disc:** radius R − 6, filled `#121317`, with a 1px stroke in the savant's `color`.
- **Thinking:** an arc at radius R + 12, 1.5px wide, `#8b93ff`, spanning 1.4 radians, rotating once every 1.5 seconds. Only shown when `state === "thinking"`.

Level:

- Each frame, smooth the level with `lv += (target − lv) × 0.22`.
- If a `level()` function is passed (real audio), use it as `target` while speaking or listening.
- Otherwise simulate it:
  - **Speaking:** `syll = max(0, sin(t·9.5+seed)·0.5+0.5)²`, `phrase = max(0, sin(t·1.3+seed·2)·0.5+0.55)`, and `target = min(1, 0.15 + syll·phrase·0.95 + (sin(t·23+seed)·0.5+0.5)·0.08)`.
  - **Listening:** `target = 0.12 + (sin(t·6+seed)·0.5+0.5)·0.18`.
  - **Idle and thinking:** `target = 0`.
- For real audio, take the RMS of `AnalyserNode.getByteTimeDomainData`, multiply by 4 and clamp to 1.

Behaviour:

- Pause drawing when the canvas is off screen (IntersectionObserver).
- Honour reduced motion by running time at 0.25×.
- The canvas always sits on a dark tile (`#0b0c0e`, 8px radius) so it reads the same in light theme.

Also build a small `Presence` wrapper that takes a `look` prop and renders `SignalMeter` for `look="signal"`, which is the default. Other looks can come later. **Never show a picker for looks outside the savant's settings page.**

---

## PART 2 of 4: User stories and screens

The app has these routes: `/` (Home), `/goal/:id` (Goal), `/talk/:goalId` (Call), `/savants/:id` (Savant), `/settings`, and `/welcome` (first run).

### Sidebar

- Rows, in order: Home, Needs you (with a count badge), Talk, then a "Goals" section listing each goal with a tiny signal meter. Each goal's meter animates in "thinking" while anyone on it is working.
- Below that, a "Savants" section: each savant with a 16px signal meter and their name.
- At the bottom: Workspace (the detailed tasks and pages), Settings, and the user's own name and avatar.
- No other sections.

### US-1 First run: "I want to start without reading anything"

As a new user, I see `/welcome`, a centred column of four short steps, one at a time, each with one input and one "Continue" button:

1. "What should we call you?" (name)
2. "What do you do?" (one sentence)
3. "Connect where your work lives" (three large logo tiles: Gmail, Google Calendar, HubSpot, plus a "Skip for now" text button)
4. "What do you want to be true, and by when?" (goal text, plus a date chip defaulting to the end of the quarter)

Acceptance:

- The user's name appears in the sidebar and in greetings from then on.
- There is no demo data: no sample people, companies or projects.
- Step 4 goes straight to the kickoff (US-3).

### US-2 Home: "I want to know in five seconds if anything needs me"

Layout, top to bottom:

- **Greeting:** "Good morning, {name}". Below it, one line: "2 things need you" (a link to the Needs you list) or "Nothing needs you. The team is working."
- **Goal box:** a big textarea (17px) with the placeholder "What do you want to be true?", a date chip and a primary "Start" button.
- **Goal cards:** a single column, one card per goal. Each card has:
  - the goal text (15px semibold);
  - a progress bar from baseline to target, labelled with the current value and target (for example "$41k of $52k");
  - time left ("41 days left");
  - overlapping 28px signal meters of the savants on it, animated (speaking or thinking) while they work;
  - one line in `faint`: what's happening now, or "Needs you: approve the pilot price".
- **Nothing else on the page:** no stats, no charts, no toggles.

### US-3 Kickoff: "I want to agree a plan by talking, not by filling in a form"

After entering a goal, the user lands on a conversation view.

- The lead savant (Atlas, with a 48px signal meter in "speaking" while the text streams in) answers with a **plan card**:
  - **Goal:** the measurable target.
  - **How we'll know:** the measure and when it's checked.
  - **The plan:** three bets, one line each.
  - **On it:** 3–5 savants as 32px signal meters, each with name and role. Specialists are added automatically when the goal needs them, and tagged with a small "New" pill.
  - **Before we start:** at most two questions, each with a suggested answer prefilled in an input.
- Below the card: a primary **Start** button, plus "Change something" (a secondary button that focuses the message box) and a mic button.

Acceptance:

- There is no team-picker grid and no animation picker.
- Start takes the user to `/goal/:id`.

### US-4 Goal page: "I want to see how close we are, what needs me, and what changed"

The page header shows "Goals › {goal}" on the left. On the right is one primary button, **Talk**, and a "⋯" menu (Mark achieved, Pause, Edit plan).

Body, at most 760px wide and centred:

1. **Goal and number.** The goal at 26px; a large progress bar with "$41k of $52k · 79%" and "41 days left". If there's no baseline yet, show a "We need November's revenue to measure this" input with a Save button.
2. **Needs you** (only if anything does). One to three `DecisionCard`s (US-5), plus a "6 small changes" grouped card. "See all (9)" links to the full list.
3. **The team.** A horizontal strip of savants. Each shows:
   - a 64px signal meter on a dark tile, animated: "thinking" while working without writing, "speaking" while writing, idle otherwise;
   - name, role, and one plain sentence of what they're doing ("Drafting the follow-up to 12 warm leads").

   Clicking a savant opens a side sheet with their last ten steps as sentences, and a "Talk to {name}" button.
4. **Since you last looked.** A list of plain sentences, newest first, each with a 16px signal meter, the savant's name and a relative time. Each row expands to show the evidence (a link to the doc, email or task).
5. **The plan** (collapsed). The three bets, each with an owner avatar.

Acceptance:

- No paragraph is longer than three lines.
- There are no IDs, no "Round", no "Planned by the model" and no row of view toggles.
- The only accent-coloured button is Talk.

### US-5 Decisions: "I want to decide quickly and trust the recommendation"

A `DecisionCard` has:

- The savant (20px signal meter and name) and a one-sentence summary: "Mara wants to email 12 warm leads a pilot offer at $7,500."
- A "Why" line and an "If you say yes" line, both 13px faint.
- A recommendation pill, e.g. "Recommended: Yes. Matches the price you approved last week."
- Buttons: **Approve** (primary), **Change** (opens an inline input, "Tell Mara what to change"), and **Not now** (ghost).
- On reject, a small sheet asks "Why?" with quick picks (Too risky · Wrong timing · Wrong price · Other). Then show the toast "Mara will remember that."

The small-changes group is one card: "6 small changes (notes, task tidy-ups, draft pages)" with **Approve all** and **Review**. Review expands to one-line rows with checkboxes.

On the full Needs you list at `/needs-you`:

- Group decisions by goal, newest first.
- Never show markdown symbols, field names or IDs.

### US-6 Talk: "I want to talk and know they heard me"

The full-screen call view is always dark.

- A centre stage of signal meters, 124px each, in one row (two rows if there are more than five), with names and roles underneath.
  - The speaking savant is at full opacity; the others are at 50%.
  - The user's own meter is smaller (0.62×) and in "listening" while they talk.
- Live captions under the stage, 26px, for whoever is speaking.
- Above the bottom bar, a small "I heard: …" line showing the user's last sentence.
- **Bottom bar:** a mic toggle (on by default; shows "Allow microphone" if permission is missing), a "Hold Space to talk" hint, a text box, a mute-voices button and a red **End** button.
- **Raised hands:** a small chip with a hand icon and the first five words, **placed above that savant's meter inside its own column so it never overlaps the names in the row above**. Clicking it gives that savant the floor.
- A right side panel titled "Notes" lists what was agreed (decisions, actions, risks) as plain sentences.

Acceptance:

- The mic is on when the call starts (after permission is granted once).
- Interrupting is possible: when the user's mic level spikes while a savant is speaking, call `onBargeIn()`.
- Nothing overlaps at 1280px or at 1500px wide with 7 participants.

### US-7 Savant page: "I want to understand and tune one teammate"

The header shows a 72px signal meter (speaking), the name and the role.

Sections:

- **Good at:** one paragraph.
- **What they've learned:** a list of lessons, each with the date and the decision it came from.
- **Trust:** a three-step segmented control (Ask me first / Small things on their own / Trusted), with the track record "14 approved · 2 changed · 1 declined".
- **Look:** shows the current look, defaulting to Signal meter, with a "Change" button that opens a grid of looks. Only Signal meter needs to work now; the others show as "Coming soon".
- **Voice:** a list of voices with play buttons.

Acceptance: the look and voice choices only appear here and in Settings.

### US-8 Settings: "Choices I make once"

- Your name.
- What you do.
- Theme (Dark / Light / System).
- "Watch them work" view: a select with Orbit, Constellation, Relay tree, Radar and Metro map, each showing a static preview thumbnail.
- Voice on calls: Natural voices (default) or Browser voices.
- Connected tools.

---

## PART 3 of 4: Components, states and copy

### Components to build

`AppShell`, `Sidebar`, `PageHeader`, `SignalMeter`, `Presence`, `SavantChip` (meter, name and role), `GoalCard`, `ProgressToTarget`, `PlanCard`, `DecisionCard`, `SmallChangesCard`, `TeamStrip`, `ActivityStory`, `SavantSheet`, `CallStage`, `Caption`, `HeardLine`, `CallBar`, `RaisedHand`, `NotesPanel`, `WelcomeStep`, `EmptyState`, `Toast`.

### States every screen must handle

- **Empty:** a friendly one-liner and one action. For example, Home with no goals shows "What do you want to be true?" and nothing else.
- **Loading:** skeleton rows in `panel` colour. Never spinners in the middle of the page.
- **Working:** the savants' meters are animated; "Since you last looked" gets new lines with a subtle 150ms fade-in.
- **Offline:** a single line at the top: "Working offline. The team will catch up when you're back."
- **Error:** inline, next to the thing that failed, in one sentence with a "Try again" link.

### Copy rules

- Sentence case everywhere: "Needs you", not "Needs You".
- Use the user's name and the savants' names; never write "the agent" or "AI".
- Use numbers with units: "$41k of $52k", "41 days left", "3 of 5 calls booked".
- Keep buttons to one or two words: Start, Talk, Approve, Change, Not now, End.
- **Banned on main screens:** Outcome, Workstream, Round, Proposal, Autonomy, Model, Simulator, Issue, Ticket, IDs like ABC-12, and "Planned by…".

### Fixes to make against our current UI

1. **Signal meter:** it's not visible in most places today. Make it the default presence everywhere a savant appears: sidebar, cards, team strip, decision cards, activity rows, call.
2. **Outcome page:** remove the ten team-view pill toggles. The team view moves to a "Watch them work" full-screen mode, opened from the ⋯ menu, using the view chosen in Settings.
3. **Strategy:** remove the strategy paragraph from the top of the goal page; it goes in the collapsed "The plan".
4. **Status line:** remove "Round 1 · 1 of 10 reported back · Planned by the model".
5. **Approval cards:** replace cards that show "Update GTM-7, Priority → High" and raw `**markdown**` with `DecisionCard` sentences and recommendations.
6. **Kickoff:** replace the team-picker grid with the kickoff conversation (US-3).
7. **Raised hands:** fix the raised-hand chip overlapping the names in the row above on the call screen.
8. **Mic:** default it to on when the call starts, and show "I heard: …".
9. **Personal names:** the user's own name must come from onboarding. Never hard-code any person's or company's name.

---

## PART 4 of 4: Mock data shape (keep these names so we can wire the real API)

```ts
type PresenceState = "idle" | "listening" | "thinking" | "speaking";

interface Savant { id: string; name: string; role: string; color: string; look: "signal"; trust: "ask" | "small" | "trusted";
  lessons: { at: string; text: string }[]; record: { approved: number; changed: number; declined: number } }

interface Goal { id: string; title: string; deadline: string; baseline?: number; current?: number; target?: number; unit?: string;
  measure: string; bets: { text: string; ownerId: string }[]; savantIds: string[]; leadId: string;
  status: "working" | "needs-you" | "on-track" | "off-track" | "achieved" | "paused" }

interface Doing { savantId: string; goalId: string; sentence: string; state: PresenceState }

interface StoryItem { id: string; goalId: string; savantId: string; at: string; sentence: string; evidence?: { label: string; href: string } }

interface Decision { id: string; goalId: string; savantId: string; summary: string; why: string; ifYes: string;
  recommendation: { answer: "yes" | "no"; reason: string }; size: "small" | "normal" | "big"; deadline?: string }

interface User { name: string; about: string }
```

**Mock content:** use generic examples only. Use one user named by the first-run flow (default to "You" until set). Use four savants: Atlas (Lead, `#8b5cf6`), Vera (Skeptic, `#f43f5e`), Forge (Operator, `#f59e0b`) and Scout (Researcher, `#10b981`), plus Mara (Sales, `#38bdf8`). Use two goals: "Grow revenue 30% by 31 December" and "Get our first 3 paying customers by 30 November". Do not invent real company names.

**Done means:**

1. Every route renders in dark and light themes.
2. Signal meters animate wherever savants appear.
3. No screen has more than one accent button.
4. No banned words appear.
5. The call layout has no overlaps at 1280px and 1500px.
6. The `SignalMeter` matches the spec in Part 1.
