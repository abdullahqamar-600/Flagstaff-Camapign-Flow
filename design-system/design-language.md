# Flagstaff Social — Design Language

A short, working reference for everyone who designs or builds a screen in this product. Read this once, then come back when you're stuck.

> **Source of truth.** Visual tokens — color, type, elevation, breakpoints — are mirrored from the Figma file [Flagstaff Social Design System – MUI](https://www.figma.com/design/GxID0fpIpOueLtT8nKmzBh/Flagstaff-Social-Design-System---MUI). The `design-system/tokens.css` and `design-system/tokens.json` files are generated against that file. Voice, principles, and component patterns (this doc) live alongside the tokens but evolve in code.

> **Type family**: SF Pro Display (per Figma).
> **Type scale**: MUI named styles — `h1`–`h6`, `subtitle1/2`, `body16/14/12`, `caption`, `overline`. Use the `.t-h1`…`.t-overline` helper classes in `tokens.css` for one-shot styling.
> **Primary color**: `#3C4194` (`primary.main`, confirmed against the primary `<Button>` fill in the Figma file). Lighter variant `#545BD1` is used for hover states and skeletons.
> **Elevation**: full MUI shadow ladder (`--shadow-elev-0` through `--shadow-elev-24`) with semantic aliases (`--shadow-xs/sm/md/lg/xl`).
> **Breakpoints**: MUI `xs 444 / sm 600 / md 900 / lg 1200 / xl 1536`.

---

## 1. Principles

### Conversation, not forms
The interface is a dialogue. When we need information, Scout asks for it in plain language. Forms appear only when a structured input is genuinely faster (URL paste, file drop, multi-select chips) — never as the default.

### Show the thinking
Loading spinners are a smell. If Scout needs time to do something, it narrates what it is doing and what it is finding. Progress is content, not a placeholder.

### Earn the next step
We do not ask for access (X account, scanning permission, payment) until we have demonstrated that the current step was worth it. Every ask follows a small payoff.

### Calm surface, clear hierarchy
Generous whitespace, soft shadows, one accent color. The user's content and Scout's voice are the loudest things on the page; the chrome stays out of the way.

### One Scout, one voice
Whether Scout is leading onboarding, suggesting a post, or nudging from the dashboard, the voice and visual treatment are consistent. The user always knows when Scout is talking.

---

## 2. Voice in the UI

The Scout persona doc owns the long form. Three rules that always apply to UI copy:

| Rule | Do | Don't |
|---|---|---|
| First person, no hedging | "I'd target professionals in their 30s." | "We could maybe consider targeting…" |
| Reasoning attached | "Posting at 2pm — your US audience peaks then." | "Posting at 2pm." |
| No filler | "Here's what I found." | "Great question! So basically…" |

Empty states, error messages, and microcopy all use the same voice. If a string in the product sounds like it came from a different writer, it is wrong.

---

## 3. Color usage

Tokens live in `tokens.css`. UI components only reference semantic tokens (`--text-primary`, `--surface-raised`), never primitives directly.

- **Indigo (`--primary`)** — the single accent. Used for primary actions, active nav, links, and the Scout brand mark. Don't use it for decoration.
- **Violet** — appears only inside the AI gradient pair. Never used alone.
- **Neutrals** — carry every surface and most text. The product is mostly neutral; color signals action.
- **Status colors** — only for status. Don't use success-green as a brand accent or warning-amber as a highlight.
- **AI gradient (`--ai-gradient`)** — reserved for the Scout sparkle/avatar and AI-suggested content blocks. Used sparingly so it keeps meaning.

A screen that looks "too gray" is usually correct. If you feel the urge to add color, ask whether it carries information.

---

## 4. Typography

One family (Inter), one scale, four roles.

| Role | Token | When |
|---|---|---|
| Display | `--text-3xl` / `--text-4xl`, semibold, tight tracking | Page hero, onboarding headlines |
| Heading | `--text-xl` / `--text-2xl`, semibold | Card titles, section headers |
| Body | `--text-md` / `--text-base`, regular | Default paragraph and chat |
| Label | `--text-xs` / `--text-sm`, medium, slightly wider tracking | Field labels, metadata, chips |

Default body line-height is `--leading-normal` (1.5). Scout messages use `--leading-relaxed` (1.65) for readability across longer paragraphs.

---

## 5. Spacing & layout

- 4-pt base spacing (`--space-1` through `--space-24`).
- Default card padding is `--space-6` (24px). Tight contexts (chip rows, inline previews) use `--space-3`/`--space-4`.
- Conversation column caps at `--chat-column-max` (720px). Long-form text is harder to read wider than that.
- Sidebar is `--sidebar-width` (72px) — icon-only with hover labels. Never expand it during a flow; it's a constant.

---

## 6. Radius & elevation

- Rounded everywhere. Buttons and inputs use `--radius-md` (10px), cards use `--radius-xl` (18px), hero panels use `--radius-2xl` (24px). Pills and circular icon buttons use `--radius-full`.
- Elevation is soft and low. Use `--shadow-sm` for resting cards, `--shadow-md` for raised popovers, `--shadow-lg` for modals. Avoid `--shadow-xl` outside true overlays.
- Shadows always have a 1px subtle border underneath (`--border-subtle`) — the shadow alone does not separate a card from a near-white canvas.

---

## 7. Motion

Motion is part of Scout's voice. Calm, deliberate, decelerating into rest.

- **Standard interactions**: `--duration-base` (220ms) with `--ease-standard`. Buttons, hover states, focus rings.
- **Card reveals & view transitions**: `--duration-slow` (360ms) with `--ease-emphasized`. Confirmation cards, dashboard handoff.
- **Scout pacing**: between narrated processing observations, wait `--scout-beat` (1100ms) by default. Use `--scout-beat-short` for short observations, `--scout-beat-long` for the synthesis line before a confirmation card.

What we don't do: bouncy springs, parallax, attention-grabbing wiggles. Scout is confident; confident things don't fidget.

---

## 8. Component patterns

### Scout message
- Avatar: 28px circle with the AI gradient sparkle, on the left
- Name "Scout" + subtle timestamp on the first message of a turn; suppressed for consecutive messages
- Body: `--text-base`, `--leading-relaxed`, `--text-primary`
- Width capped at 560px

### User message
- Right-aligned, no avatar
- Background `--primary-soft`, text `--text-primary`, radius `--radius-lg`
- Same max width

### Suggestion chip / quick reply
- Pill, `--radius-full`, `--surface-sunken` background, `--text-primary`
- Hover lifts to `--surface-raised` with `--border-default`
- Sits directly under the message that prompted it

### Action input (URL / upload / verbal)
- Replaces the chat composer for that single message
- Three side-by-side options inside a soft card
- Resolves into a chip in the conversation history once submitted

### Confirmation card
- White surface, `--radius-xl`, `--shadow-sm`, 1px subtle border
- Field rows: label (`--text-tertiary`, label size) + value (`--text-primary`, body)
- Inline edit (pencil) on each row; "Looks right" primary button bottom-right, "Edit" ghost bottom-left

### Narrated processing
- Each line fades in over `--duration-base`, vertically translated 4px
- Indented under a small AI gradient bullet
- Final synthesis line gets a brief pause (`--scout-beat-long`) before the confirmation card slides in

### Composer
- Fixed bottom of conversation column
- Pill input, `--radius-full`, `--surface-raised`, `--shadow-xs`
- Left attach icon, right send icon (gradient when active, neutral when empty)

---

## 9. What "done" looks like

A screen is shippable when:

1. Every color, font size, space, radius, and shadow comes from a token.
2. Every Scout-authored string sounds like Scout (test: read it out loud).
3. The empty state, loading state (narrated, not spinner), and error state are all designed — not afterthoughts.
4. Motion runs once on entry and stays still during reading.
5. Removing the indigo accent leaves a usable, legible screen. (If it doesn't, you're using color to do hierarchy's job.)
