# Savants: build prompt

Give this whole document to the builder (Claude Code, Claude Design, or a person). It describes what the product is, how it should feel, every screen, and what "done" means. Where it conflicts with the current build, this document wins.

---

## 1. What we are building

Savants is a team of AI teammates that **own outcomes, not tasks**.

You say what you want to be true by a date: "Grow revenue 30% by 31 December", "Get our first 3 paying customers", "Cut support response time to under an hour." The savants work out what has to happen, split the work between them, do it in your tools, and come back to you only when they need a decision or a fact only you have. You can talk to them at any time, out loud, like a call with your team. They talk back, reason with you and disagree with you when you're wrong.

It replaces the stack of a task tracker, a docs tool and a pile of chats with one thing: **a goal and a team that owns it.** The issue tracker and pages still exist underneath (that is how the work is recorded and shared), but the person using Savants should rarely need to open them.

**The test of every screen:** someone who has never used Linear, Notion or an "AI agent" product should understand it in five seconds and know what to do next.

## 2. Who it's for and how it should feel

- Founders, operators and small teams who are busy, not technical, and allergic to setup.
- It should feel like having a capable chief of staff and a small team: calm, competent, brief. You check in, you see progress, you make two decisions, you leave.
- It must never feel like operating software. No dashboards to configure, no forms to fill, no jargon, no walls of text.

## 3. Rules for keeping it simple (apply to every screen)

1. **One thing at a time.** Each screen has one obvious next action. If there are two equally loud buttons, one is wrong.
2. **The system decides the obvious things.** It picks the team, the plan, the order of work and the defaults. The person can change any of it by saying so, but is never asked to configure it up front.
3. **Every question comes with a recommendation.** Never ask "what should we do?" Ask "I recommend X because Y. Go ahead?" with one-tap answers.
4. **Plain words only.** Use the vocabulary table in section 9. No IDs (GTM-7), no "workstreams", "rounds", "proposals", "priority → high", "planned by the model", raw markdown or tool names on the main screens.
5. **Short by default, detail on request.** One sentence of status; tap to see more. No paragraph longer than three lines on a main screen.
6. **Show progress toward the goal, not activity.** "18% of the way, 41 days left" beats "1 of 10 reported back."
7. **Few decisions, batched.** At most three decisions in front of the person at once. Low-risk ones can be approved together with one tap ("Approve the 6 small ones").
8. **Choices live in settings, not in the work.** How a savant looks and sounds is chosen once (onboarding or profile), never via a row of toggles on the outcome screen.
9. **Talking is always one tap away**, and it works the first time (section 7).
10. **Nothing is hard-coded about a particular person or company.** The app knows only what the user told it.

## 4. The core loop

1. **Say it.** "What do you want to be true?" One box. Voice or typing.
2. **Agree the plan in conversation.** The lead savant replies, out loud or in the chat, with: the goal restated with a measurable target, how they'll measure it, the two or three bets they'll make, who's on it, and one or two questions only the person can answer (for example "What's November revenue so I have a baseline?" or "Any limits, like no discounts above 15%?"). The person answers or says "go." No team-picker grid, no form.
3. **They work.** In the background, in the person's tools, through the human gate (section 8).
4. **You decide.** Only what genuinely needs a human, presented one card at a time with a recommendation.
5. **They report back.** A short story of what changed since you last looked, and the number moving.
6. **They learn.** Every correction becomes a lesson the team keeps. Trust grows: things that were approved ten times in a row stop needing approval (the person can always take that back).

## 5. Screens

### 5.1 First run (under 60 seconds, no demo data)

- "What should we call you?" → name. Used everywhere afterwards ("Morning, Ada").
- "What do you do?" → one sentence about the person or company. It goes into every savant's context.
- "Connect where your work lives" → three big logos for the most likely tools (email, calendar, CRM or GitHub, based on the sentence above), each optional, plus "Skip for now."
- "What do you want to be true, and by when?" → the first goal. This leads straight into 5.3.
- The workspace starts **empty apart from the four standing savants** (section 6). No sample pages, issues, projects, people or companies.

### 5.2 Home

- A greeting with the person's name and one line: "2 things need you" or "Nothing needs you. The team is working."
- The goal box: "What do you want to be true?"
- The person's goals as cards. Each card shows only:
  - the goal in their words;
  - a progress bar toward the target, with the current number;
  - time left;
  - the faces of the savants on it, gently animated while they work;
  - one line: what's happening now, or what needs them.
- Nothing else.

### 5.3 Kickoff (agreeing the plan)

- A conversation, not a form. The lead's first reply is a short card:
  - **Goal:** December revenue ≥ 130% of November.
  - **How we'll know:** collected revenue, checked every Monday.
  - **The plan:** three bets, one line each.
  - **On it:** faces and roles. The system picked them; specialists such as Sales, Finance or Customer success are added automatically when the goal needs them.
  - **Before we start:** one or two questions, each with a suggested answer.
