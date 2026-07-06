# Scout Campaign Flow — Design Pitch & Handoff

> A designer's walkthrough of the revamped campaign creation flow: what changed,
> why we made each decision, and what effect it should have on users.
> Each section pairs a design move with the psychology / UX principle behind it.

---

## TL;DR

We rebuilt campaign creation around a single premise: **the user's scarcest resource is decision energy, not time.**

The old flow asked users to *supply* structure — pick a theme, write copy, choose images, set a schedule. The new flow asks Scout to *propose* structure grounded in the user's own data, and asks the user to *react* to it.

Reacting is cheaper than authoring. That single reframing drives every decision below.

---

## 1. The core move: Scout as a *confident marketing partner*, not a chatbot

**What we did.** Named the agent, gave it a voice ("rationale-first, sentence case, no cheerleading"), an avatar with a thinking/settled lifecycle, and a consistent stance: it opens with data, recommends a direction, and invites the user to redirect.

**Principles at work.**
- **The Media Equation (Reeves & Nass).** People treat interfaces with social cues — names, faces, voice — as social actors. Giving Scout a name and a personality unlocks trust and reciprocity heuristics that a blank "AI panel" cannot.
- **Anchoring (Tversky & Kahneman).** Every question opens with Scout's recommended answer + rationale. The user's cognitive job shifts from *generate* to *evaluate*, which is orders of magnitude cheaper.
- **Authority heuristic + calibrated trust.** Confidence without evidence is a liability; confidence *with* a data source ("Your 1989 poll pulled 4.1× your usual replies") is competence. Scout is confident only where it can cite.

**Effect.** The user stops feeling like a blank-page author and starts feeling like an editor with a strong first draft. That's a much lower-friction mental model.

---

## 2. Reducing cognitive load: spacious canvas, one decision at a time

**What we did.** The chat column is capped at 780px, centered, with an atmospheric gradient on the landing that fades away the moment work begins. Sticky topbar + sidebar; everything else scrolls. No dashboards, no metrics rails, no side panels distracting from the current turn.

**Principles at work.**
- **Cognitive Load Theory (Sweller).** Extraneous load (visual clutter, competing affordances) eats the working memory needed for intrinsic load (the actual planning decisions). Stripping the canvas raises the ceiling of what the user can hold in their head.
- **Miller's 7±2 / Hick's Law.** Each qdock question offers 2–3 options, not 10. Choice sets stay inside working memory.
- **Progressive disclosure (Nielsen).** The drafts panel doesn't exist until Scout is ready to draft. The scheduling picker doesn't exist until you're ready to schedule. Complexity arrives only when it's actionable.
- **Aesthetic–usability effect.** The frosted-glass qdock scrim, the warm-white tint, the paired shadows — these read as *care*, which primes users to interpret ambiguous interactions charitably.

**Effect.** The interface feels like a quiet room, not a control panel. Focus stays on the *campaign*, not on the tool.

---

## 3. The QDock: capturing intent without the tax of a form

**What we did.** When Scout needs input, the composer transforms into a **question dock** — numbered options with rationales, a "Recommended" pill on Scout's pick, plus a freeform composer at the bottom for anything Scout didn't anticipate. The rest of the screen fogs behind a two-layer blur scrim so the question is unmistakably the current move.

**Principles at work.**
- **Choice architecture (Thaler & Sunstein).** Scout provides a default — the recommended option — but never removes freedom. Defaults do the heavy lifting for the 80% common case; the composer catches the 20% edge case.
- **Von Restorff effect.** The "Recommended" pill visually pops out of a uniform list, letting the eye land in ~200ms on the intended answer without reading every option.
- **Fitts's Law.** Options are large, generously padded targets (12–14px padding). Numbered chips give a keyboard-friendly parallel path (press "1"). Both are cheap.
- **Feedforward, not just feedback.** Every option carries a "Why · " sub-line. The user sees *the consequence of clicking* before clicking. This is what turns a menu into a decision aid.
- **The Zeigarnik effect, tamed.** A scrim blurs the background *without hiding it*. The user can still see progress accumulating above, but the pending question is unambiguously the next step. If they need the thread visible, the qdock can be *minimized* rather than dismissed — respecting the user's control without letting the open loop drift out of mind.

