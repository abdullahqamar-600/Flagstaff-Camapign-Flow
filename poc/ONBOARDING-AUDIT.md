# Onboarding — product design audit

> Audit of the first-run onboarding prototype in `poc/`, run as five independent
> passes (interaction, accessibility, design-system conformance, flow/cognitive
> load, responsive/edge cases) plus a deterministic anti-pattern scan, then
> reconciled. The yardstick is **this project's own `design-system/design-language.md`**,
> not a generic rubric — most of the sharpest findings are places where the
> prototype contradicts a rule the team already wrote down.
>
> Companion doc: [ONBOARDING-FLOW.md](ONBOARDING-FLOW.md) describes how the flow works.
> Findings marked ✅ were independently verified against the code or the running app.

## Known weakness of this audit

Four of the five passes worked from **source only** — deliberately, to avoid five
agents fighting over one browser tab. That made the code findings precise and the
*rendered* findings thin. My own visual pass covered the brand path at a single
viewport.

Two consequences, both real:

1. **P1-9 was missed entirely.** A defect that only exists once rendered (a flex
   item stretching because nothing set `align-self`) is invisible in source, where
   the rule reads as correct.
2. **The individual path was never rendered at all** during the audit. Everything
   visual was judged on the brand persona.

If you re-run this kind of audit, budget one pass whose only job is looking at
rendered screens — both personas, three viewports — and give it no source access
at all, so it reports what it sees rather than what the code says it should see.

---

## Design health

| # | Nielsen heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2/4 | Narrated processing is genuinely excellent. But no progress indicator after the splash dots, the pending-commit state is invisible, and the composer is disabled with no stated reason. |
| 2 | Match system / real world | 3/4 | Scout's voice is strong and the X chrome is faithful. Undercut by invented engagement metrics on unpublished drafts and "Published (30d): 28" shown to a first-run user. |
| 3 | User control and freedom | **0/4** | No back, no undo, no edit, no resume. The OAuth modal cannot be cancelled. The one correction affordance discards its input. |
| 4 | Consistency and standards | 1/4 | Seven different commit mechanics. Four live colour systems. Tone cards are `<button>`, direction cards are `<div>`. §8 component specs diverge on nearly every property. |
| 5 | Error prevention | 1/4 | The 280-character limit is decorative. Empty Publish silently halts the flow forever. "Not sure → Different customer types" resolves to the opposite answer. |
| 6 | Recognition rather than recall | 3/4 | The chat log keeps history visible and the Knowledge rail externalises memory — the right model. Lost a point for questions that live only in a placeholder and vanish on first keystroke. |
| 7 | Flexibility and efficiency | 1/4 | The primary decision of the whole flow is unreachable by keyboard. No shortcuts, no way to skip narration, no fast path for a returning user. |
| 8 | Aesthetic and minimalist design | 3/4 | Genuinely restrained and handsome. Lost a point for 25 perpetual animations and decorative fake metrics. |
| 9 | Error recovery | **0/4** | There is no error state anywhere in the onboarding flow. The only error UI in the app is an unstyled dev string. |
| 10 | Help and documentation | 2/4 | Scout's reasoning-attached copy *is* the help, which is the right instinct. But there's no way to ask "why", the icon-only nav has `title` only, and the loading state leaks an internal filename. |
| | **Total** | **16/40** | Needs work |

**Read the score correctly.** Most shipping interfaces land 20–32. This is a demo
prototype, and it scores like one: the three categories it fails outright —
control/freedom, error prevention, error recovery — are exactly the ones a demo
never needs and a product cannot ship without. The 16 is not a verdict on the
design taste, which is good. It's a map of what productionising costs.

---

## Does it look AI-generated?

**Not at a glance — and that's an achievement.** The restraint is real: tinted
neutrals carry almost everything, one indigo accent, generous whitespace, actual
typographic hierarchy, and the two best ideas in the flow (avatar-as-loader,
narrated processing instead of spinners) are not patterns you see in generated
UI. A design director would not immediately say "AI made this."

The tells that *are* present, in order of how much they cost:

1. **Violet/purple as the AI signifier**, plus a sparkle icon. The single most
   saturated visual cliché in AI products. The deterministic scan flagged it
   unprompted ("AI colour palette — purple/violet accent"). §3 of the design
   language says *"Violet appears only inside the AI gradient pair. Never used
   alone"* — and `.proc-line__pointer` / `.proc-line__icon` are flat `#7c3aed`. ✅
2. **The Home dashboard is textbook slop** and would be identified instantly:
   four structurally identical stat cards from a `.map()`, each label / big
   number / delta, in a `repeat(4, minmax(0,1fr))` grid, with eight raw hex
   values and no card border. That's the hero-metric template and the identical
   card grid in one component. ([app.js:4243](app.js:4243), [styles.css:6639](styles.css:6639)) ✅
