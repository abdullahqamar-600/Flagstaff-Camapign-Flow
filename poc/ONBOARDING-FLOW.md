# Flagstaff Social — Onboarding POC: how it works, what it does

> Context doc for `poc/`. Written after walking the flow end-to-end in a browser
> and reading `poc/app.js` line by line. Covers the runtime architecture, every
> step of the conversation, the branch points, what gets written where, and the
> gaps found along the way.

---

## 1. What this is

A **click-through prototype of first-run onboarding** for Flagstaff Social — a
social-marketing product whose agent is called **Scout**.

The premise: instead of a settings wizard, onboarding is a *conversation*. Scout
introduces itself, connects the user's X account, reads the profile, reads the
website, proposes a brand model, gets it accepted, drafts and publishes a first
post, scores the profile, then hands off to the app dashboard. By the end, the
product claims to have built a "marketing infrastructure" — a knowledge base,
trend monitoring, posting windows, a content strategy.

It is a **demo, not a product build**. There is no backend, no API, no auth, no
persistence. Every "scan", "analysis" and "generation" is a scripted animation
over hardcoded persona data. The value is in the *choreography* — pacing, copy,
what surfaces when — not the logic behind it.

### Where it lives

```
poc/
  index.html      view shells, SVG icon sprite, sidebar, topbar, demo controls
  app.js          ~4750 lines, one IIFE — all state, all steps, all rendering
  styles.css      onboarding + app shell styling
  scout-flow.css  styles for the campaign panels injected from designs/
designs/
  _shared.css, _campaigns-components.css   shared with poc
  create-campaign.html                     the campaign-creation surface
design-system/
  tokens.css, tokens.json, design-language.md, campaigns.md
index.html        root redirect → /poc/index.html
```

No build step, no framework, no dependencies. `app.js` is a single IIFE loaded at
the end of `<body>`; every DOM node is built with a small `el(tag, attrs,
children)` helper.

### Running it

`.claude/launch.json` defines a `poc` server: `python3 -m http.server 8766`.

```bash
python3 -m http.server 8766
```

Then open one of the entry points below.

---

## 2. Entry points — `boot()` routes on `?view=`

`boot()` (app.js:4708) binds the demo controls, sidebar nav, Scout-panel routing
and the create-campaign landing, forces the composer disabled, then picks a
landing view from the query string:

| URL | Lands on | Notes |
|---|---|---|
| `?view=splash` | 3-screen splash → conversation | **The full onboarding.** Clears the splash-seen flag first. |
| `?view=conv` | conversation, skipping the splash | Jumps straight to Scout's greeting hero. |
| `?view=home` | post-onboarding Home dashboard | |
| `?view=create` / `?view=create-campaign` | `designs/create-campaign.html` | Hard redirect. |
| *(none — default)* | **Campaigns dashboard** | |

The important consequence: **opening `/poc/index.html` with no query string does
not show onboarding.** It lands on the Campaigns list. Onboarding is
`?view=splash`.

`localStorage['flagstaff_seen_splash']` is written when the splash ends, and
cleared by `?view=splash` — but `boot()` never *reads* it to make a routing
decision, so today it is a vestigial flag.

### Demo controls (bottom-right pill)

- ↺ **Restart demo** — `location.reload()`
- → **Skip to dashboard** — marks the stream started and calls `enterApp()`
- Hidden: <kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>N</kbd> toggles
  `state.xAccountMaturity` between `established` and `new`, which swaps the
  profile-scan branch (see §7, Act 1).

---

## 3. Runtime architecture

### View model

`index.html` ships every screen as a `<section class="view">`; `showView(id)`
toggles `view--active`. The views:

