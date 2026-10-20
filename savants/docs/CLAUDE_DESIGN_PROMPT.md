# Claude Design brief: Savants v1 — AI that owns your goals

> Paste everything below the line into Claude Design. Attach the screenshots of the current build
> in `docs/design/current/` (they show what exists and what we want to leave behind) and the Emeka
> mark from `public/brand/` if you want the logo on screen.

---

## 0. The ask

Design the v1 interface of **Savants**, by Emeka.

Today's build is functional and ugly: a project-management tool (Linear and Notion merged) with
AI added on, plus a voice room. It looks like every other SaaS app: sidebar, lists, boards,
badges. Throw that thinking away.

Savants is not a task tool. You tell it a **goal** ("Grow revenue 20% by the end of the year"), and
a small team of AI teammates, the savants, **own it**. They figure out what has to happen, make a
plan, do the work through the tools your company already uses, check the numbers, and change the
plan when it isn't working. They ask you before anything important, and they earn more freedom
as they prove themselves.

Design it so that **anyone who has used ChatGPT or Claude can use it in the first minute**, with no
training, no setup wizard and no manual. Then make it beautiful, calm and a little surprising.
Challenge conventional thinking. If a pattern exists only because every SaaS product has it (the
dashboard of tiles, the settings page, the kanban board, the 40-item sidebar), question it, and
replace it with something better or remove it.

## 1. The product in plain words

1. **You say what you want.** One box, typed or spoken: "Get three paying pilot customers by
   December." That's the whole start.
2. **The savants ask a few good questions**, like a smart new hire would: "Do pilots count when
   signed, or when paid?" "Is anyone off-limits for outreach?" "Who signs off on discounts?"
3. **They show you the plan** in plain language: what needs to be true, what they'll try first,
   what they'll need from you. You can push back, talk it through, or say "go".
4. **They do the work** through your connected tools (email, CRM, spreadsheets, Slack, calendar,
   docs, code) and keep a clear record of everything.
5. **They check in when it matters**: a short "needs you" card, on desktop or phone, answerable in
   seconds. Routine things they just do, once you trust them.
6. **They report back honestly**: on track or not, what worked, what didn't, what they changed and
   why. When something fails, they explain it and propose a better approach, tested on past data
   first.
7. **You can talk to them.** Any time, open a call: they discuss the goal with you out loud, in
   their own voices, disagree with each other, and you decide.

Every goal has the same simple shape, and the interface should make it feel obvious:

| What the user sees | What it means underneath |
| --- | --- |
| **Goal** | The outcome, a number and a date ("$60,000 in signed pilots by 31 Dec") |
| **Plan** | What has to be true to get there, and the ideas being tried |
| **Ideas we're testing** | Bets, each with evidence for and against |
| **Work in progress** | Ongoing programmes (e.g. "email 2,000 gold-mining companies in Ghana") |
| **Done** | Every action actually taken, in which tool, by which savant |
| **Needs you** | Decisions waiting for a human |
| **Lessons** | Corrections you gave, which the savants now follow every time |
| **Trust** | How much the savants may do without asking, earned from their track record |

Use these words in the interface. Avoid jargon (no "drivers", "plays", "evals", "agents",
"workflows", "orchestration" on screen).

## 2. Who it's for

Not engineers. People who already use AI chat and want results, not another tool to manage:
founders, general managers, heads of sales or operations, small-business owners, and later the
industrial companies Emeka sells to (manufacturers, miners, exporters in Lagos, Accra, Nairobi).
Many will check it on a phone between meetings. Some will mostly talk to it.

## 3. What to learn from Hone (reference, not a template)

Hone (Moritz Stephan, ex-Cognition; $60M seed led by Benchmark and Index Ventures) launched
"engines": AI that takes responsibility for an outcome rather than a task. Behaviours worth
matching, from their launch video and coverage:

- **Setup as a role, not a configuration.** A leader states what the engine owns, how success is
  measured, and what needs sign-off. The engine then asks for what only the team knows.
- **It learns the company first**, inside the systems it has been given access to, and checks its
  understanding with a person before acting.
- **Corrections become rules** it has to keep following.
- **Trust is earned over weeks.** Week 1: a person approves every action (from Slack). Week 2: it
  works in the background. Week 4: routine work runs on its own and only big decisions need
  sign-off.
- **Because it owns the result, it can change the method**: after a customer churns it writes a
  postmortem, proposes a new approach, tests it against two years of history, then deploys it.