3. **Three-up card rows, three times** — splash post grid, tone cards, direction
   cards — plus the KB tile row. Composition monotony.
4. **10 pulsing status dots** flagged by the scan; 25 `infinite` animations total. ✅
5. **LLM cadence in the copy.** 10 of 28 Scout turns open with an acknowledgement
   token ("Got it / Perfect / Good / Connected / Updated"), against §2's own
   *"No filler"* rule. ✅
6. **Glass drifting toward house style.** 8 `backdrop-filter` uses; the scrims are
   legitimate, but `.campaigns-panel` and `.scout-rationale` put frosted glass
   under primary reading content, and a comment in `scout-flow.css` propagates
   the pattern forward on purpose.

**Clean passes worth noting:** zero gradient text, zero colored side-stripe
borders, and modal-as-first-thought is genuinely resisted — both actual dialogs
are dead code, and the live surfaces are a drawer, a panel, and a flex sibling
with a comment explaining why it must *not* read as a modal. Somebody was
thinking.

---

## What's working

Three things are better than the industry norm and should be protected in any rewrite.

**1. Tone selection by sample post.** You choose a voice by *reading three posts
written in it*, not by picking an adjective off a list. This is the best single
interaction in the product. Every competitor ships a "Professional / Casual /
Witty" dropdown; this one makes the abstraction concrete and lets the user
recognise themselves instead of describing themselves. ([app.js:2387](app.js:2387))

**2. Narrated processing.** §1 says *"Loading spinners are a smell. Progress is
content."* The implementation delivers: one line at a time, an anchored icon
plate cross-fading, ambient indigo text. It converts dead waiting into evidence
that Scout is doing work. The avatar-as-loader — where the thinking state *is*
Scout's mark, with no separate spinner element — is the same idea executed even
better. ([app.js:774](app.js:774), [app.js:323](app.js:323))

**3. Direction cards rendered in destination chrome.** Showing the drafted post
as a real X post — avatar, verified tick, handle, timestamp, action row — lets
the user evaluate the output where it will actually live. Far stronger than a
plain textarea preview.

The Knowledge rail deserves half a mention: the *idea* (three knowledge bases
filling in real time, with the active one visibly building) is the best
structural concept in the product. Its execution is the biggest missed
opportunity in this audit — see E1.

---

## P0 — must fix

### P0-1 · The handoff hands the user to a different company ✅

`enterApp()` → `goToHome()` → `buildHomeView()`. `HOME_STATS`, `HOME_ACTIVITY`
and `HOME_SUGGESTIONS` ([app.js:4243-4262](app.js:4243)) are frozen constants
with **zero** reference to onboarding state.

Scout says *"Everything's ready, Abdullah. Your first post is live."* The screen
that renders shows an account switcher reading **@swiftie.central**, stat tiles
claiming **28 posts published in the last 30 days**, and an activity feed about
*1989 Anniversary Week* and *Cornelia Street clues*. Nothing the user spent five
minutes building — not the brand, the goals, the audience, the tone, the product
lines, or the post published fifteen seconds earlier — appears anywhere.

**Why it's P0 and not P1.** By the peak-end rule, the remembered experience is
roughly (peak + end) / 2. The peak is strong. The end proves that nothing was
recorded, which retroactively invalidates every antecedent claim: "your marketing
infrastructure", "the dashboard tracks it from here", "these become the targets
I'll optimise your content around." **This one screen does more damage than every
other finding combined**, because it is last and because it is disconfirming.

**Fix.** ✅ **Done.** My first recommendation here was wrong and worth recording:
`renderDashboard()` at [app.js:1469](app.js:1469) *looks* like the answer — it
branches on `state.publishedPost`, greets by first name, and `buildPulseSetup()`
reads `state.skipped` — but it writes into `$('#dash')`, **which does not exist
in `index.html`**, and most of its `dash__*` styling has been retired. Pointing
`enterApp()` at it would have thrown. It isn't a dormant feature, it's a
half-removed one.

What shipped instead: `buildHomeView()` (the live, styled, panelised Home) now
has two modes, switched by `justOnboarded()`. First run renders honest numbers
(Published 1 · Drafts ready · Trends watched · Knowledge facts captured), an
activity log built from what the user actually did, next-moves derived from
`state.skipped` / `state.goals` / the selected trend, the real handle in both the
page header **and** the topbar, and a greeting that names the outcome
("You're live, Abdullah."). The returning-workspace fixture is untouched.

### P0-2 · "Not sure → Different customer types" returns the opposite answer ✅

[app.js:1666](app.js:1666). The `Not sure` branch asks a clarifier, handles
`Same customer`, then falls through to `if (answer.startsWith('No'))` — where
`answer` is still `"Not sure"`, and `'Not sure'.startsWith('No')` is **`true`**.