| id | Purpose |
|---|---|
| `view-splash` | 3-screen pre-conversation splash |
| `view-conv` | the conversation (owns the greeting hero, the chat stream, the composer, and the Knowledge rail) |
| `view-dash` | Home dashboard (post-onboarding) |
| `view-campaigns` | Campaigns list |
| `view-scout-p2`, `-p2-5`, `-p3`, `-kb`, `-failures`, `-composer`, `-playground` | campaign-flow panels, fetched at runtime from `designs/{file}.html` |

Two body-level modes swap the chrome: `mode-onboarding` (set in the HTML) and
`mode-campaigns` (set by `enterPanelMode()` once onboarding finishes). The
sidebar uses `sidebar__btn--onboarding-only` / `--campaigns-only` to show
different nav sets per mode.

### The Scout panel loader

`loadScoutPanel(file)` (app.js:4379) `fetch`es a *design document* from
`designs/`, parses it with `DOMParser`, extracts `main .panel`, extracts the
page's `<head><style>`, extracts the inline SVG sprite, and injects the three
into a view. It then aggressively strips design-doc scaffolding — state
catalogs (`.p1-states`, `.state-block`, `.spec__section-head`…), duplicate
parallel `<section>` states, `.home-footnote` — so a spec sheet renders as a
single product surface.

This is a neat trick and also a fragile coupling: **the product surface is the
design file**. Note that of the seven files `SCOUT_PHASES` references
(`phase-2-review`, `phase-2-5-inflight`, `phase-3-home`, `kb-drawer`,
`failure-modes`, `composer-hedging`, `post-playground`), **none currently exist
in `designs/`** — only `create-campaign.html` and `campaign-components.html` do.
Those phases will throw on fetch.

### State

One mutable object (app.js:17):

```js
state = {
  accountType: 'brand' | 'individual',   // chosen in the greeting hero
  user: { name: 'Abdullah' },            // hardcoded, "captured at sign-up"
  kb: {                                  // the Knowledge rail
    activeId: 'brand',
    actionCallback: null,
    brand:     { facts: [], expanded: false },
    trending:  { facts: [], expanded: false },
    algorithm: { facts: [], expanded: false },
  },
  brand: null,          // deep copy of the chosen demo persona
  productLines: [], topics: [], goals: [], audience: '', tone: '', competitors: [],
  selectedTrendGroupId: null, selectedIterationId: null,
  draftPost: '', publishedPost: null,
  skipped: new Set(),   // 'x-connect' | 'product-lines' | 'first-post'
  xAccountMaturity: 'established' | 'new',
}
```

`state.skipped` is the only real branch memory — it gates later steps (e.g. the
profile score is skipped entirely if X was never connected).

### Demo personas

Two frozen fixtures, selected by `accountType`:

- **`DEMO_BRAND`** — *rasa*, `@rasa`, heritage fashion, Karachi. 4,320 followers,
  bio "Heritage, restitched…", products, themes, top-performing topics with
  engagement percentages, primary/secondary audience, peak activity, three
  `toneDirections` (each a label + sample post), three `trendGroups`, and a
  `postIterations` map of drafted post bodies per trend group.
- **`DEMO_INDIVIDUAL`** — *Abdullah Qamar*, a designer persona with `topics`
  instead of `products`.

`step1_opening` copies the persona into `state.brand` and seeds `audience`,
`tone` and `competitors` from it. Every later "Scout discovered X" moment is
reading these fields back out.

---

## 4. Interaction primitives

These are the reusable moves the whole conversation is assembled from.