- Buttons: **Start** (primary), and **Change something**, which opens the chat or voice so the person can just say what to change.

### 5.4 The goal page (the main screen)

Top to bottom:

1. **The goal and the number.** Goal in the person's words; a large progress bar from baseline to target with the current value; time left. If there's no number yet, say what's needed to get one.
2. **Needs you.** One to three decision cards (section 8), with a "See all" link if there are more. If nothing is needed, a single quiet line saying so.
3. **The team.** A strip of the savants on this goal: their animated presence (in the look chosen in settings), name and one plain sentence each about what they're doing now ("Mara is drafting the follow-up to the 12 warm leads"). Tapping a savant shows their recent steps and lets you talk to just them.
4. **Since you last looked.** A short story, newest first, in sentences: "Scout found 40 companies that match your best customers. Forge set up a Monday check-in. Vera thinks the price is too low and explained why." Each line expands to the evidence (the page, email, file or task behind it).
5. **The plan.** Collapsed by default. The three bets and who owns each, editable by talking.

Also on the page:

- **One primary action: Talk.** It opens the call with this goal's team and context already loaded.
- **Watch them work** (secondary) opens a full-screen live view of the team: the lead in the middle, specialists around it, handoffs flowing out and results flowing back. One view, picked in settings; the team-view styles live there, not on this page.
- **Remove from this page:** the strategy paragraph, the "Round 1 · 1 of 10 reported back · Planned by the model" line, the ten view toggles, "Another round", task IDs, and approvals that show raw field changes.

### 5.5 Talk (the call)

- Opens with the mic **on** if permission was granted before. Otherwise one clear "Allow microphone" step, explained in a sentence.
- Big, calm presences for whoever is in the call, live captions of what each person says, and a small "I heard: …" line so the person knows they were heard.
- The person can interrupt any savant just by talking. The speaking savant stops within half a second.
- Savants raise a hand when they have something to add. The person taps it, or just says their name.
- Things agreed on the call become decisions and tasks automatically, and are listed at the end: "Here's what we agreed. Start?"
- Typing works at all times, for people who can't talk out loud.

### 5.6 Savants

- One page per savant: what they're good at, what they've learned (lessons from corrections), their trust level and track record, their **look** (the 15 animated presences) and their **voice** (picked by ear from natural voices).
- Adding a specialist is a sentence: "Add someone who's good at pricing." The system creates them, gives them a name, look and voice, and the person can change those later.

### 5.7 Workspace (underneath)

- The issue tracker and pages, with integrations, stay available from one "Workspace" entry in the sidebar for people who want detail or want to share with humans.
- The main screens must never require opening it.

## 6. The savants and the engine