- **Safety**: changes are simulated before they ship, sensitive actions need approval, everything
  is logged.

Savants goes further, and the design should show it:
1. **A team you can see.** Several savants with distinct roles and personalities who sometimes
   disagree in front of you. Disagreement is a feature: it catches bad assumptions early.
2. **You can talk to them**, like a call with colleagues.
3. **Simple enough for anyone.** Hone is built for enterprise operators; Savants should feel as
   easy as opening a chat app.

## 4. Design direction: challenge the defaults

You have full creative freedom on visual language, typography, colour, layout and motion.
Propose **three distinct directions** (for example: an editorial, newspaper-like calm; a living,
spatial "room" with the team present; a radically minimal single-column conversation-and-canvas),
each shown on the home screen and the "needs you" card, then take the strongest one through
every screen. Tell us which you'd pick and why.

Principles every direction must honour:

1. **One obvious place to start.** A single input ("What do you want to achieve?") that accepts
   typing or voice. No empty dashboards, no onboarding tour.
2. **The goal is the home screen, not a menu.** Opening the app answers four questions in ten
   seconds: Are we on track? What happened since I last looked? What needs me? What happens next?
3. **Conversation and structure together.** People are comfortable talking to AI; they also need
   to see the plan, the numbers and the record. Find a form that blends the two without becoming
   a chat log or a dashboard. Anything said in conversation should visibly turn into structure
   (a plan step, a decision, a lesson).
4. **The savants feel present.** Give each one a recognisable identity (colour, shape, voice,
   motion) that carries across the whole product, so users always know who did what and who is
   speaking. Make them feel like colleagues, not icons, without making them cartoonish or human
   faces.
5. **Show your work, gently.** Every claim and number can be tapped to see where it came from, but
   the evidence never clutters the default view.
6. **Trust is visible.** It's always clear what the savants may do alone, what they will ask about,
   and what can't be undone (sending emails, paying, contacting people).
7. **Progressive disclosure.** A first-time user sees a goal, a plan, and "needs you". Power users
   can open the full record, the history, the tool permissions and the strategy detail.
8. **Delight with purpose.** Motion and sound (for calls and approvals) should communicate what is
   happening: thinking, speaking, waiting, done. No decoration for its own sake.
9. **Accessible**: WCAG 2.2 AA, keyboard-friendly on desktop, thumb-friendly on phone, works in
   light and dark.

Brand: the product is **Savants**, made by **Emeka**. You may use the Emeka mark (attached);
everything else about the look is yours to propose.

## 5. Screens and moments

Design these as **moments in the user's day**, not as pages in a sitemap. Merge or split them if a
better structure appears; tell us why.

1. **First open.** One question, one input, a microphone. Three example goals to tap. Nothing else.
2. **Shaping the goal.** The savants ask their few questions; each answer visibly fills in the goal
   card (target, deadline, what counts, what's off-limits, who approves what, which tools to
   connect). If the target is unrealistic, a savant says so and shows the arithmetic. Ends with the
   proposed plan, and "Go".
3. **The plan.** What has to be true, the ideas being tested first, what each savant will do, what
   will need the user. Editable by talking or by direct manipulation. Show it as something easier to
   read than a tree diagram or a Gantt chart.
4. **Home: the goal.** Progress toward the number with an honest forecast, "since you last looked",
   "needs you", and "next". Multiple goals: how does a user with three goals move between them
   without a sidebar of lists?
5. **Needs you.** The approval moment, on desktop and as a phone notification card. What will
   happen, where, to whom, why, what it costs, whether it can be undone, and whether another
   savant disagrees. Approve, decline, or change it in seconds. When the user declines or edits, the
   savant asks one short question and turns the answer into a **lesson**.
6. **Work in progress.** One ongoing programme up close: what it's doing, results so far, real
   examples (the actual emails sent), and simple controls: pause, keep going, change how much it
   may do alone.
7. **When something isn't working.** The savants explain what happened, why, and what they propose
   instead, with a "tested on past data" result, and one savant's dissent if there is one. Ask the
   user to approve the change.
8. **The call.** The live voice conversation with the savants. Keep what's distinctive in the
   current build (each savant's visual moves with its voice, you can interrupt, they raise a hand
   to interject, notes land on a shared board), and make it far better looking and goal-aware: the
   goal's progress and the thing being discussed are on screen; decisions made on the call land in
   "needs you"; the summary writes itself.