| Primitive | What it does |
|---|---|
| `scoutMsg(text, {beat, typingFor, charSpeed})` | Avatar-as-loader thinking beat → typewriter reveal → `highlightKeywords()` wraps numbers, brand names and key verbs in `<strong class="kw">`. Only the newest Scout turn keeps its avatar/name head; earlier ones are marked "past" so the chat reads as one live speaker. |
| `userMsg(text)` | Right-aligned white bubble, no avatar. |
| `quickReplies(options, {primaryIndex, settleMs})` | Pill row. All pills stay clickable after choosing; the picked one highlights, the rest dim; the choice **commits after ~1.5s of idle** so the user can change their mind. |
| `selectionChips(options, {maxSelections, allowCustom})` | Multi-select with a "Pick up to N" helper; unselected chips get `chip--capped` when the cap is hit; a Done button resolves. |
| `narratedProcess(label, lines, {lineBeat})` | The "Scout is working" device. A single anchored icon plate cross-fades its glyph while one line of ambient indigo text at a time fades up/in and up/out. No card, no list, no progress bar. |
| `confirmationCard({title, rows, primary, onEditField})` | Labelled rows, each pencil-editable inline. |
| `inlineTextInput({placeholder, submitLabel, initial})` | One-line input appended to the stream. |
| `productLineTreeCard(lines)` | Master-brand → per-line tree with audience/tone chips + "Looks right". |
| Brand drawer | See §6. |

### The composer is deliberately inert — and never wakes up

The chat bar is disabled by default; the code comments say it is enabled only
while `awaitComposer()` is pending, so that "at every other moment the composer
reads as inert and the user knows to interact through the controls Scout has
surfaced."

**`awaitComposer()` is defined but never called anywhere in `app.js`.** The
composer is therefore disabled for the entire onboarding. This matters because
Scout's materials step says *"Drop your website link or upload any brand docs in
the chat"* — and the chat cannot be typed into. The URL is auto-staged by the
script instead (§7, Act 2).

---

## 5. The Knowledge rail

Right-hand rail in the conversation view, `renderKB()` (app.js:1277). Three
blocks, defined by `KB_META`:

| id | Label | Empty-state copy |
|---|---|---|
| `brand` | **Brand** (or **About you** for individuals) | Identity, products, niche, voice |
| `trending` | **Trending** | Trends, competitors, audience patterns |
| `algorithm` | **Platform Algorithm** | X algorithm and content rules |

Block state precedence is `expanded > active > filled > empty`. The **active**
block — whichever KB was written to most recently — shows a "Building…" status
with staggered dots plus drifting blurred blobs behind a veil. Filled blocks
collapse their facts to `label · label · label · +N more`. Clicking a block
expands it to a full fact list over a body-level dimming overlay; the overlay
click-to-close is suppressed while `state.kb.actionCallback` is set (a
confirmation moment locks the panel open).

`addKBFact(kbId, label, value)` is upsert-by-label, sets `activeId = kbId`, and
re-renders. Observed sequence during a brand run:

1. `brand` ← Handle, Followers, Best format, Peak activity *(profile scan)*
2. `brand` ← Brand, Positioning, Themes, Products *(site scan)*
3. `brand` ← Niche, Themes, Products *(first drawer review)*
4. `brand` ← one fact per product line
5. `brand` ← Goals, KPIs
6. `trending` ← Top trend, Competitors, Peak window *(niche scan)* — **the
   active block visibly moves from Brand to Trending here**
7. `brand` ← Audience, then Tone
8. `trending` ← Selected angle
9. `brand` ← First post

**The Platform Algorithm block is never written to.** It stays in its empty
state for the whole flow, even though the infrastructure-build narration claims
"X algorithm rules and content guardrails. Loaded."

---

## 6. The brand drawer ("About your brand")

A right-side panel that Scout fills live, opened twice.

- `openBrandDrawer()` mounts drawer + backdrop + a minimize tab, and adds
  `brand-drawer--open` inside a `requestAnimationFrame`.
- `computeBrandDrawerSections()` derives the section list *from current state*:
  Identity, Themes, Products (brands) / Topics (individuals), Product lines,
  Top performing topics, Audience, Tone (only once `state.toneSample` exists),
  Peak activity, Goals.
- `refreshBrandDrawer()` is idempotent and queued — it only animates sections
  not already in `drawerState.rendered`, so re-calling it after each state
  mutation appends just the new material.
- `writeDrawerSection()` fades a section in, then typewriters into any
  `[data-write="1"]` target.