**Effect.** Intent capture that felt like a form on the old flow now feels like a conversation with a competent colleague pointing at the right answer.

---

## 4. Operational transparency: the "Scout is thinking" moments

**What we did.** Before Scout speaks, a ticker walks through the specific data sources it's checking: *"Looking through past campaigns…" → "Analyzing audience peaks…" → "Forecasting reach."* When it settles, the ticker collapses into a clickable receipt: **"Scout checked: past campaigns · analytics · forecast"**, which expands to reveal the actual findings ("Pulled 12 campaigns across 3 seasons", "Your audience peaks Thu 7 PM").

**Principles at work.**
- **The Labor Illusion / operational transparency (Buell & Norton, HBS).** People trust and value work they can *see happening*. A hidden 800ms wait feels like a wait; a visible 800ms of "reading fandom chatter" feels like insight. Perceived value goes up *and* perceived wait goes down.
- **Explainable AI (calibrated trust).** Trust is only useful when it tracks capability. Showing sources lets users calibrate — trust Scout on audience timing where it has data, override it where it doesn't.
- **The Doherty Threshold.** Sub-400ms responses feel "instant"; longer feels laggy *unless* the wait is narrated. Narrating turns a limitation into a feature.
- **Progressive disclosure, again.** The receipt is a one-line summary by default. The full detail list is one click away. Users who want to trust-fall don't have to read it; users who want proof can.

**Effect.** Users stop asking "did it actually look at my data?" — the answer is on screen. Trust becomes a byproduct of transparency instead of a marketing claim.

---

## 5. The plan card + editable rationale rows

**What we did.** After the question loop, Scout presents a plan card — shape, hook, cadence, tone — each row with a **meta sub-line** explaining *why* ("Same primary goal as your top anniversary posts this year"), and a pencil icon to edit that single row.

**Principles at work.**
- **Endowment effect + IKEA effect.** Any row the user tweaks becomes *theirs*. Ownership rises with contribution, even small contribution. The pencil affords cheap contribution.
- **Recognition over recall.** The plan is visible while editing. The user never has to remember what Scout proposed while re-answering.
- **Scoped mutations.** Clicking a pencil re-opens the qdock scoped to *that field only* — no dialog stack, no lost state. This is a subtle but load-lowering pattern: edits are surgical, not modal.

**Effect.** The user feels like a decision-maker, not a passenger. The plan is Scout's *and* theirs by the time drafting starts.

---

## 6. Draft generation: proc-line as ambient status

**What we did.** During generation, a persistent icon-with-halo animates through the pipeline — *"Pulling voice profile" → "Reading fandom chatter" → "Drafting posts" → "Ready"* — while post cards stream into the right-hand panel one by one.

**Principles at work.**
- **Ambient information display.** The proc-line doesn't demand attention; it exists so a curious glance can answer "what's happening?" without disrupting flow.
- **Peak-end rule (Kahneman).** The final "Ready" holds a moment longer with a soft pulse before fading. The last frame is the one people remember; we designed the *end* of the generation, not just the middle.
- **Perceived control.** Streaming cards in one-by-one — rather than dumping four finished drafts at once — lets the user start reviewing before generation ends. Wait time becomes work time.

**Effect.** The generation phase, which used to feel like a black-box pause, now feels like watching a colleague type in the next room.

---

## 7. Post cards & comment-based editing

**What we did.** Drafts appear as cards in a right-hand panel with the chat still visible on the left. Users edit posts in two ways: **direct inline text edits** (cheap, precise) and **comment-based edits** ("Tell Scout how to change this post" → "Make it punchier"), which regenerates the post in place.