A user who says they're not sure, then explicitly says they have *different
customer types*, is told *"Got it, one master voice"* and gets
`skipped.add('product-lines')`. The comment three lines above says
`// else fall through to "Yes" handling` — the code does the exact opposite of
its documented intent, in the escape hatch built for the flow's most confusing
question.

**Fix:** `if (answer === 'No, one brand voice')`, and set an explicit `mode`
variable in the `Not sure` block rather than re-testing `answer`. Then audit
every other `startsWith` used as a branch discriminator; this class of bug recurs.

### P0-3 · The OAuth modal cannot be cancelled — it deadlocks the flow ✅

[app.js:1841](app.js:1841) renders `Cancel` with **no listener**. Only
`.oauth-dialog__authorize` is wired ([app.js:1847](app.js:1847)). There is no
`Escape` handler and no backdrop dismiss. `await fakeOAuthModal()` therefore
never settles unless the user authorises.

So a permission dialog has a decorative decline button, and the most likely
real-world branch — reading the permission list and deciding not to grant it —
is an unrecoverable dead end for every user, not just keyboard users. In a
prototype whose purpose includes validating the consent moment, this invalidates
exactly the finding it exists to produce: no test participant can ever exercise
the decline path.

**Fix:** wire `Cancel` + `Escape` + backdrop to `resolve('cancelled')` and route
into the existing `'skipped-entirely'` branch, which is already written.

### P0-4 · Publish ships an over-limit post; empty Publish halts the flow forever ✅

[app.js:2758](app.js:2758). The counter turns amber past 260 and red past 280,
and the Publish handler never checks length. A 900-character "tweet" publishes
normally. There is no `maxlength`, no `aria-live` on the counter, and
`updateCounter()` is never called at mount — so a seeded draft already over 260
shows no warning until the first keystroke. Over-limit is signalled by colour
alone, failing §9's own accent-removal test.

Separately, `if (!body) return;` means clearing the textarea and pressing Publish
does nothing at all — no message, no disabled state — and because the enclosing
promise never resolves, **the entire conversation stops permanently** with no
indication why.

**Fix:** bind `publish.disabled = len === 0 || len > 280` inside `updateCounter`,
call it once at mount, add a text suffix (`14 over`) plus `aria-live`, and add a
`maxlength` guard.

### P0-5 · The primary decision of the flow is unreachable by keyboard ✅

[app.js:2609](app.js:2609) — the three post-direction cards are
`el('div', { class: 'direction-card', onclick: … })`. No `tabindex`, no `role`,
no key handler. The tone cards two steps earlier are correctly `<button>`s, so
the pattern was known and not applied.

A keyboard user Tabs through the direction step and reaches exactly one control:
*"Save these and decide later."* They are silently rerouted out of the primary
flow — skipping the publish step, the profile score, and the payoff — **because
they used a keyboard.** The same defect makes all three Knowledge tiles
permanently un-openable without a mouse ([app.js:1406](app.js:1406)), which is
the product's headline promise.

**Fix:** two `el('div', …)` → `el('button', …, { type: 'button' })` edits. Highest
impact per line changed in this entire audit.

---

## P1 — should fix before this is shown as product

### P1-1 · "Five minutes, max" is off by 50–60% ✅

Scout's promise is at [app.js:1635](app.js:1635). Summing every `beat`,
`typingFor`, `sleep`, `lineBeat` and the typewriter cost against the real copy:

| Scenario | Wall clock |
|---|---|
| Machine only, zero human latency, splash skipped | **2:43** |
| Fast reader, splash skipped | **4:34** |
| Fast reader, splash watched | **~5:05** |
| Realistic first-timer, splash watched | **~7:45** |

The promise holds only for someone who skips the splash and reads nothing.

**The composition is the real problem, not the overage.** 82% of the scripted
budget (133 of 163 seconds) is Scout animating *at* the user; **0% is the user
thinking.** And the pacing curve is inverted: `narratedProcess` holds every line
for a fixed `lineBeat` regardless of length, so a 91-character insight gets 1.4s
(needs ~4.4s to read) while *"Checking your bio."* gets the same — 27% of the
budget spent on text most users won't finish. Meanwhile `scoutMsg`'s typewriter
runs at ~54 chars/sec, roughly **2.5× faster than reading speed**, so on the
load-bearing messages the user is always behind.

**Fix, in yield order:** make `lineBeat` length-aware
(`clamp(600, len × 45, 2200)`) — the only change that improves both speed *and*
readability; cut scan line counts from 7/6/5 to three each; stop typewriting the
audience string three times (10.5s for the same 132 characters); delete the
second drawer review; drop the typewriter entirely for messages over ~100 chars
and fade the paragraph in. Then either the number lands, or change the copy —
"about five minutes" is barely weaker and is defensible.

### P1-2 · Nine of fourteen decision points don't bind, and the flow is built to hide that ✅