- Footer: **Not quite** | **Accept**. Accept resolves the awaiting promise,
  posts an `Accept` user bubble, and closes the drawer.

### "Not quite" is a dead end

`enterNotQuiteMode()` swaps the footer for a `<form>` with one text input and an
arrow button. On submit, `handleNotQuiteSubmit(text)` shows "Adjusting based on
your note…", waits 1.4s, and restores the Accept/Not quite buttons.

Two problems, both verified in the browser:

1. **The typed text is discarded.** `handleNotQuiteSubmit` never reads
   `promptText` — nothing in state changes, no drawer section updates, no Scout
   turn. It is pure theatre.
2. **The form cannot be submitted from the UI.** The arrow button is
   `type="button"` with no click handler, so clicking it does nothing; and
   pressing <kbd>Enter</kbd> in the input did not fire the form's `submit`
   listener in testing. Calling `form.requestSubmit()` from the console *does*
   run the handler, confirming the listener is wired but unreachable. Fix is a
   one-liner: `type: 'submit'` on the arrow button.

---

## 7. The conversation, act by act

`runConversation()` (app.js:2935) is the whole script — a linear `await` chain
with a handful of branches. Copy below is verbatim from the brand path.

### Splash (before the conversation)

Three full-bleed screens, left copy + right animated visual, with Skip / dots /
Back / CTA. CTA labels: `Next`, `Next`, `Let's craft your first post`.

1. **"Posts that sound like you. Not like everyone else on the internet."** —
   Scout as an AI marketing partner that learns voice, audience and live niche
   trends. Right side: a drifting mosaic of post cards.
2. **"A knowledge base, built from you."** — right side plays a scripted
   drawer-filling animation: "What's working" → "About your brand" with
   identity, themes and topic bars writing themselves in. This is the splash
   *teaching the mental model* the real drawer will use.
3. **"Numbers that matter. Not just impressions."** — growth/saves/share-of-voice
   framing over a post grid with an `↑ 0.2× vs. your previous baseline` stat.

`endSplash()` writes the seen-flag, cross-fades to `view-conv`, and calls
`runConversation()`.

### Act 1 — greet and connect

**`step1_opening()` → `openingHero()`.** A staged hero, not a chat message:
logo scale-in → *"Hi, Abdullah."* → *"I'm Scout, your marketing strategist."* →
*"Tell me who I'm setting up for."* → two blocks:

| | |
|---|---|
| **Individual** | Solo creator, freelancer, or thought leader |
| **Brand** | Company, agency, or multi-product brand |

**This is the only true fork in the flow.** It sets `accountType`, copies the
persona into `state.brand`, and renders the Knowledge rail for the first time.
The hero exits in reverse order and the composer fades into its bottom slot.

Then Scout's greeting: *"Perfect. I'll learn your brand the way you'd describe it
to a friend — your voice, your audience, what's already landing. Five minutes,
max."*

**`step5_x_connect()`.** *"First step, connect the account where you publish.
I'll read what's working and build from there."* → a **Connect a social account**
card, subtitled "Read-only. Scout never posts without your approval.":

- **X** — active, `Connect`
- **Instagram / Facebook / TikTok** — "Coming soon" pills
- **Skip for now**

Connect opens a simulated OAuth dialog — *Authorize Flagstaff Social · wants to
access your X account · Read your profile and posts / See accounts you follow /
View engagement on your posts · Read-only. Flagstaff cannot post without your
approval* · **Cancel** | **Authorize app**. While it is open the X row reads
"Connecting…", then "Connected"; the card retires itself after Scout's ack.

> **Branch.** *Skip for now* → `state.skipped.add('x-connect')`, Scout pivots to
> "share what you've got", and the whole profile scan **and** the later profile
> score are skipped.