**Principles at work.**
- **Two mental models, two interactions.** Sometimes the user knows the exact word to fix — inline text edit. Sometimes they know the *feeling* they want but not the words — comment to Scout. Forcing one interaction to serve both makes both worse. We built both.
- **Contextual editing (Fitts + proximity).** The comment sheet slides down *directly beneath the card being edited*. The instruction and the artifact stay in the same visual scope — no context switching to a modal.
- **Reversibility (Nielsen heuristic #3).** Regenerate, duplicate, delete are one click. Low commitment increases exploration.
- **Gestalt: common region.** Each card is a self-contained unit — headline, body, media, tone chip, footer actions. The card boundary is the object; everything about the post lives inside it.

**Effect.** Users iterate faster and more freely because iteration is cheap. Refined-post rate per session should climb, because the cost of "let me try something different" is near-zero.

---

## 8. The image upload redesign

**Old flow's problem.** Ambiguous: attach a file → it sits in a bucket → user has to manually assign each image to each post. Cognitive tax + fragile.

**What we did.**
- Attach images anywhere in the conversation.
- Scout analyzes each one (thumbnail shows a spinner overlay while analyzing — *operational transparency again*).
- Scout classifies: **relevant** images get a green outline; **off-brief** images get an amber outline and an "Off-brief" badge with a small flag card ("Looks off-era for the 1989 campaign — Skip, or use anyway?").
- Relevant images auto-place on posts. The post's media strip says: *"Placed by Scout · tap to swap or regenerate."*
- User can also **generate images via AI** by asking Scout in a comment or the media strip's regenerate button.

**Principles at work.**
- **Honest defaults over silent filtering.** Scout doesn't quietly drop the off-brief image; it flags and asks. Silent filtering erodes trust the moment it's discovered.
- **Direct manipulation, mediated by an agent.** Files go where they should by default; the user redirects only exceptions. Effort scales with divergence from the happy path.
- **Signifiers over instructions (Norman).** Green = fits, amber = check this. No copy needed to explain what the outline means; it's cross-cultural signage.
- **Locus of control (Norman).** The "Use anyway" button on the flag card is critical. Scout has a preference; the user has the vote.

**Effect.** What used to be a 6-step assignment ritual becomes: drop images, glance at flags, hit go. Assignment time drops by an order of magnitude, and users trust the assignment because they *saw the reasoning*.

---

## 9. Scheduling: pick when, not what

**What we did.** A schedule button on each post opens a compact date+time picker. Scout also *proposes* posting times ("Thu 7 PM · Sat 10 AM · Sun 12 PM — your top posting slots") as a qdock option, so the default path skips the picker entirely.

**Principles at work.**
- **Default bias.** The most common answer — "yes, use Scout's suggested times" — is one click. The custom answer is one click away. Both are cheap; the common one is *cheaper*.
- **Recognition over recall.** Scout surfaces *your own* best-performing slots. The user doesn't need to remember what worked.

---

## 10. Editing via comment: a small but load-bearing pattern

**What we did.** Every post has a **comment button** that opens a small sheet under the card: "Tell Scout how to change this post." Presets appear inline (Shorten · Expand · Punchier · Softer tone · Stronger CTA), and the user can type freeform.

**Principles at work.**
- **Verbalization > direct manipulation, when intent is fuzzy.** For "make it punchier," the user knows the goal but not the specific edit. Talking to Scout is faster than editing word-by-word.
- **Presets = shortcuts for common intents.** Common asks become one-tap. This is the Pareto structure: cover the 80% with tiles, catch the rest with a text field.
- **Locality of edit.** The comment sheet lives *at the card*, not in a global inbox. Instructions and their target stay glued together.

---

## 11. Material language: why glass, why atmosphere, why these shadows

**What we did.** A consistent "glass" recipe (warm-white translucency + gentle backdrop blur + saturate 1.08 + dual-layer shadow) is applied to the qdock, panel edges, and floating cards. The landing has a subtle violet+indigo atmospheric gradient that fades the moment work begins.

**Principles at work.**
- **Depth cues aid comprehension.** A blurred scrim behind the qdock is not decoration — it's a Z-axis signal that the qdock is *in front of* the paused conversation. Users understand the interaction hierarchy without reading a single word of UI copy.
- **Aesthetic–usability effect (Norman & Nielsen).** Polished materials make users more forgiving of small hiccups and more likely to report the tool as "easy to use," even when task time is identical.
- **Atmosphere as arrival cue.** The gradient on landing signals "this is a creative space," not "this is a form." It disappears once work starts because ambient beauty during focus is noise.
- **Consistency (Nielsen heuristic #4).** One glass recipe, one shadow strategy, one animation timing (~260–340ms cubic-bezier). The whole flow feels like one thing.

---

## 12. What we deliberately did *not* do

- **We did not add a progress bar for Scout's thinking.** Progress bars promise a linear ETA we can't honor. The proc-line is honest: "here's what I'm doing," not "here's when I'll be done."
- **We did not add tooltips explaining Scout's reasoning.** The rationale is inline (option sub-text, plan card meta lines). Tooltips are penalty boxes for content that should be in the main flow.
- **We did not put a settings panel in the main flow.** Every configurable thing is either a qdock question or a pencil edit on the plan card. Settings panels are where UX flows go to die.
- **We did not auto-post.** Even when Scout is confident, the final publish is a two-step confirmation. High-blast-radius actions get friction on purpose (Nielsen: error prevention).

---

## Expected effects — what to measure

1. **Time-to-first-draft ↓** — the qdock loop replaces a form + a blank page.
2. **Draft-to-publish rate ↑** — inline edits and comment-based refinement lower the cost of "close but not quite."
3. **User trust score on Scout suggestions ↑** — the operational transparency pattern (receipts, image flags, rationales) is the direct lever.
4. **Session focus / task completion in one sitting ↑** — the spacious canvas and one-decision-at-a-time cadence should reduce drop-off mid-flow.
5. **Image-assignment friction ↓** — auto-placement with visible reasoning is the biggest reduction in manual steps.

---

## Design principles the team can carry into future work

1. **Recommend, don't ask.** Every question ships with Scout's answer + reason. Blank fields are the exception, not the default.
2. **Show the work.** Any wait > 400ms becomes an operational-transparency moment.
3. **One decision at a time, everything else visible but quiet.**
4. **Rationale travels with the recommendation.** Never a naked suggestion.
5. **Reversibility is cheap; commitment is deliberate.**
6. **Signifiers over instructions.** Colors, shapes, and positions do more work than copy.
7. **Local edits at their target.** No global control panels for post-scoped changes.
8. **The end frame matters as much as the middle.** Peak-end rule applies to every animation.

---

## Appendix — quick reference of the principles used

| Principle | Where it shows up |
|---|---|
| Media Equation (Reeves & Nass) | Scout's name, voice, avatar |
| Anchoring (Kahneman & Tversky) | "Recommended" option in every qdock question |
| Calibrated trust / Explainable AI | Action-state receipts, image relevance flags |
| Cognitive Load Theory (Sweller) | 780px chat cap, spacious canvas, no side rails |
| Hick's Law / Miller's 7±2 | 2–3 options per qdock question |
| Progressive disclosure (Nielsen) | Panel appears only when drafting; receipts expand on click |
| Choice architecture (Thaler & Sunstein) | Default = Scout's pick; freeform always available |
| Von Restorff effect | Recommended pill visual pop |
| Fitts's Law | Large option targets, keyboard number chips |
| Feedforward (Djajadiningrat et al.) | "Why · " sub-lines on every option |
| Zeigarnik effect | Qdock scrim keeps the pending question salient; minimize preserves the loop |
| Labor illusion (Buell & Norton) | Ticker of specific checks before Scout speaks |
| Doherty threshold | Narrated waits > 400ms |
| Endowment / IKEA effect | Pencil-edit rows on plan card |
| Recognition over recall | Plan card visible during edits; Scout surfaces user's own best slots |
| Peak-end rule (Kahneman) | Final "Ready" beat held before fade |
| Ambient information display | Proc-line during generation |
| Reversibility (Nielsen heuristic #3) | Regenerate / duplicate / delete on every card |
| Gestalt: common region | Post card as self-contained unit |
| Signifiers (Norman) | Green/amber outlines on images |
| Locus of control (Norman) | "Use anyway" override on flagged images |
| Default bias | Scout's suggested schedule as one-click option |
| Aesthetic–usability effect | Glass recipe, warm-white tint, paired shadows |
| Consistency (Nielsen heuristic #4) | One material recipe, one timing curve across the flow |
| Error prevention (Nielsen heuristic #5) | Two-step publish confirmation |