| Where | What happens |
|---|---|
| `stepMaterials` | Scout says *"Drop your website link… in the chat"*, the composer is disabled, and 900ms later the script posts `https://rasa.studio` as a user bubble. |
| `stepMaterials` quick reply | `await quickReplies([…])` — **return value never assigned.** Both answers produce byte-identical continuations. |
| Product lines "Yes" | Scout asks for detail, then auto-posts a 180-character scripted answer in the user's voice. |
| Product-line tree | Scout says *"edit if anything's off."* The card has exactly one control: `Looks right`. |
| `handleNotQuiteSubmit` | Never reads `promptText`. Shows "Adjusting based on your note…" for 1400ms, restores the buttons, changes nothing. |
| "Not quite" arrow | `type="button"` with no click handler — the form cannot be submitted from the UI at all. |
| Profile score | Both buttons resolve, both results discarded, both fall into the same next line. |
| `refreshBrandDrawer` × 5 call sites | Returns immediately when the drawer is closed. All five are no-ops. The subtitle *"Scout is filling this as she learns"* is false; it fills in two batch bursts. |
| Drawer `tone` section | Gated on `state.toneSample`, which is set *after* the final drawer closes. **Unreachable in every path.** |

**Why this is a design problem, not just unfinished plumbing.** The flow has been
engineered to *look* like it's listening. The auto-posted bubble uses the same
component as a real user message. "Not quite" gets an input, a focus ring, and a
fake progress state. That is not a stub — it's a simulation of being heard. The
first time a real user types a correction and gets the identical model back, the
whole five minutes retroactively reads as a cutscene, **including the parts that
were real**. Scout's authority rests on having read your site and your posts; a
user who catches one fabricated turn has no way to know which of the other 25
were genuine. Trust in an AI onboarding is single-bit: it survives intact or it
collapses completely.

### P1-3 · The composer is dead for the entire flow while Scout tells you to type in it ✅

`awaitComposer()` ([app.js:641](app.js:641)) is fully written and **never called
anywhere**. `setComposerEnabled(false)` at boot is never reversed. The paperclip
has no handler in any file. So the two "in your own words" moments — the only
places the user's actual voice could enter the product — are simulated against
three inert controls.

Beyond the credibility cost, this means the riskiest unknown in the whole product
(*can Scout parse a free-form brand description?*) has never once been exercised.

**Fix:** call `awaitComposer()` at the two ask sites, accept whatever is typed,
keep the scripted narration as the response, and put the auto-fill behind a
`?demo=1` flag rather than typing for the user.

### P1-4 · The X permission ask arrives before any payoff ✅

§ "Earn the next step": *"We do not ask for access until we have demonstrated
that the current step was worth it. Every ask follows a small payoff."*

The OAuth ask is the **second beat** of the conversation. Scout knows one fact
about the user — that they clicked "Brand" — and has produced zero output. The
ask ledger:

| Ask | Payoff before it | Earned? |
|---|---|---|
| X OAuth (read profile, posts, follows, engagement) | a greeting | **No** |
| Website / docs | the profile scan | Yes |
| Accept brand model #1 | profile + site scan | Yes |
| Goals | nothing new | Weak |
| Audience validation | the niche scan — strongest beat | Yes |
| **Accept brand model #2** | re-shows already-accepted material | **No** |
| Publish | three drafted posts | Yes, strongest |

The mitigations are real — *"Read-only. Scout never posts without your approval"*,
the permission list, `Skip for now` — but they reduce *anxiety*, not
*unearned-ness*. The user trades the crown-jewel permission for a promise.

**Fix — a re-ordering of two existing functions, not new work.** `stepMaterials`
needs no auth. Run it first: take the URL, run the site scan, open the drawer,
let the user watch Scout build a credible brand model from a public page. *Then*
ask: *"That's your brand from the outside. Connect X and I'll tell you which of
it is actually landing."* The ask becomes an upgrade to something already
visibly valuable, and the skip path degrades gracefully instead of gutting the flow.

### P1-5 · Skipping X still shows X-derived analytics ✅

`step1_opening` copies the **entire** persona into `state.brand` at the fork,
including `followers`, `topTopics` with `+92%` engagement figures, and
`peakActivity`. On the Skip-X path the drawer still renders "Top performing
topics" and "Peak activity" — for a user who declined to connect their account.
Scout displays analytics it explicitly could not have.

**Fix:** gate those sections and the Handle/Followers KB facts on
`!state.skipped.has('x-connect')`. Better: stop copying the whole persona at the
fork and populate `state.brand` incrementally as each source is actually
consulted, so the state object is honest by construction.

### P1-6 · Screen readers get silence for the entire flow, and the one live region announces the wrong thing ✅