**`step6_profile_scan()`** (connected path only). `narratedProcess` walks:
pulling profile + last 50 posts → follower count → bio quote → *"Posts about
heritage origin stories outperform product posts by 3.1×"* → peak activity →
*"Bookmarks are your strongest signal. People are saving, not just liking."* →
following-list positioning. Then a **Twitter-faithful profile header card**
(banner, avatar, verified name, handle, bio, location, join date, following /
followers).

> **Branch.** With `xAccountMaturity: 'new'` the narration instead admits there
> is no engagement history and leans on interests, follows and bookmark
> patterns, closing with *"we get to set the strategy from scratch. No bad
> habits to unlearn."* — and renders an empty-state preview.

### Act 2 — materials, then the first review

**`stepMaterials()`.** *"Want to deepen this? Drop your website link or upload
any brand docs in the chat. Or describe in your own words. Whatever you share,
I'll learn from."* — then the script **auto-posts `https://rasa.studio` as if
the user typed it** (the composer is disabled; see §4) and narrates a site scan:
three product categories, a founder story on the About page, craftsmanship and
ethical-sourcing messaging, colour palette and tone extraction.

Closes with *"Anything else, or are we good with this?"* → `That's everything` |
`Add more later`.

**`step_brand_review_first()`.** *"Here's what I've pulled together about your
brand. Take a look on the right and accept when it reads right."* The drawer
opens and writes: **Identity** (rasa · Fashion / Heritage · Karachi, Pakistan ·
"Modern Gen Z take on traditional Pakistani crafts"), **Themes** (Heritage,
Sustainability, Local artisanship), **Products**, **Top performing topics**
(Heritage origin stories +92%, Behind the scenes artisan +67%, Styling guides
+45%), **Audience**, **Peak activity** (Weekdays 2 to 4pm PKT). Accept closes it
and posts an `Accept` bubble.

### Act 3 — structure and intent

**`step3_product_lines_brand_only()`** (brands only). *"Does rasa have distinct
product lines that should speak to different audiences?"* →
`Yes, multiple lines` | `No, one brand voice` | `Not sure`.

- *Not sure* → a clarifier: `Different customer types` | `Same customer`; "same"
  collapses to the single-voice path.
- *No* → `skipped.add('product-lines')`, *"Got it, one master voice."*
- *Yes* → Scout asks for detail and the script **auto-posts a scripted three-line
  answer**, narrates building one context per line, and renders the **Brand
  knowledge structure** tree: Heritage Capsule (Women 28–40, occasion led ·
  Reverent, refined), Everyday Edit (Women 22–34, daily wear · Casual, witty),
  Atelier (Collectors, gift buyers · Considered, premium) + **Looks right**.

For individuals this is replaced by `step_topics_individual()` — a multi-select
of topics with an "Add your own" custom chip.

**`step4_goals()`.** *"Before I dig in, what are you trying to achieve on X?
Pick up to 3."* over six chips (Grow audience, Drive traffic to site, Build
thought leadership, Boost sales, Increase brand awareness, Generate leads).
Scout then renders a **How I will measure that** card mapping each goal to KPIs
— e.g. *Grow audience → Follower growth rate · profile visits from posts*;
*Build thought leadership → Bookmark rate · reply quality · saves to likes
ratio* — and closes *"These become the targets I'll optimize your content
around."*

### Act 4 — market scan, audience, final review, voice

**`step7_intel_scan()`.** Narrated niche scan: `#SouthAsianHeritageWeek` up 4.2×
w/w, competitor `@generation.pk` at 22k views in 18h, 5 competitors + 12 niche
creators detected, peak window weekdays 1–4pm PKT, *"heritage explainers paired
with modern visuals"*. Renders a three-item trends card and writes the
**Trending** KB — which is when the rail's active block visibly moves.