- **Standing team:** a lead (synthesises and decides the plan), a skeptic (finds the weakest assumption and says what would change their mind), an operator (turns plans into dated steps with owners) and a researcher (grounds everything in what the person's tools actually say). They have generic personas, not tied to any company.
- **Specialists** are spun up per goal from the goal's words: sales, growth, finance, customer success, product, recruiting, and more as needed.
- Every savant is Claude (default `claude-opus-5-5`) with its own role prompt, tools, look, voice and trust level. It works through the person's connected tools and the workspace.
- **Planning** uses the model with structured output: target, measure, bets, owners, questions for the human. Today's date is always in context. Plans are dated in the future and respect the deadline.
- **Asking for knowledge only the person has:** baselines, constraints, relationships, preferences. Ask once, remember it.
- **Corrections become lessons:** when a decision is rejected or edited, the savant records why and applies it next time. Lessons are visible on the savant's page.
- **Trust is earned:** every new kind of action needs approval at first. After repeated approvals, that kind of action can run on its own; the system suggests this, and the person agrees. Anything outward-facing (emails to customers, payments, publishing) always asks unless the person explicitly changes that.
- **Check-ins:** a short Monday summary of the number, what changed and what's next. If the goal is off track, the lead proposes a change of plan and explains why.
- **Everything is on record:** every action, who approved it and what it changed, in an audit log.

## 7. Voice: it must just work

Requirements:

- The person speaks and is heard; the savants answer in natural voices, each different.
- **Interrupting:** under 0.5 s to stop the speaking savant.
- **Response speed:** under 1.5 s from the end of the person's sentence to the first audio on a normal laptop.
- **Echo:** the savants must not hear their own voices through the speakers. Use echo cancellation, and ignore text that matches what was just spoken.

Use open-source models that run in the browser, on the person's machine:

| Job | Model | Notes |
|---|---|---|
| Hearing when someone talks | **Silero VAD**, via `@ricky0123/vad-web` | Detects start and end of speech. Start of speech is the barge-in signal. |
| Speech to text | **Moonshine** (or Whisper base), via `@huggingface/transformers` | Runs in a Web Worker. Use WebGPU when available, otherwise WASM. |
| Text to speech | **Kokoro-82M**, via `kokoro-js` | Runs in a Web Worker. Stream sentence by sentence as the model's text arrives. Each savant gets its own Kokoro voice. Play through Web Audio with an analyser, so the animation moves with the real audio. |

How to ship them:

- Load the models in the browser and cache them after the first download.
- Show one honest progress line the first time ("Getting voices ready, 60%").
- Load the libraries from a CDN inside the workers. Don't bundle the Node build of ONNX Runtime: it is a heavy native binary the browser never uses.
- Fall back to the browser's own speech features if the models can't load, and say so in one line.
- Push-to-talk (hold Space) and open mic are both available; open mic is the default.

## 8. Decisions ("Needs you")

Each decision card has:

- **Who and what, in one sentence:** "Mara wants to email 12 warm leads a pilot offer at $7,500."
- **Why**, in one line, and **what happens if you say yes**.
- **A recommendation:** "Recommended: yes. It matches the price you approved last week."
- **Answers:** Approve, Change (say or type what to change), Not now. Rejecting asks "Why?" with quick picks; the answer becomes a lesson.

Grouping and filtering:

- Small internal changes (renaming a task, adding a comment, writing a draft page) are grouped into one card: "6 small changes. Approve all / Review."
- Never show raw field diffs, IDs or markdown. If a decision has a deadline, show it.
- If the savants make too many proposals, the lead merges them before they reach the person. **The person should rarely see more than five decisions in a day per goal.**

## 9. Words to use

| Don't say | Say |
|---|---|
| Outcome (in UI copy) | Goal |
| Workstream | What [name] is doing |
| Round, iteration | (don't show) |
| Proposal, approval request | Decision / Needs you |
| Issue, ticket, GTM-7 | Task (only in the workspace) |
| Autonomy level | Trust |
| Planned by the model / simulator | (don't show; if offline, "Working offline" once) |
| Agent | Savant |
| Context items | What we're talking about |
| Reasoning board | Notes |

## 10. Personal data and seeding

- The person's name, what they do and their goals come from onboarding and conversation only.
- **No hard-coded people, companies, projects, deadlines, pages or meeting content anywhere in the code or seed data.**
- The seed contains the four standing savants with generic personas and the default workflow states. Nothing else.
- Existing local data from earlier builds is moved to a backup file and the app starts fresh, with a one-line notice.

## 11. Visual direction

- Keep the Linear baseline already in the codebase: tokens, Inter Variable, 0.5px hairlines, dark by default, one accent.
- **Calm, generous spacing.** Large type for the goal and the number. Everything else small and quiet.
- **Motion only means something:** the savants' presences move when they think or speak; handoffs move when work is handed over. Nothing loops for decoration. Respect reduced motion.
- **Presences are the signature.** One look per savant, chosen in settings: signal meter, breathing ring, wave, aura, bars, metaballs, dot orbit, point sphere, halftone, dithered sphere, oscilloscope, smoke ring, spectral rings, LED matrix, ASCII. The ten team-view styles (orbit, constellation, atom, relay tree, radar, swarm, roots, metro map, broadcast, swimlanes) are a setting for "Watch them work."

## 12. Technical constraints (keep)

- **Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, zustand; JSON store with an op log; live updates over Server-Sent Events.
- **Claude API:** `claude-opus-5-5` by default via the Anthropic SDK, with the server-side fallback beta, explicit effort (low for calls, medium for work and planning) and structured outputs for plans. `ANTHROPIC_WORKSPACE_ID` is supported for user-level keys. If the model is unreachable, show one plain line and keep working offline on the simulator.
- **The human gate:** every write by a savant or an external MCP agent passes through it.
- **Security:** a host allowlist and cross-site request refusal on `/api/*`, and binding to localhost. Secrets never reach the browser.
- **Local run:** `npm run local -- --key … --workspace …` sets everything up.

## 13. Done means

1. **First run:** a new user can go from first launch to a running goal in under 90 seconds without reading anything, and the app calls them by their own name.
2. **The goal page:** within five seconds it answers three questions. How far along are we? What needs me? What changed? It has one primary button.
3. **Talking:** the person can say "Hey Atlas, what's the plan?", hear an answer in a natural voice within about 1.5 s, interrupt mid-sentence, and be understood. Tested in Chrome, Edge and Safari on a Mac with built-in speakers, so echo is handled.
4. **Decisions:** a goal with 18 proposals shows at most three decision cards plus one grouped "small changes" card, each with a recommendation, and no IDs or markdown.
5. **Learning:** rejecting a decision and giving a reason produces a lesson visible on the savant's page, and the same mistake is not proposed again.
6. **No leftovers:** a search of the codebase for the founders' names, the companies and the projects from the original meeting returns nothing outside `docs/`.
7. **Checks pass:** typecheck, lint and the end-to-end flows; no console errors.