`#stream` is a bare `<div>` — no `aria-live`, no `role="log"`. Every Scout turn,
narrated line, card and control appends into it unannounced. A screen-reader user
activates "Brand", then hears nothing while four paragraphs, a seven-line scan
and a profile card render, and then has ~1500ms before a choice they were never
told existed auto-commits.

Meanwhile the only live region in the POC is `.kb-block__status`
([app.js:1382](app.js:1382)) — the decorative *"Building…"* label. `renderKB()`
starts with `innerHTML = ''` and runs on all 26 `addKBFact` calls, so it's
destroyed and re-announced up to 26 times, while the actual knowledge Scout
captures is written into nodes with no announcement at all. **The live region is
exactly inverted.**

**Careful — the obvious fix is a disaster.** `typewriterInto` appends one text
node per character. Putting `aria-live` on `#stream` produces ~26 live-region
mutations per second. Use a dedicated visually-hidden `role="status"` announcer,
mark the typing node `aria-hidden` while it types, and push the *complete* string
once on completion.

### P1-7 · No focus indicator anywhere in the onboarding surface ✅

Every `:focus-visible` rule in the project is scoped to `.campaigns` /
`.scout-view` / `.camp-*` — views onboarding never enters. Zero coverage for the
splash CTA, hero blocks, quick replies, chips, tone cards, platform rows, drawer
Accept, or Publish. Worse, `outline: none` is set with **no** substitute on
`.composer-pill input` and `.url-inline input` — the primary text input of a
conversational product has no focus indication at all.

On the hero, this means Individual and Brand are visually indistinguishable under
focus, and a mis-press forks the entire onboarding with no way back.

**Fix:** one global rule, plus `:focus-within` on the two input wrappers. Use a
two-tone ring (dark inner + accent outer) so it survives on the tinted and
frosted surfaces.

### P1-9 · The "YOUR FIRST POST" eyebrow was a full-width bar attached to nothing ✅ **Fixed**

**Missed by the audit. Caught by the user on sight.** Worth recording how.