9. **Trust and lessons.** How much each savant may do alone, the record behind it ("approved 47,
   declined 2, corrected 5"), and the lessons it follows. What would change if you gave it more
   freedom ("41 of your last 49 approvals wouldn't have needed you").
10. **The record.** Everything that was done, searchable, for the user, their investors or an
    auditor. Plain sentences, not log lines.
11. **Connected tools.** Which tools the savants can see and use, and what they're allowed to do in
    each, with the real logos (Gmail, Slack, HubSpot, Salesforce, Google Sheets, Notion, Linear,
    GitHub and the long tail). Connecting a tool should feel like one tap.
12. **The morning note.** A short daily summary as a phone screen and an email: per goal, one line
    of status, what happened, what needs you, one risk.
13. **Where the work lives.** The existing documents and to-do items (the Linear and Notion part)
    still exist for work people do themselves. Show how they sit underneath goals, so a user never
    has to "manage" them unless they want to.

Also design: empty states, errors (a tool disconnected, numbers out of date, a savant unsure and
saying so), the first week (everything needs approval) versus week four (only big things do), and
a gallery of the core components of your chosen direction.

## 6. Real content to design with

Use these, not lorem ipsum.

**Goal 1 (Emeka itself, a two-founder startup in Lagos applying to YC and a16z Speedrun):**
"Sign 3 paid pilots worth $60,000 by 31 December 2026." Today: $0, 72 days left.
What has to be true: reach 6,000 relevant contacts (100 so far), get a 3% reply rate (0% so far:
100 emails in September, all read, no replies), 18 discovery calls, 6 proposals, 3 signed.
Ideas being tested:
- Mid-sized gold producers in Ghana care more about the cost of equipment downtime than about
  quoting. Evidence: one research note, no customer conversations yet. Vera, the skeptic, says:
  "This is an assumption, not evidence. Two calls would tell us."
- Flower growers and exporters in Kenya need cold-chain visibility. Evidence: thin.
- Warmed-up sending domains will lift replies above 2%. Evidence: industry norms only.
Work in progress: warming 4 email domains (day 9 of 14, health 92%); 1,214 of 2,000 Ghana contacts
verified; research on Kenyan flower exporters' top three problems.
Needs you: approve email version 2 before it goes to 2,000 people (can't be undone once sent);
approve $180/month for two more sending domains; answer Vera's challenge on the gold-mining idea.

**Goal 2 (a customer, to show the bigger-company case):** a Lagos maker of industrial fasteners
(₦4.1bn revenue last year): "Grow revenue 20% by the end of the year." The plan: quote faster
(4.2 days → 1 day), win more quotes (18% → 24%), win back 40 quiet accounts, fix 312 products priced
below margin after the naira moved. Tools: SAP Business One, Gmail, WhatsApp Business, a pricing
spreadsheet. The commercial director approves any discount above 8%. Show it six weeks in: revenue
on track, win rate behind, a "this isn't working" moment waiting.

**The savants:** Atlas (lead, frames decisions and keeps things moving), Vera (skeptic, asks for
evidence), Forge (operator, turns plans into action), Scout (researcher, finds what the data
actually says). The users: Erioluwa Morenikeji and a co-founder.

## 7. Things to avoid

- A blank chat window as the whole product, or a dashboard of tiles as the home screen.
- Kanban boards, sidebars full of lists, settings pages as the main way to control behaviour.
- Generic "AI" clichés: sparkles, magic wands, glowing orbs with no meaning, robots, purple-blue
  gradients by default.
- Jargon on screen (agents, workflows, evals, orchestration, pipelines).
- Hiding risk: anything irreversible must say so plainly before it happens.
- Fake precision (confidence percentages as decoration) and vanity metrics (counts of "AI actions").

## 8. Deliverables

1. Three visual directions on the home screen and the "needs you" card, with a recommendation.
2. The chosen direction across moments 1–13, desktop (1440) and phone (390), light and dark.
3. A clickable prototype of the core loop: say a goal → answer three questions → approve the
   plan → a week later, open the app → approve something on the phone → hear from the savants on
   a short call → a "this isn't working" moment → approve the new approach.
4. A gallery of core components and the savants' identities.
5. One short paragraph per moment: which conventional pattern you challenged and what you did
   instead.
6. The five questions you would ask us before designing v2.