**`step_audience_infer()`.** Audience is *proposed, not asked*: *"Based on
everything, your brand, your X data, and what's working in your niche, here's
who I'd target:"* → *"Women 22 to 34 in Pakistan, the UAE, and the Pakistani
diaspora, culturally curious, mobile first, value heritage with a modern eye."*
→ evidence: *"Saves run 3× the niche average on context rich posts versus pure
product shots."* → `That's right` | `Adjust audience` | `Different audience in
mind`.

> **Branch.** Adjust/Different open an inline text input (pre-filled with the
> proposal for Adjust, blank for Different) and write the result to
> `state.audience`.

**`step_brand_review_final()`.** The drawer reopens with everything added since:
Product lines, validated Audience, Goals. Accept → close.

**`step_tone_voice()`.** *"…here are three tones that stood out — which one
would you prefer?"* Three cards, each a **written sample post** in that voice:

| Tone | Sample |
|---|---|
| Warm, story led | "Heritage isn't an aesthetic. It's a postcode and a person who can name the stitch…" |
| Direct, candid | "We don't 'reinterpret tradition'. We work with people doing it now and we pay them properly…" |
| Reverent, grounded | "Sindhi mirror work. Mid century origins. Bibi taught us. She's been at it 31 years…" |

Picking posts a `Picked: …` bubble, dims the others, and commits after ~1.5s;
Tone then appears in the drawer and the KB. *"Got it. Calibrating to that
voice."*

Ordering is deliberate: tone comes **after** the trend knowledge is accepted, so
the voice choice reads as "given everything we now know, here's what fits."

### Act 5 — first post

**`step_post_directions()`.** A "Your first post" banner, then *"I've drafted
three directions for your first post. Each rides a different angle and bundles a
tone, a format, and a visual."* — narrated drafting (voice signals → live trend
window → generating a visual per angle → stitching), then **three full X-post
previews**: avatar, verified name, handle, "now", the drafted body, a generated
image (shimmer-in), tone + format chips, and a full X action row
(12 replies / 4 reposts / 87 likes / 1.2K views / bookmark / share).

Picking one sets `draftPost` and writes `Selected angle` to the Trending KB.

> **Branch.** **Save these and decide later** → `skipped.add('first-post')`,
> Scout replies *"Saved. The drafts will be waiting on your dashboard when
> you're ready."* and the publish step is skipped entirely.

**`step_edit_publish()`.** *"Edit anything you want. When it's right, hit
Publish."* — an editable textarea with a live `n / 280` counter and a
**Publish** button. Publishing renders a **LIVE** post card with zeroed metrics
and *"Tracking from here. I'll surface results on the dashboard."*

### Act 6 — profile score, build, handoff

**`step_profile_score()`** (skipped if X was never connected). *"When someone
sees your post and considers following, they visit your profile. It has about
three seconds to convert them. Let me score it."* → narrated audit → a
**Profile score** card. Score is computed as `ok / total`:

| | |
|---|---|
| ✅ | Profile photo reads clear and on brand |
| ✅ | Bio communicates niche in one line |
| ⚠️ | No CTA in bio. Add a link to shop or newsletter |
| ❌ | No pinned post. Your strongest piece should sit at the top |
| ✅ | Website link present |
| ⚠️ | Banner is generic. A heritage visual would carry your positioning |

3 of 6 → **50%**. Actions: `I'll fix these later` | `Show me how`.

> **Both buttons lead to the same next line** — *"I'll keep these in your
> dashboard. Each one becomes a quick win when you have a few minutes."* The
> "Show me how" branch is currently cosmetic.

**`step_infrastructure_build()`.** The payoff beat — five checkmarked lines:
Brand knowledge base *Locked* · X algorithm rules and content guardrails
*Loaded* · Trend monitoring for your niche *Active* · Optimal posting windows
*Calibrated* · Content strategy *Configured*.

**`step13_handoff()`.** *"Everything's ready, Abdullah. Your first post is live.
The dashboard tracks it from here, alongside drafts, trends, and what's
working."* (or a softer variant if nothing was published) → `enterApp()` →
`goToHome()`.