`.first-post-banner` reads fine in source: `display: inline-flex`, a pill radius,
uppercase 11px label. But it was appended as a bare child of `.conv__stream`, a
flex column — and an unaligned flex item inherits `align-items: stretch`, so
`inline-flex` did nothing and the pill spanned the entire column. What shipped
was a full-width lavender bar with a pulsing dot, floating above the cards,
labelling nothing. It also restated the very next line of copy ("I've drafted
three directions for your first post"), against §Copy's "no restated headings",
and its dot was one of the ten pulsing dots the deterministic scan flagged.

Removed, along with its CSS and the `postDot` keyframe. Scout's sentence already
frames the moment.

### P1-8 · Direction cards are unreachable below ~1200px, and the KB rail overlaps the chat below ~1184px ✅ **Fixed**

Pulled forward from Batch 6 — this is the most visible defect in the flow's most
important moment and should never have been ranked below the P0s.

The breakout (`width: 100vw; margin-left: 50%; transform: translateX(-50%)`) was
trying to make the outer cards peek into the gutter — the comment at
`styles.css:4796` says so. It cannot work: `.conv__stream` is `overflow-x:
hidden`, so the peek was a hard clip. Now a snap scroller *inside* the column:
same composition, centre card still the hero, neighbours still peek, and every
card reachable by drag, wheel, trackpad or keyboard.

The KB rail now reserves a 204px gutter above 1200px and becomes a horizontal
strip ordered above the conversation below it, instead of floating on top of the
chat. Dialog and drawer widths are clamped to the viewport.

`.directions-list` is a `display: flex` row with `.direction-card { flex: 0 0 360px }`
— non-shrinking, 1128px intrinsic — inside a container with `overflow-x: hidden`,
using `justify-content: center` so overflow goes to *both* sides and is
unscrollable. At 375px **only 1 of 3 first-post directions is visible or
clickable.** The intended escape hatch at [styles.css:5010](styles.css:5010) sets
`grid-template-columns` on a flex container: inert. ✅

Separately, `.kb-panel` is `position: absolute; width: 180px` and reserves no
space, while `.conv__stream` is dead-centred. Overlap begins at viewport < 1184px;
at 1024px the rail sits 76px on top of the conversation, and at 768px it covers
the chat entirely. It never stacks, never hides, and has no media query.

There is **no breakpoint below 720px anywhere in the codebase.** Nothing targets
a phone. Three of the fifteen layout media rules target selectors that don't exist.

---

## P2 — quality and consistency

### P2-1 · Seven commit mechanics, one of which is "do nothing for 1.5 seconds" ✅

Quick replies, tone cards and direction cards commit on a hidden 1500ms idle
timer. Chips need an explicit `Done`. The drawer needs a modal `Accept`. The tree
card needs one button. The editor has a Publish.

The idle timer is a thoughtful idea — the code comment says it exists *"so the
user can change their mind"* — but it achieves the opposite for anyone slower
than 1.5s, and it's invisible: the only signal is siblings dimming, and the
pending state looks identical to the committed state. Clicking again gives zero
feedback. Reconsidering silently **rewrites the existing user bubble in place**,
so the transcript edits history. And it adds 7.5s to a flow already over budget.

**Fix:** one mechanic. Commit immediately, and put a 4-second **Undo** on the
resulting user bubble. Same reversibility, no hidden latency, no fake history.

### P2-2 · Four live colour systems, and the design language documents none of them ✅

`design-language.md` says primary is `#3C4194`. That value appears **zero times**
in `poc/`. What actually renders: `#5B5BF5` in onboarding, `#545BD1` in
campaigns mode (`_shared.css` overrides `--primary`), and ad-hoc `#4f46e5` /
`#7c3aed` / `#6d28d9`. Both `tokens.css` comments about the primary are factually
wrong about their own resolved values. 74 of 83 distinct hex values in `poc/` are
off-palette; all eight status tokens are never referenced while Tailwind statuses
(`#16a34a`, `#b45309`, `#dc2626`…) are hardcoded.

**And the sidebar is 80px, not the documented 72px.** ✅ `--sidebar-w: 80px` sits
on `:root` in `_shared.css` and `.app` is re-declared unscoped — verified live:
`grid-template-columns: 80px 817px`. The comment at `_shared.css:36` instructing
the next reader to *"keep this local"* describes the opposite of what the code
does, and `tokens.css`'s `--sidebar-width: 72px` is dead.

### P2-3 · §9 rule 1 fails hard, and half the token set is unexercised ✅

*"Every colour, font size, space, radius and shadow comes from a token."*
Actual: `poc/styles.css` is ~35% tokenized on font sizes, 41% on radii, 37% on
spacing, 46% on shadows. `poc/scout-flow.css` is **0% on every axis** — 54 hex,
32 px font sizes, 45 raw durations, zero `var(--space*)`, and 17 declarations
that hardcode `'SF Pro Display'` ahead of the token, defeating the fallback chain.

**90 of 182 tokens (49%) are never referenced** — every status colour, all 13 MUI
type bundles, all 7 elevation steps, all 5 breakpoints, and all three
`--scout-beat*` values. `--chat-column-max` is referenced zero times while
`720px` is hardcoded 34 times. ✅ A source of truth that is half unexercised
cannot detect its own drift, which is why nobody noticed it disagreeing with the
code.

Two doc-level contradictions to settle before touching CSS: the type family
(header says SF Pro Display, §4 says Inter — Inter is what ships, plus a
render-blocking Google Fonts `@import` ✅), and the Scout beat (§7 says 1100ms
default; the code default is 600ms and **23 of 36 call sites use 400ms** — the
doc is the thing that's out of date). ✅

### P2-4 · §8 component specs diverge on nearly every property ✅

Scout message: spec 28px avatar with AI-gradient sparkle, `--leading-relaxed`,
`--text-primary`, max 560px. Built: 22px, transparent background with a flat
primary logo, `line-height: 1.6`, `--text-secondary`, max 720px. User message:
spec `--primary-soft` background; built white — with **wrong `var()` fallbacks**
(`var(--radius-lg, 16px)` where the token is 14px), which will silently render a
different design if a token ever fails to load. Chips: spec `--radius-full` pill
on `--surface-sunken`; built `border-radius: 12px` (not a token value at all) on
`rgba(255,255,255,0.4)`. Composer: spec pill with gradient send-when-active;
built 18px radius, flat send, and `.composer-pill__send.active` is never applied
by any code.

`.conf` is declared **five times** ✅, `.pl-tree` five, `.tone-list` five, and 94
selectors more than once. The pattern is consistent and diagnostic: a correct
tokenized definition early, then override layers that de-tokenize it. **The fix
is mostly deletion, not authoring** — the right values are already in the first
declaration of nearly every one of these.

### P2-5 · Motion contradicts its own rule ✅

§9 rule 4: *"Motion runs once on entry and stays still during reading."* §7:
*"confident things don't fidget."* There are **25 `infinite` animations** in
`styles.css` (28 across the POC): three atmosphere blobs drifting perpetually
behind the splash, three more inside every KB tile, a violet halo breathing
behind the narrated-processing icon for the whole read, and 10 pulsing dots.
Three keyframes are overshoot springs — including Scout's own logo, which pops to
1.08 on entry.

Reduced-motion coverage is 5 blocks, mostly splash-scoped; it misses the
atmosphere blobs, the icon breathe, the shimmer, the status dots, and both
literal spinners. **And `typewriterInto` has no `matchMedia` guard at all** ✅ —
so a user who asked for reduced motion gets ~30 turns of per-character reflow,
which is the specific vestibular trigger. Three other functions in the same file
*do* check, so the pattern exists and simply wasn't applied to the primary text
renderer.

### P2-6 · There is no error state in the flow ✅

§9 rule 3 requires empty, loading and error states to be designed. Empty states
are genuinely good (the KB empty-state copy is well done). Loading is the right
pattern, except two literal `spin` spinners survive against §1's *"spinners are a
smell."* Error: **none.** `--error-main` and friends are never referenced by any
stylesheet. Every failure branch is a silent no-op — empty inline input, empty
Publish, duplicate custom chip, six dead sidebar buttons.

The one error UI in the app is an unstyled dev string with a hardcoded
`color:#B42318`, reachable from five call sites: *"Failed to load
phase-2-review. Scout panel fetch failed: phase-2-review (404)"* — because six of
the seven `SCOUT_PHASES` panels fetch files that don't exist in `designs/`, with
no timeout and no retry.

### P2-7 · Long content breaks layout everywhere ✅

`word-break` / `overflow-wrap` / `hyphens` appear **zero times** across all four
stylesheets. `text-overflow: ellipsis` appears twice in 7,286 lines. A pasted URL
in the audience override breaks out of the message bubble; a long brand name
becomes a six-line block in the drawer; the X display name is silently clipped;
a 60-character custom chip overflows its row; the KB tile title clips mid-word
with no ellipsis. The prototype only looks stable because every string is a
fixture.

### P2-8 · 13 MB of images, two third-party network calls ✅

`Posts/` is ~11 MB — `8.png` is 2.36 MB, `7.png` 2.19 MB — all 1024², all
rendered into ~308px tiles, all mounted at once on splash screen 1 as CSS
`background-image`, which makes `loading="lazy"` and `srcset` structurally
impossible. There are **zero `<img>` elements in `app.js`**; all 20+ images are
backgrounds, so `onerror` fallbacks can't exist either. Plus a render-blocking
Google Fonts `@import` and six `i.pravatar.cc` avatar URLs — a "read-only,
private" onboarding that phones out to two third parties. ✅

---

## Enhancements — what I'd actually build

These are not defect fixes. They're the moves that would make this flow good
rather than merely correct.

### E1 · Make the Knowledge rail the spine, not the decoration

The rail is the best structural idea in the product and it currently does nothing
the user can act on: they never touch it during the flow, one of its three blocks
(**Platform Algorithm**) never fills at all ✅ — while
`step_infrastructure_build` claims *"X algorithm rules and content guardrails.
**Loaded**"* directly beside the visibly empty box — and the facts it captures are
never shown *changing the output*.

Three changes turn it into the proof-of-work the whole flow needs:

1. **Animate the fact into the tile.** When Scout learns something, the fact
   physically travels from the chat message into its knowledge block. Cheap, and
   it makes "I'm learning you" literal instead of asserted.
2. **Cite the rail when drafting.** When the three post directions appear,
   highlight which facts fed each one. *"This one uses: Heritage origin stories
   +92% · Warm story-led · #SouthAsianHeritageWeek."* That single addition
   converts Scout from a black box into something auditable, which is the whole
   ballgame for trust in an AI product.
3. **Fill the third block or delete it.** Posting cadence, thread-vs-single, link
   penalty — Scout already implies it knows these. Never claim a thing was loaded
   next to the empty container it should be in.

### E2 · Replace the drawer's binary footer with per-field correction

"Not quite" is trying to be per-field editing and failing. `confirmationCard`
([app.js:863](app.js:863)) — the design system's canonical inline-edit component,
specified in §8 with a pencil per row — is **fully built and never called** ✅.
Wire it into the drawer. A user who can fix *one wrong field* stays engaged; a
user handed a free-text box that swallows their correction is being managed.

### E3 · Show the shape of the commitment

There is no progress indicator after the splash dots, no back, no resume, and a
refresh mid-flow drops the user into the *Campaigns dashboard* — a different
product surface with someone else's data. ✅ A five-minute promise makes an
implicit contract that the user can see the end approaching.

Add a four-beat rail, phases not steps: **Learning you → Reading the market →
Finding your voice → First post.** Always visible, current beat lit. It answers
"how long", "where am I", and "can I leave" in one element, and it costs one
component.

### E4 · Make the transcript editable

Ten decisions, zero reversible. But this is a chat log — every committed answer
is *already* a user bubble on screen. Make each one an edit affordance on hover
(*"change this"*) that re-opens that step's control inline. The record is already
there; only the handle is missing. Pair it with E1: editing a fact visibly
re-runs what depends on it, which is the most convincing thing an AI product can
show a skeptic.

### E5 · Cut the four steps that cost more than they return

- **Second drawer review** — a second accept for already-accepted content, ~11s
  of re-typing plus ~20s of re-reading, no new payoff. Keep the drawer live and
  minimisable instead; the re-open tab component is already built.
- **The materials quick reply** — a no-op question whose return value is
  discarded, costing a click and ~3.4s.
- **`step_infrastructure_build`** — 7.8s of unverifiable self-congratulation,
  one line demonstrably false, positioned *after* the emotional peak. The rail
  has been showing the user what was built for four minutes. Let it be the proof.
- **The profile score, at this position** — good content, wrong place. It's a
  return-loop hook by the code's own comment; return loops belong on the
  destination, not in the corridor.

Cutting these removes two decision points and ~33 seconds, and moves the peak to
within ~10 seconds of the end.

### E6 · Two smaller things worth doing

**Fix Scout's pronoun.** The splash says *"Scout is your AI marketing partner.
**It** learns your voice"*; the drawer the user stares at twice says *"Scout is
filling this as **she** learns."* ✅ Nothing in the product establishes a gender
for Scout, so "she" is an unearned assumption sitting in the most-read chrome in
the flow. Pick one — they/it reads cleanest for an agent — and use it everywhere.

**Delete the fake engagement metrics on unpublished drafts.** Each direction card
shows *12 replies · 4 reposts · 87 likes · 1.2K views* on a post that does not
exist, with per-icon X brand hover colours on 18 inert spans that also swallow
clicks into the card. `renderPublishedPost` correctly zeroes its metrics — the
drafts should match it, not the reverse. Invented performance numbers in the
flow's most important moment are the same category of error as P1-5.

**And stop opening 36% of turns with an acknowledgement.** §2 says *"No filler."*
10 of 28 Scout turns start with "Got it / Perfect / Good / Connected / Updated." ✅
It's the strongest LLM-cadence tell in the copy and the cheapest thing on this list to fix.

---

## Persona red flags

**Jordan (first-timer, non-technical brand owner).** Asked for X account access
8 seconds in, before seeing anything. No progress indicator, so no idea whether
this is 2 minutes or 20. Hits "Does rasa have distinct product lines that should
speak to different audiences?" as the third question — the most abstract ask in
the flow — picks *"Not sure"*, says *"Different customer types"*, and is told
*"Got it, one master voice"* (P0-2). Types a correction into "Not quite", watches
a fake progress state, gets the identical model back. Lands on a dashboard about
Taylor Swift.

**Alex (power user, has done this before).** No way to skip narration, no
keyboard path through the direction picker (P0-5), no shortcuts, 20 clicks
minimum, and a refresh at minute 4 dumps them into Campaigns with everything
lost. Seven different commit mechanics to learn, one of which is waiting.

**Sam (screen reader).** Silence for the entire flow, punctuated by *"Building
dot dot dot"* up to 26 times (P1-6). Cannot open the Knowledge tiles that are the
product's headline promise. Cannot reach the direction cards. If they find a
quick reply by exploring, pressing Enter *is* the selection, and it commits in
1500ms — less time than VoiceOver needs to read the next option.

**Priya (low vision, 200% zoom).** No focus ring anywhere (P1-7). At 640px
effective width the direction cards render 1128px wide inside a clipped,
unscrollable container — she must choose from cards she cannot see (P1-8). The
"Building…" label sits over a drifting purple wash whose contrast oscillates
between 2.96:1 and 4.83:1 on a 5.6–8.4s loop: **legibility is a function of
animation phase**, and there is no static moment in which she can verify what it says.

---

## Suggested sequence

Ordered by impact per unit of work, not by severity.

1. **Five small edits that fix five serious problems.** Two `div` → `button`
   (P0-5), wire OAuth Cancel (P0-3), one `startsWith` → `===` (P0-2), a length
   guard on Publish (P0-4). Roughly a dozen lines for four P0s.
2. **Wire up what's already built.** Point `enterApp()` at `renderDashboard()`
   (P0-1), call `awaitComposer()` at the two ask sites (P1-3), swap the drawer
   footer for `confirmationCard` (E2). Three orphaned components; the biggest
   findings in this audit have their solutions already written. ✅
3. **One global CSS rule each** for `:focus-visible` (P1-7), reduced-motion, and
   `overflow-wrap` (P2-7). Plus one token change to `--text-tertiary`, which
   clears five contrast failures at once.
4. **Re-order two step functions** so the site scan precedes the OAuth ask (P1-4).
5. **Pacing pass** — length-aware `lineBeat`, fewer scan lines, no triple-typing
   the audience, drop the typewriter on long messages (P1-1).
6. **Settle the doc contradictions, then delete.** Reconcile the primary colour,
   the type family, the Scout beat, and the §8 divergences — *then* the dead-CSS
   and duplicate-block cleanup has something to be correct against (P2-2 → P2-4).
7. **Responsive** last; it's the largest structural change (P1-8).

Steps 1–3 are a day's work and move this from "impressive demo with landmines" to
"honest prototype you can put in front of a user."