---

## 8. What happens after onboarding

`enterApp()` → `goToHome()` → `enterPanelMode()` swaps `mode-onboarding` for
`mode-campaigns`, which changes the sidebar nav set, and shows `view-dash`.

The Home dashboard renders four stat tiles (Active campaigns / Posts scheduled /
Pending review / Published 30d), a **Recent activity** feed, and a **Scout's next
moves** column of suggestion cards ("Build toward Oct 27", "Replay your reply
winner", "Use the Track 5 chatter").

**Note the persona break:** the dashboard is hardcoded to a *different* demo
account — `@swiftie.central`, a Taylor Swift fan account, with campaigns like
"Rank the Eras Poll" and "Cornelia Street Clues". Nothing the user just built as
*rasa* — not the published post, not the goals, not the brand — appears on the
screen onboarding hands off to. For a demo this is a visible seam: the payoff
screen contradicts the five minutes that preceded it.

Sidebar nav only wires `home` and `campaigns`; the other buttons are decorative.

---

## 9. Branch map

```
splash (skippable)
└─ hero: Individual ─┬─ topics multi-select
                     │
   Brand ────────────┴─ product lines: Yes / No / Not sure→(Different|Same)
                        │
   X connect ─┬─ Authorize → profile scan ─┬─ established: full read
              │                            └─ new: interests/follows read
              └─ Skip for now ──────────────── (no scan, no profile score later)

   materials → drawer review #1 (Accept | Not quite*)
   goals (≤3) → KPI card
   niche scan → audience: That's right | Adjust | Different (inline input)
   drawer review #2 → tone (3 cards)
   directions ─┬─ pick one → edit → Publish → LIVE card
               └─ Save these and decide later (skips publish)
   profile score: I'll fix later | Show me how  → same outcome
   infrastructure build → handoff → Home dashboard
```

`*` "Not quite" currently changes nothing — see §6.

---

## 10. Findings and caveats

Behavioural gaps found while walking the flow:

1. **The composer never activates.** `awaitComposer()` is dead code; the chat
   bar is disabled for the entire onboarding while Scout's copy invites the user
   to type into it. All "user-typed" messages are auto-staged by the script.
2. **"Not quite" cannot be submitted, and discards its input.** Arrow button is
   `type="button"` with no handler; the feedback text is never read. (§6)
3. **The Platform Algorithm knowledge base is never filled**, despite being one
   of three rail blocks and being claimed as "Loaded" in the build narration.
4. **"Show me how" on the profile score is a no-op branch** — identical outcome
   to "I'll fix these later".
5. **Post-onboarding dashboard shows an unrelated persona** (`@swiftie.central`)
   rather than the brand just onboarded. (§8)
6. **Six of seven `SCOUT_PHASES` panels point at files that don't exist** in
   `designs/`, so those routes will fail on fetch. (§3)
7. ~~**All image assets 404.**~~ *Fixed.* All 19 root-level assets
   (`Banner.jpeg`, `BannerBrand.jpeg`, `Profile.png`, `ProfileBrand.jpeg`,
   `PostA–C.jpeg`, `IndividualPostA–C.jpeg`, `Posts/1–9`) had been deleted in
   commit `0b5dced` "Add campaign flow prototype" while the code kept
   referencing them, so every card fell back to its gradient tint. Restored
   from `0b5dced^`.

Environment notes for anyone re-testing in a headless/hidden browser: the flow
is driven by `setTimeout` chains and `requestAnimationFrame`, both of which
Chrome throttles hard on a hidden page. Timers can stall to roughly one tick per
30–60 seconds, and `requestAnimationFrame`-gated classes (`brand-drawer--open`,
`view--entered`) may never apply. Screenshot/interaction calls un-throttle the
page temporarily. Patching `window.setTimeout` to run callbacks on a microtask
collapses the scripted waits and lets the flow run gate-to-gate at full speed.
