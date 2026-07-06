/* =========================================================================
   Flagstaff Social, Onboarding POC
   Complete onboarding use case.
   - Step-based conversation engine (each step is an async function)
   - Account-type branching (Brand vs Individual)
   - All input methods (URL / Upload / Verbal)
   - All skip / edit / adjust branches
   - Dashboard pending items reflect actual skipped steps
   No backend; Scout's "intelligence" is a deterministic story.
   ========================================================================= */

(() => {

/* =========================================================================
   1. STATE
   ========================================================================= */
const state = {
  accountType: 'brand',          // 'brand' | 'individual' (confirmed in chat post-scan)
  user: { name: 'Abdullah' },     // simulated: captured at sign-up before the conversation

  // Knowledge bases — populated as the conversation runs. The KB widget at
  // top-right reflects this in real time. Each entry: { label, value }.
  // Single panel-level expand state (compact 2×2 squares vs expanded 1/3-width).
  kb: {
    activeId: 'brand',         // Scout starts by filling Brand
    actionCallback: null,      // set during a confirmation moment; cleared on resolve
    brand:     { facts: [], expanded: false },
    trending:  { facts: [], expanded: false },
    algorithm: { facts: [], expanded: false },
  },

  // Identity collected during onboarding (mutable, edits write here)
  brand: null,                    // populated by step1 based on accountType
  productLines: [],               // populated by step3a (brand path)
  topics: [],                     // populated for individuals
  goals: [],
  audience: '',
  tone: '',
  competitors: [],

  // First-post artifacts
  selectedTrendGroupId: null,
  selectedIterationId: null,
  draftPost: '',
  publishedPost: null,            // { body, postedAt } once user hits Publish

  // Skip / branch flags, drive dashboard pending items
  skipped: new Set(),

  // Demo richness flag, toggle to demo "new account" variant
  xAccountMaturity: 'established', // 'established' | 'new'
};

/* Two demo identities, chosen by accountType in step 1 */
const DEMO_BRAND = {
  // Identity
  name: 'rasa',
  niche: 'Fashion / Heritage',
  industry: 'Heritage Fashion',
  products: ['Sindhi embroidered tops', 'Kashmiri shawls', 'Modern kurtas'],
  positioning: 'Modern Gen Z take on traditional Pakistani crafts',
  themes: ['Heritage', 'Sustainability', 'Local artisanship'],
  tone: 'Casual, witty, culture forward',
  websiteUrl: 'https://rasa.studio',
  competitorsDefault: ['@generation.pk', '@khaadiofficial', '@sapphirepakistan'],
  // X profile metadata (mirrors what Twitter exposes)
  handle: '@rasa',
  displayName: 'rasa',
  bio: 'Heritage, restitched. Made by hand, worn with pride. Sindhi & Kashmiri craft for the next generation.',
  location: 'Karachi, Pakistan',
  verified: true,
  followers: '4,320',
  following: '218',
  postCount: '187',
  joinDate: 'March 2024',
  // Performance signals
  topTopics: [
    { name: 'Heritage origin stories',   engagement: 92 },
    { name: 'Behind the scenes artisan', engagement: 67 },
    { name: 'Styling guides',            engagement: 45 },
  ],
  primaryAudience:   'Women 22 to 34 · Pakistan & diaspora',
  secondaryAudience: 'Mothers and gift buyers · 35 to 50',
  peakActivity: 'Weekdays 2 to 4pm PKT',
  audienceDefault: 'Women 22 to 34 in Pakistan, the UAE, and the Pakistani diaspora, culturally curious, mobile first, value heritage with a modern eye.',
  toneDirections: [
    {
      id: 'warm-story',
      label: 'Warm, story led',
      icon: 'i-heart',
      sample: "Heritage isn't an aesthetic. It's a postcode and a person who can name the stitch. We learn first, then we make.",
    },
    {
      id: 'direct-candid',
      label: 'Direct, candid',
      icon: 'i-bolt',
      sample: "We don't 'reinterpret tradition'. We work with people doing it now and we pay them properly. Everything else is marketing.",
    },
    {
      id: 'reverent-grounded',
      label: 'Reverent, grounded',
      icon: 'i-mountain',
      sample: "Sindhi mirror work. Mid century origins. Bibi taught us. She's been at it 31 years. Worth knowing whose hands made what you wear.",
    },
  ],
  trendGroups: [
    {
      id: 'heritage',
      theme: '#SouthAsianHeritageWeek',
      tone: 'Warm, story led',
      format: 'Image + caption',
      signal: '4.2× w/w',
      summary: 'Spiking now. Strong overlap with your themes and audience.',
    },
    {
      id: 'founder',
      theme: 'Founder transparency',
      tone: 'Direct, candid',
      format: 'Short thread',
      signal: 'Saves +38%',
      summary: 'Audiences in your niche are bookmarking honest founder notes more than launches.',
    },
    {
      id: 'craft',
      theme: 'Behind the scenes craft',
      tone: 'Reverent, grounded',
      format: 'Single post + photo',
      signal: 'Saves > likes',
      summary: 'Workshop content gets craft questions; studio content gets price questions.',
    },
  ],
  postIterations: {
    heritage: [
      { id: 'a', angle: 'Personal story', body: "My nani's dupatta has stitches I can't name. This week I'm trying to learn them, properly. If you've got heritage you don't fully know, you're not alone. Pull a thread, see what unspools." },
      { id: 'b', angle: 'Hot take',       body: "Half of what gets called 'heritage' on this app is aesthetics with no postcode. The actual craft has names, regions, and people still doing it for less than it's worth. Worth knowing the difference." },
      { id: 'c', angle: 'Data driven',    body: "We pulled the numbers on our last 30 posts. The ones that named the artisan and the region got 3.8× the saves of pure product shots. Audiences want context, not catalog. #SouthAsianHeritageWeek" },
    ],
    founder: [
      { id: 'a', angle: 'Personal story', body: "Year one of running rasa: I underpaid myself, overpaid for marketing, and learned that the artisans we work with had been waiting twenty years for someone to put their names on the label. That last one is why we keep going." },
      { id: 'b', angle: 'Hot take',       body: "Founder transparency on this app is mostly performance. Real transparency is boring. This is what the cost breakdown looks like, this is what we got wrong last quarter, this is what we're still figuring out." },
      { id: 'c', angle: 'Data driven',    body: "Posts where we share an honest founder note get 2.6× more replies than launch posts. Replies turn into customers at 4× the rate of likes. The lesson: stop polishing, start talking." },
    ],
    craft: [
      { id: 'a', angle: 'Personal story', body: "Spent the morning at Bibi's workshop in Hyderabad. She's been doing mirror work for 31 years. Her hands move faster than I can take notes. Some of what we sell started here. Felt important to say." },
      { id: 'b', angle: 'Hot take',       body: "If your 'handcrafted' brand can't show you the hands, it isn't. The reason most heritage brands hide the workshop is that the workshop is the asset, not the boutique." },
      { id: 'c', angle: 'Data driven',    body: "Workshop reels outperform studio reels 1.8× for us. The comment sentiment is different too. Workshop content gets craft questions, studio content gets price questions. Tells you what your audience actually cares about." },
    ],
  },
};

const DEMO_INDIVIDUAL = {
  name: 'Abdullah Qamar',
  niche: 'Product design / Design systems',
  industry: 'Product Design',
  products: ['Practical design writing', 'Design system templates', 'Office hours mentoring'],
  positioning: 'Practical product design, no fluff, no jargon, things you can actually use Monday',
  themes: ['Design systems', 'Career growth', 'Honest critique'],
  tone: 'Direct, generous, lightly opinionated',
  websiteUrl: 'https://aqamar.design',
  competitorsDefault: ['@brian_lovin', '@mds', '@rauchg'],
  handle: '@aqamar',
  displayName: 'Abdullah Qamar',
  bio: 'Independent product designer. Writing about craft, systems, and shipping. Office hours every Friday.',
  location: 'Lahore, Pakistan',
  verified: false,
  followers: '2,140',
  following: '486',
  postCount: '94',
  joinDate: 'January 2023',
  topTopics: [
    { name: 'Design system teardowns', engagement: 88 },
    { name: 'Honest takes',            engagement: 64 },
    { name: 'Career advice threads',   engagement: 41 },
  ],
  primaryAudience:   'Designers · PMs · 25 to 40',
  secondaryAudience: 'Founders / heads of product at early stage startups',
  peakActivity: 'Weekday mornings PKT',
  audienceDefault: 'Designers and PMs 25 to 40, mid level, building craft and reputation. Mostly North America and South Asia, mobile first, save things for later.',
  toneDirections: [
    {
      id: 'direct-generous',
      label: 'Direct, generous',
      icon: 'i-compass',
      sample: "Most design system posts skip the part that matters: adoption. Token tables are easy. Getting a PM to ship without DMing a designer is hard.",
    },
    {
      id: 'confessional-specific',
      label: 'Confessional, specific',
      icon: 'i-quote',
      sample: "Shipped a design system once. Engineers ignored it for six months. The fix: I'd built the wrong primitive. Lesson learned twice.",
    },
    {
      id: 'sharp-contrarian',
      label: 'Sharp, contrarian',
      icon: 'i-diamond',
      sample: "'AI replaces designers' is a take from people who don't ship. The real question is which 30% of the job goes first, and whether you're spending 30% of your time there.",
    },
  ],
  topics: [
    'Design systems',
    'Product craft',
    'AI tooling',
    'Career growth',
    'Honest critique',
    'Design leadership',
    'Indie shipping',
    'Side projects',
  ],
  trendGroups: [
    {
      id: 'ai-tooling',
      theme: 'AI tooling debate',
      tone: 'Measured, opinionated',
      format: 'Short thread',
      signal: 'Saves 5.6× on nuance',
      summary: 'Designers split on Cursor / Figma AI. Specifics outperform takes.',
    },
    {
      id: 'system-teardowns',
      theme: 'Design system teardowns',
      tone: 'Direct, generous',
      format: 'Post + screenshot',
      signal: 'Bookmarks 3× niche avg',
      summary: 'Audiences in your niche save concrete component decisions more than essays.',
    },
    {
      id: 'public-work',
      theme: 'Working in public',
      tone: 'Specific, confessional',
      format: 'Single post',
      signal: 'Reply rate +42%',
      summary: 'Posts that name what you got wrong outperform highlight reels.',
    },
  ],
  postIterations: {
    'ai-tooling': [
      { id: 'a', angle: 'Personal story', body: "I tried replacing my Figma workflow with Cursor for two weeks. Three things broke, two things got faster, one thing made me look stupider than I actually am. Notes below." },
      { id: 'b', angle: 'Hot take',       body: "The 'AI replaces designers' debate is mostly people who don't design talking to people who don't ship. The real question is which 30% of the job goes first, and whether you're already spending 30% of your time on it." },
      { id: 'c', angle: 'Data driven',    body: "Looked at engagement on AI tool posts in our niche over 90 days. Nuanced takes (specific tool, specific task, specific tradeoff) outperform 'AI is great/bad' posts by 5.6× on saves. Specifics win." },
    ],
    'system-teardowns': [
      { id: 'a', angle: 'Personal story', body: "First time I shipped a design system, I optimized the wrong thing for six months. I made the buttons perfect. Nobody used the buttons. The thing engineering needed was a layout primitive I hadn't built. Lesson learned twice." },
      { id: 'b', angle: 'Hot take',       body: "Most design system posts on here are screenshots of token tables. Tokens aren't the system. The system is whether a PM can ship a feature without DMing a designer at 6pm. Measure that." },
      { id: 'c', angle: 'Data driven',    body: "Audit of 12 internal design systems I've worked on: the ones that got adopted shared one trait. They shipped one usable component before they had a doc site. The ones with great docs and no early component sat unused. Component first, doc second." },
    ],
    'public-work': [
      { id: 'a', angle: 'Personal story', body: "Office hours this Friday. Four free 30 minute slots for designers stuck on a system decision. I'll learn something too. Half the time the question reframes how I'd answer it. Reply if you want one." },
      { id: 'b', angle: 'Hot take',       body: "Building in public on this app has become its own genre, and most of it is the same three updates dressed differently. If you want it to land, share the decision you got wrong, not the dashboard going up and to the right." },
      { id: 'c', angle: 'Data driven',    body: "Posts where I share something I got wrong get 2.4× the reply rate of posts where I share what worked. Replies become DMs become consulting calls. The 'wrong' content is the funnel." },
    ],
  },
};

/* =========================================================================
   2. DOM HELPERS
   ========================================================================= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const stream = $('#stream');
const crumbs = $('#crumbs');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Parse a raw SVG string into actual SVG DOM (innerHTML on an <svg> element
// uses the HTML parser and silently lowercases names like `linearGradient`
// and discards SVG-specific attributes). Use this when you need proper SVG.
function parseSvg(svgString) {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  return doc.documentElement;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

const icon = (id) => `<svg><use href="#${id}"/></svg>`;

function scrollDown() {
  // Scroll on the next frame, then again after the typical card-in animation
  // (~380ms). The second pass catches cards that grow after appending.
  requestAnimationFrame(() => { stream.scrollTop = stream.scrollHeight; });
  setTimeout(() => { stream.scrollTop = stream.scrollHeight; }, 400);
}

function append(node) {
  stream.appendChild(node);
  scrollDown();
  // Some elements (cards) have an entry animation that grows their height.
  // Re-scroll once the animation finishes so the bottom stays in view.
  node.addEventListener('animationend', () => {
    stream.scrollTop = stream.scrollHeight;
  }, { once: true });
  return node;
}

function showView(id) {
  $$('.view').forEach(v => v.classList.remove('view--active'));
  $('#' + id).classList.add('view--active');
}

function setCrumbs(parts) {
  crumbs.innerHTML = '';
  parts.forEach((p, i) => {
    if (i > 0) crumbs.appendChild(el('span', { class: 'crumbs__sep' }, '›'));
    crumbs.appendChild(el('span', { class: i === parts.length - 1 ? 'crumbs__current' : '' }, p));
  });
}

/* =========================================================================
   3. MESSAGE RENDERERS
   ========================================================================= */
function scoutTyping() {
  // The avatar IS the loader. Inline circles so each can carry its own
  // animation phase. No separate body element during the thinking moment.
  const avatarSvg =
    '<svg viewBox="0 0 32 32" aria-hidden="true">' +
      '<circle cx="8"  cy="8"  r="6" class="scout-loader__c scout-loader__c--1"/>' +
      '<circle cx="8"  cy="24" r="6" class="scout-loader__c scout-loader__c--2"/>' +
      '<circle cx="24" cy="24" r="6" class="scout-loader__c scout-loader__c--3"/>' +
      '<circle cx="24" cy="8"  r="6" class="scout-loader__c scout-loader__c--4"/>' +
    '</svg>';

  const node = el('div', { class: 'msg msg--scout' }, [
    el('div', { class: 'msg__head' }, [
      el('span', {
        class: 'msg__avatar msg__avatar--scout msg__avatar--loading',
        'aria-label': 'Scout is thinking',
        html: avatarSvg,
      }),
      el('span', { class: 'msg__name' }, 'Scout'),
    ]),
  ]);
  return append(node);
}

async function scoutMsg(text, { beat = 600, typingFor = 700, charSpeed = 14 } = {}) {
  // Only the current Scout message shows its avatar/name head. Mark previous
  // ones as past so the chat reads as a single live speaker rather than a
  // wall of repeated avatars.
  document.querySelectorAll('.msg--scout').forEach(m => m.classList.add('msg--past'));
  const typingNode = scoutTyping();
  await sleep(typingFor);
  // Avatar stops animating: drop the loading class and swap inline circles
  // for the static logo reference.
  const avatar = typingNode.querySelector('.msg__avatar--scout');
  avatar.classList.remove('msg__avatar--loading');
  avatar.innerHTML = '<svg><use href="#i-logo"/></svg>';
  // Append text node and stream characters into it.
  const textNode = el('div', { class: 'msg__text' });
  typingNode.appendChild(textNode);
  scrollDown();
  await typewriterInto(textNode, text, charSpeed);
  // After typewriter completes, auto-emphasise key tokens for visual hierarchy.
  textNode.innerHTML = highlightKeywords(textNode.textContent);
  await sleep(beat);
  return typingNode;
}

// Wraps numbers, brand/user names, and a small allow-list of key actions in
// <strong class="kw"> so they read as visual anchors against the lighter body.
function highlightKeywords(text) {
  if (!text) return '';
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tokens = [];
  if (state && state.user && state.user.name) tokens.push(state.user.name);
  if (state && state.brand && state.brand.displayName) tokens.push(state.brand.displayName);
  if (state && state.brand && state.brand.name && (!state.brand.displayName || state.brand.name !== state.brand.displayName)) {
    tokens.push(state.brand.name);
  }
  tokens.sort((a, b) => b.length - a.length);
  const escForRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tokenAlt = tokens.length ? tokens.map(escForRe).join('|') : null;
  const combined = new RegExp(
    [
      tokenAlt && `\\b(?:${tokenAlt})\\b`,
      '\\b\\d{1,3}(?:,\\d{3})+\\b',
      '\\b\\d+(?:\\.\\d+)?×',
      '\\b\\d+(?:\\.\\d+)?%',
      '\\bfive minutes\\b',
      '\\bthree seconds\\b',
      '\\bConnect\\b',
      '\\bLooks right\\b',
      '\\bPublish\\b',
    ].filter(Boolean).join('|'),
    'g'
  );
  return escape(text).replace(combined, (m) => `<strong class="kw">${m}</strong>`);
}

async function typewriterInto(node, text, baseSpeed = 14) {
  // Reveal characters one at a time with natural rhythm at punctuation.
  // Auto-scrolls when newlines arrive so the user follows along.
  for (let i = 0; i < text.length; i++) {
    node.appendChild(document.createTextNode(text[i]));
    const ch = text[i];
    let delay;
    if (ch === '.' || ch === '?' || ch === '!') delay = 160;
    else if (ch === ',' || ch === ';' || ch === ':') delay = 90;
    else if (ch === '\n') { delay = 220; scrollDown(); }
    else delay = baseSpeed;
    await sleep(delay);
  }
  scrollDown();
}

function userMsg(text) {
  // User messages render as a white right-aligned bubble. No avatar / name —
  // the bubble itself is the differentiation from Scout's plain-text turns.
  const node = el('div', { class: 'msg msg--user' }, [
    el('div', { class: 'msg__bubble' }, text),
  ]);
  return append(node);
}

/* =========================================================================
   4. INTERACTIVE COMPONENTS
   Each returns a Promise resolving to the user's choice.
   ========================================================================= */

// Quick replies: pills register as a user-prompt bubble. All pills remain
// visible; the chosen one is highlighted, the rest dim but stay clickable so
// the user can change their mind. The choice commits after a short idle.
function quickReplies(options, { primaryIndex = -1, settleMs = 1500 } = {}) {
  return new Promise((resolve) => {
    const wrap = el('div', { class: 'qreplies' });
    let activeBtn = null;
    let bubble = null;
    let commitTimer = null;

    const updateChoice = (btn, opt) => {
      if (activeBtn === btn) return;
      activeBtn = btn;
      Array.from(wrap.children).forEach((c) => {
        c.classList.toggle('qreply--chosen', c === btn);
        c.classList.toggle('qreply--dim', c !== btn);
      });
      if (!bubble) {
        bubble = userMsg(opt);
      } else {
        const t = bubble.querySelector('.msg__bubble');
        if (t) t.textContent = opt;
      }
      if (commitTimer) clearTimeout(commitTimer);
      commitTimer = setTimeout(() => {
        wrap.classList.add('qreplies--chosen');
        Array.from(wrap.children).forEach((c) => { c.disabled = true; });
        resolve(opt);
      }, settleMs);
    };

    options.forEach((opt, i) => {
      const btn = el('button', {
        class: 'qreply' + (i === primaryIndex ? ' qreply--primary' : ''),
        onclick: () => updateChoice(btn, opt),
      }, opt);
      wrap.appendChild(btn);
    });
    append(wrap);
  });
}

function selectionChips(options, {
  allowCustom = false,
  customLabel = 'Something else',
  maxSelections = 0, // 0 = unlimited
} = {}) {
  return new Promise((resolve) => {
    const selected = new Set();
    const group = el('div', { class: 'chips-group' });
    const helperRow = maxSelections > 0
      ? el('div', { class: 'chips-helper' }, `Pick up to ${maxSelections}`)
      : null;
    if (helperRow) group.appendChild(helperRow);
    const wrap = el('div', { class: 'chips' });

    // Sync capped/disabled state on every selectable chip. The "Add your
    // own" button is itself a chip but it's a *trigger*, not selectable —
    // so we don't toggle aria-pressed on it.
    const refreshState = () => {
      const atCap = maxSelections > 0 && selected.size >= maxSelections;
      Array.from(wrap.children).forEach((chip) => {
        if (chip.classList.contains('chip--custom')) {
          // The custom trigger goes capped when the user has filled all slots.
          chip.classList.toggle('chip--capped', atCap);
          return;
        }
        const pressed = chip.getAttribute('aria-pressed') === 'true';
        chip.classList.toggle('chip--capped', atCap && !pressed);
      });
      done.disabled = selected.size === 0;
    };

    // Toggle a regular (non-custom) chip. Handles cap shake + selection
    // accounting. Custom-added pills also use this handler so they can be
    // deselected by clicking them again.
    const toggleChip = (btn, value) => {
      const on = btn.getAttribute('aria-pressed') === 'true';
      if (!on && maxSelections > 0 && selected.size >= maxSelections) {
        btn.classList.remove('chip--shake');
        void btn.offsetWidth;
        btn.classList.add('chip--shake');
        return;
      }
      btn.setAttribute('aria-pressed', String(!on));
      on ? selected.delete(value) : selected.add(value);
      refreshState();
    };

    // Build the seed chips from the option list.
    options.forEach((opt) => {
      const btn = el('button', {
        class: 'chip',
        type: 'button',
        'aria-pressed': 'false',
        onclick: () => toggleChip(btn, opt),
      }, opt);
      wrap.appendChild(btn);
    });

    // "Add your own" trigger — clicking opens an inline text input. The
    // resulting pill is a regular chip with its own toggle handler, so
    // the user can click it again to deselect.
    let customTrigger = null;
    if (allowCustom) {
      customTrigger = el('button', {
        class: 'chip chip--custom',
        type: 'button',
        onclick: async () => {
          if (maxSelections > 0 && selected.size >= maxSelections) {
            customTrigger.classList.remove('chip--shake');
            void customTrigger.offsetWidth;
            customTrigger.classList.add('chip--shake');
            return;
          }
          const customText = await inlineTextInput({
            placeholder: 'Type your own…',
            submitLabel: 'Add',
          });
          if (!customText) return;
          // De-dup against existing tags (case-insensitive).
          const exists = Array.from(wrap.children).some(c =>
            !c.classList.contains('chip--custom') &&
            c.textContent.trim().toLowerCase() === customText.trim().toLowerCase()
          );
          if (exists) return;
          selected.add(customText);
          const tag = el('button', {
            class: 'chip',
            type: 'button',
            'aria-pressed': 'true',
            onclick: () => toggleChip(tag, customText),
          }, customText);
          wrap.insertBefore(tag, customTrigger);
          refreshState();
        },
      }, customLabel);
      wrap.appendChild(customTrigger);
    }

    const done = el('button', {
      class: 'qreply qreply--primary chips__done',
      type: 'button',
      disabled: 'true',
      onclick: () => {
        if (selected.size === 0) return;
        const list = Array.from(selected);
        // Drop unselected chips + the custom trigger; freeze selected ones.
        Array.from(wrap.children).forEach((chip) => {
          const isPressed = chip.getAttribute('aria-pressed') === 'true';
          const isCustomTrigger = chip.classList.contains('chip--custom');
          if (isCustomTrigger || !isPressed) chip.remove();
        });
        Array.from(wrap.children).forEach((chip) => {
          chip.disabled = true;
          chip.classList.add('chip--chosen');
        });
        wrap.classList.add('chips--chosen');
        if (helperRow) helperRow.remove();
        doneRow.remove();
        group.classList.add('is-settled');
        userMsg(list.join(', '));
        resolve(list);
      },
    }, 'Done');
    const doneRow = el('div', { class: 'chips-group__actions' }, [done]);
    group.appendChild(wrap);
    group.appendChild(doneRow);
    append(group);
  });
}

function inlineTextInput({ placeholder = 'Type a response…', submitLabel = 'Send', initial = '' } = {}) {
  return new Promise((resolve) => {
    const input = el('input', { type: 'text', placeholder, value: initial });
    const wrap = el('div', { class: 'url-inline' }, [
      input,
      el('button', {
        onclick: () => {
          const v = input.value.trim();
          wrap.remove();
          if (v) userMsg(v);
          resolve(v);
        },
      }, submitLabel),
    ]);
    append(wrap);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') wrap.querySelector('button').click(); });
    requestAnimationFrame(() => input.focus());
  });
}

// ----- Composer-as-input ----------------------------------------------------
// The chat bar at the bottom is the universal text input. By default it is
// DISABLED. It is enabled only while we are awaiting user text input
// (awaitComposer). At every other moment (Scout typing, narrated processing,
// pending quick-reply or chip selection), the composer reads as inert so the
// user knows to interact through the controls Scout has surfaced.
let pendingComposerResolver = null;

function setComposerEnabled(enabled) {
  const input = $('#composer-input');
  const send = $('#composer-send');
  const pill = $('.composer-pill');
  if (!input || !pill) return;
  input.disabled = !enabled;
  if (send) send.disabled = !enabled;
  pill.classList.toggle('composer-pill--disabled', !enabled);
}

function awaitComposer({ placeholder = 'Message Scout…' } = {}) {
  return new Promise((resolve) => {
    const input = $('#composer-input');
    input.placeholder = placeholder;
    pendingComposerResolver = resolve;
    setComposerEnabled(true);
    requestAnimationFrame(() => input.focus());
  });
}

async function openingHero() {
  // Greeting hero: Scout logo animates in, then the greeting beats type out,
  // then the profile-type picker reveals. No "Start" hook — splash 3's CTA
  // already framed the journey, so we land directly on Scout's introduction.
  const hero = buildHero();
  $('.conv').prepend(hero);
  document.body.classList.add('mode-hero');

  const logoStage = hero.querySelector('.hero__mark');
  const titleEl   = hero.querySelector('.hero__title');
  const subEl     = hero.querySelector('.hero__sub');
  const greet     = {
    title:    hero.querySelector('.hero__title'),
    sub:      hero.querySelector('.hero__sub'),
    question: hero.querySelector('.hero__question'),
    blocks:   hero.querySelector('.hero__blocks'),
  };

  // Beat 0: Scout logo animates in (scale + fade) and stays.
  await sleep(220);
  logoStage.classList.add('hero__stage--in', 'hero__mark--enter');
  await sleep(720);

  // Beat 1: "Hi, [Name]."
  greet.title.classList.add('hero__stage--in');
  await typewriterInto(titleEl, `Hi, ${state.user.name}.`, 55);
  await sleep(550);

  // Beat 2: "I'm Scout, your marketing strategist."
  greet.sub.classList.add('hero__stage--in');
  await typewriterInto(subEl, "I'm Scout, your marketing strategist.", 45);
  await sleep(700);

  // Beat 3: question line.
  greet.question.classList.add('hero__stage--in');
  await sleep(440);

  // Beat 4: profile-type blocks; wait for click before exiting.
  greet.blocks.classList.add('hero__stage--in');

  await new Promise((resolve) => {
    hero.querySelectorAll('.hero-block').forEach((b) => {
      b.addEventListener('click', () => {
        state.accountType = b.dataset.acct;
        hero.querySelectorAll('.hero-block').forEach(x => x.setAttribute('data-picked', String(x === b)));
        resolve();
      }, { once: true });
    });
  });
  await sleep(280);

  // Hero exits, composer fades in at its bottom slot
  await heroExit(hero);
  document.body.classList.remove('mode-hero');
  await sleep(350);

  const composerPill = $('.composer-pill');
  composerPill.style.opacity = '0';
  composerPill.style.transition = 'opacity 500ms ease';
  void composerPill.offsetHeight;
  composerPill.style.opacity = '1';

  hero.remove();
  setTimeout(() => { composerPill.style.transition = ''; }, 600);
}

async function heroExit(hero) {
  const stages = hero.querySelectorAll('.hero__stage');
  // Reverse: input/question first, then title, then mark
  for (let i = stages.length - 1; i >= 0; i--) {
    stages[i].classList.remove('hero__stage--in');
    stages[i].classList.add('hero__stage--out');
    await sleep(120);
  }
  await sleep(400);
}

function buildHero() {
  // Greeting hero only — no hook layer. Logo animates in once, then the
  // greeting beats reveal in sequence, then the profile-type picker shows.
  return el('div', { class: 'hero', id: 'hero' }, [
    el('div', { class: 'hero__inner' }, [
      el('div', {
        class: 'hero__mark hero__stage',
        html: '<svg width="44" height="44" style="color: var(--primary);"><use href="#i-logo"/></svg>',
      }),
      el('div', { class: 'hero__slot' }, [
        el('div', { class: 'hero__greet' }, [
          el('h1', { class: 'hero__title hero__stage' }),
          el('p',  { class: 'hero__sub hero__stage' }),
          el('div', { class: 'hero__question hero__stage' }, "Tell me who I'm setting up for."),
          el('div', { class: 'hero__blocks hero__stage' }, [
            heroBlock('individual', 'i-individual', 'Individual', 'Solo creator, freelancer, or thought leader'),
            heroBlock('brand',      'i-brand',      'Brand',      'Company, agency, or multi-product brand'),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function heroBlock(acct, _iconId, label, desc) {
  return el('button', {
    class: 'hero-block',
    'data-acct': acct,
    'data-picked': 'false',
  }, [
    el('div', { class: 'hero-block__body' }, [
      el('span', { class: 'hero-block__label' }, label),
      el('div', { class: 'hero-block__desc' }, desc),
    ]),
    el('span', { class: 'hero-block__chevron', html: icon('i-chevron-right') }),
  ]);
}

/* =========================================================================
   5. NARRATED PROCESSING
   ========================================================================= */
// Single-line narrated process. No card, no list. Each pointer occupies the
// same slot in the chat: it fades in, holds, fades up, and the next pointer
// takes its place. Each accepts {icon, text} (or a bare string with a default
// icon). The text is rendered in a soft indigo shade so it reads as ambient
// status rather than chat content.
async function narratedProcess(_label, lines, { lineBeat = 1400, exitBeat = 360, _finalBeat = 0 } = {}) {
  // The icon plate stays anchored in place — only its inner SVG cross-fades
  // and rotates softly between activities. The text uses its existing
  // up/in & up/out pattern so each phrase reads as a fresh thought.
  const iconHolder = el('span', { class: 'proc-line__icon' }, [
    el('span', { class: 'proc-line__icon-pulse', 'aria-hidden': 'true' }),
    el('span', { class: 'proc-line__icon-glyph', 'aria-hidden': 'true' }),
  ]);
  const textHolder = el('span', { class: 'proc-line__text-slot' });
  const pointer = el('div', { class: 'proc-line__pointer proc-line__pointer--persistent' }, [
    iconHolder, textHolder,
  ]);
  const slot = el('div', { class: 'proc-line' }, [pointer]);
  append(slot);

  const normalize = (l) => (typeof l === 'string' ? { icon: 'i-sparkle', text: l } : l);
  const iconGlyph = iconHolder.querySelector('.proc-line__icon-glyph');

  // Force a layout/paint so the browser sees the "pre" (opacity 0)
  // state before we add the `--in` class. Without this, the transition
  // is skipped because the element has never been painted in its
  // initial state.
  const flushIntoView = (node) => {
    // eslint-disable-next-line no-unused-expressions
    node.offsetHeight;
  };

  const swapIcon = async (iconId, isFirst) => {
    const next = el('span', { class: 'proc-line__icon-frame', html: icon(iconId) });
    if (isFirst) {
      iconGlyph.innerHTML = '';
      iconGlyph.appendChild(next);
      flushIntoView(next);
      next.classList.add('proc-line__icon-frame--in');
      return;
    }
    // Old icon exits first (~260ms). New icon enters slightly delayed
    // (CSS adds a 120ms entrance delay), keeping the swap clean.
    const old = iconGlyph.firstChild;
    iconGlyph.appendChild(next);
    flushIntoView(next);
    next.classList.add('proc-line__icon-frame--in');
    if (old) {
      old.classList.remove('proc-line__icon-frame--in');
      old.classList.add('proc-line__icon-frame--out');
      setTimeout(() => old.remove(), 320);
    }
  };

  const swapText = async (text, isFirst) => {
    const nextText = el('span', { class: 'proc-line__text-line' }, text);
    if (isFirst) {
      textHolder.innerHTML = '';
      textHolder.appendChild(nextText);
      flushIntoView(nextText);
      nextText.classList.add('proc-line__text-line--in');
      return;
    }
    // Old line exits first (~280ms). New line enters delayed (CSS adds
    // 120ms entrance delay) so the two don't sit on top of each other.
    const old = textHolder.firstChild;
    textHolder.appendChild(nextText);
    flushIntoView(nextText);
    nextText.classList.add('proc-line__text-line--in');
    if (old) {
      old.classList.remove('proc-line__text-line--in');
      old.classList.add('proc-line__text-line--out');
      setTimeout(() => old.remove(), 320);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const { icon: iconId, text } = normalize(lines[i]);
    await swapIcon(iconId, i === 0);
    await swapText(text, i === 0);
    scrollDown();
    await sleep(lineBeat);
  }

  // Exit: fade out the whole pointer.
  pointer.classList.add('proc-line__pointer--exit');
  await sleep(exitBeat);
  slot.remove();
  return null;
}

/* =========================================================================
   6. CONFIRMATION CARD with INLINE EDIT
   ========================================================================= */
function confirmationCard({ title, rows, primary = 'Looks right', onEditField } = {}) {
  return new Promise((resolve) => {
    const rowEls = rows.map(([label, value, key]) => makeConfRow(label, value, key, onEditField));

    const card = el('div', { class: 'conf' }, [
      el('div', { class: 'conf__title' }, [
        el('div', { class: 'conf__title-left' }, [
          document.createTextNode(title),
        ]),
      ]),
      el('div', { class: 'conf__rows' }, rowEls),
      el('div', { class: 'conf__hint' }, 'Tap any row to edit. Sign off when it reads right.'),
      el('div', { class: 'conf__actions' }, [
        el('button', { class: 'btn-primary', onclick: () => { card.remove(); userMsg(primary); resolve('confirm'); } }, primary),
      ]),
    ]);
    append(card);
  });
}

function makeConfRow(label, value, key, onEditField) {
  // value can be string, array, or HTMLElement
  let valNode;
  if (Array.isArray(value)) {
    valNode = el('div', { class: 'conf__val' }, [bulletList(value)]);
  } else if (typeof value === 'string') {
    valNode = el('div', { class: 'conf__val' }, value);
  } else {
    valNode = el('div', { class: 'conf__val' }, [value]);
  }

  const editBtn = el('button', { class: 'conf__edit', html: icon('i-pencil'), 'aria-label': 'Edit ' + label });

  const row = el('div', { class: 'conf__row' }, [
    el('div', { class: 'conf__label' }, label),
    valNode,
    editBtn,
  ]);

  editBtn.addEventListener('click', () => {
    // Replace value with input
    const isArray = Array.isArray(value);
    const isMultiLine = isArray || (typeof value === 'string' && value.length > 60);
    const initial = isArray ? value.join(', ') : (typeof value === 'string' ? value : '');
    const editor = isMultiLine
      ? el('textarea', { rows: '3' }, initial)
      : el('input', { type: 'text', value: initial });
    editor.className = 'conf__editor';

    const save = el('button', { class: 'btn-primary conf__save' }, 'Save');
    const cancel = el('button', { class: 'btn-ghost conf__cancel' }, 'Cancel');

    valNode.innerHTML = '';
    valNode.appendChild(editor);
    valNode.appendChild(el('div', { class: 'conf__edit-actions' }, [cancel, save]));

    editBtn.style.display = 'none';
    requestAnimationFrame(() => editor.focus());

    cancel.addEventListener('click', () => restoreView(value));
    save.addEventListener('click', () => {
      const newRaw = editor.value.trim();
      const newVal = isArray ? newRaw.split(',').map(s => s.trim()).filter(Boolean) : newRaw;
      if (key && onEditField) onEditField(key, newVal);
      restoreView(newVal);
    });

    function restoreView(v) {
      valNode.innerHTML = '';
      if (Array.isArray(v)) valNode.appendChild(bulletList(v));
      else valNode.appendChild(document.createTextNode(v));
      editBtn.style.display = '';
    }
  });

  return row;
}

function bulletList(items) {
  const ul = el('ul');
  items.forEach(i => ul.appendChild(el('li', {}, i)));
  return ul;
}

/* =========================================================================
   7. PRODUCT-LINES TREE CARD
   ========================================================================= */
function productLineTreeCard(lines) {
  return new Promise((resolve) => {
    const items = lines.map(line => el('div', { class: 'pl-tree__item' }, [
      el('div', { class: 'pl-tree__branch' }),
      el('div', { class: 'pl-tree__line' }, [
        el('div', { class: 'pl-tree__line-name' }, line.name),
        el('div', { class: 'pl-tree__line-meta' }, [
          el('span', {}, [el('strong', {}, 'Audience: '), document.createTextNode(line.audience)]),
          el('span', {}, [el('strong', {}, 'Tone: '), document.createTextNode(line.tone)]),
        ]),
      ]),
    ]));

    const card = el('div', { class: 'pl-tree' }, [
      el('div', { class: 'conf__title' }, [
        el('div', { class: 'conf__title-left' }, [
          document.createTextNode('Brand knowledge structure'),
        ]),
      ]),
      el('div', { class: 'pl-tree__master' }, [
        el('div', { class: 'pl-tree__master-label' }, 'MASTER BRAND'),
        el('div', { class: 'pl-tree__master-name' }, state.brand.name),
      ]),
      el('div', { class: 'pl-tree__items' }, items),
      el('div', { class: 'conf__actions' }, [
        el('button', {
          class: 'btn-primary',
          onclick: () => { card.remove(); userMsg('Looks right'); resolve('confirm'); },
        }, 'Looks right'),
      ]),
    ]);
    append(card);
  });
}

/* =========================================================================
   8. CONNECT X CARD
   ========================================================================= */
function connectSocial() {
  // Multi-platform connect card. X is active; IG / FB / TikTok are surfaced
  // with "Coming soon" pills so the user understands the product is
  // cross-platform with X as the first available surface.
  return new Promise((resolve) => {
    const platforms = [
      { id: 'x',         icon: 'i-x-logo',    name: 'X',          status: 'active' },
      { id: 'instagram', icon: 'i-instagram', name: 'Instagram',  status: 'soon' },
      { id: 'facebook',  icon: 'i-facebook',  name: 'Facebook',   status: 'soon' },
      { id: 'tiktok',    icon: 'i-tiktok',    name: 'TikTok',     status: 'soon' },
    ];

    const rows = platforms.map(p => {
      const isActive = p.status === 'active';
      const row = el('button', {
        class: 'platform platform--' + p.id + (isActive ? '' : ' platform--soon'),
        disabled: isActive ? null : 'true',
        // Keep the widget visible while the OAuth modal is open. The caller
        // (step5_x_connect) is responsible for marking the card as connected
        // after authorization completes.
        onclick: isActive
          ? () => resolve({ result: 'connect', card })
          : null,
      }, [
        el('span', { class: 'platform__icon', html: icon(p.icon) }),
        el('span', { class: 'platform__name' }, p.name),
        isActive
          ? el('span', { class: 'platform__cta' }, 'Connect')
          : el('span', { class: 'platform__pill' }, 'Coming soon'),
      ]);
      return row;
    });

    const card = el('div', { class: 'connect connect--multi' }, [
      el('div', { class: 'connect__head' }, [
        el('div', { class: 'connect__title' }, 'Connect a social account'),
        el('div', { class: 'connect__sub' }, "Read-only. Scout never posts without your approval."),
      ]),
      el('div', { class: 'platform-list' }, rows),
      el('div', { class: 'connect__actions' }, [
        el('button', {
          class: 'btn-ghost',
          onclick: () => { card.remove(); userMsg('Skip for now'); resolve({ result: 'skip', card: null }); },
        }, 'Skip for now'),
      ]),
    ]);
    append(card);
  });
}

/* =========================================================================
   9. INLINE PREVIEWS, X profile (established + new) + trends
   ========================================================================= */
function xProfilePreview(profile) {
  // Stats (top topics, audience, peak activity) are now rendered inside the
  // brand drawer instead of below the header. The chat surfaces only the
  // Twitter-faithful header here.
  xProfileHeader(profile);
}

// Twitter white-mode profile header — read as if pasted from twitter.com.
// Brand/individual accounts get their own banner + avatar assets.
function xProfileHeader(profile) {
  const verified = profile.verified
    ? el('span', { class: 'x-header__verified', 'aria-label': 'Verified', html: icon('i-check') })
    : null;
  const isBrand = state.accountType === 'brand';
  const bannerSrc  = isBrand ? '/BannerBrand.jpeg'  : '/Banner.jpeg';
  const avatarSrc  = isBrand ? '/ProfileBrand.jpeg' : '/Profile.png';

  const card = el('div', { class: 'x-header' }, [
    el('div', { class: 'x-header__banner', style: `background-image: url('${bannerSrc}');` }),
    el('div', { class: 'x-header__avatar', style: `background-image: url('${avatarSrc}');` }),
    el('div', { class: 'x-header__body' }, [
      el('div', { class: 'x-header__name' }, [
        document.createTextNode(profile.displayName || profile.name),
        verified,
      ]),
      el('div', { class: 'x-header__handle' }, profile.handle),
      profile.bio ? el('p', { class: 'x-header__bio' }, profile.bio) : null,
      el('div', { class: 'x-header__meta' }, [
        profile.location ? el('span', { class: 'x-header__meta-item' }, [
          el('span', { class: 'x-header__meta-icon', html: icon('i-people') }),
          document.createTextNode(profile.location),
        ]) : null,
        profile.joinDate ? el('span', { class: 'x-header__meta-item' }, [
          el('span', { class: 'x-header__meta-icon', html: icon('i-cal') }),
          document.createTextNode(`Joined ${profile.joinDate}`),
        ]) : null,
      ]),
      el('div', { class: 'x-header__counts' }, [
        el('span', { class: 'x-header__count' }, [
          el('strong', {}, profile.following || '0'),
          document.createTextNode(' '),
          el('span', { class: 'x-header__count-label' }, 'Following'),
        ]),
        el('span', { class: 'x-header__count' }, [
          el('strong', {}, profile.followers || '0'),
          document.createTextNode(' '),
          el('span', { class: 'x-header__count-label' }, 'Followers'),
        ]),
      ]),
    ]),
  ]);
  append(card);
}

// Scout's analysis layered on top of the Twitter clone above.
function xProfileStats(profile) {
  const topTopicEls = (profile.topTopics || []).map(t => el('div', { class: 'topic-bar topic-bar--lg' }, [
    el('div', { class: 'topic-bar__row' }, [
      el('span', { class: 'topic-bar__name' }, t.name),
      el('span', { class: 'topic-bar__pct' }, `+${t.engagement}%`),
    ]),
    el('div', { class: 'topic-bar__track' }, [
      el('div', { class: 'topic-bar__fill', style: `width: ${Math.min(100, t.engagement)}%;` }),
    ]),
  ]));

  // Peak activity strip — parse hour range from peakActivity text if possible, else center it.
  const peakStrip = el('div', { class: 'peak-strip' }, [
    el('div', { class: 'peak-strip__track' }, [
      el('div', { class: 'peak-strip__highlight' }),
    ]),
    el('div', { class: 'peak-strip__labels' }, [
      el('span', {}, '12a'), el('span', {}, '6a'), el('span', {}, '12p'), el('span', {}, '6p'), el('span', {}, '12a'),
    ]),
  ]);

  const audienceBlock = (label, text) => el('div', { class: 'x-stats__audience-block' }, [
    el('div', { class: 'x-stats__avatars' }, [
      el('span', { class: 'x-stats__avatar' }),
      el('span', { class: 'x-stats__avatar' }),
      el('span', { class: 'x-stats__avatar' }),
    ]),
    el('div', { class: 'x-stats__eyebrow' }, label),
    el('div', { class: 'x-stats__audience-text' }, text),
  ]);

  const card = el('div', { class: 'x-stats' }, [
    el('div', { class: 'x-stats__section' }, [
      el('div', { class: 'x-stats__eyebrow' }, 'Top performing topics'),
      el('div', { class: 'topic-bars' }, topTopicEls),
    ]),
    el('div', { class: 'x-stats__section' }, [
      el('div', { class: 'x-stats__audience-grid' }, [
        audienceBlock('Primary audience', profile.primaryAudience),
        audienceBlock('Secondary audience', profile.secondaryAudience),
      ]),
    ]),
    el('div', { class: 'x-stats__section' }, [
      el('div', { class: 'x-stats__eyebrow' }, 'Peak activity'),
      peakStrip,
      el('div', { class: 'x-stats__peak-text' }, profile.peakActivity || ''),
    ]),
  ]);
  append(card);
}

function stat(value, label) {
  return el('div', { class: 'preview__stat' }, [
    el('div', { class: 'preview__stat-value' }, value || '0'),
    el('div', { class: 'preview__stat-label' }, label),
  ]);
}

function xProfilePreviewEmpty(profile) {
  const isBrand = state.accountType === 'brand';
  const bannerSrc = isBrand ? '/BannerBrand.jpeg'  : '/Banner.jpeg';
  const avatarSrc = isBrand ? '/ProfileBrand.jpeg' : '/Profile.png';
  const card = el('div', { class: 'preview preview--empty' }, [
    el('div', { class: 'preview__banner', style: `background-image: url('${bannerSrc}');` }),
    el('div', { class: 'preview__identity' }, [
      el('div', { class: 'preview__avatar', style: `background-image: url('${avatarSrc}');` }),
      el('div', { class: 'preview__name-row' }, [
        el('div', { class: 'preview__name' }, profile.displayName || profile.name),
        el('div', { class: 'preview__handle' }, profile.handle),
      ]),
    ]),
    profile.bio ? el('p', { class: 'preview__bio' }, profile.bio) : null,
    el('div', { class: 'preview__meta-row' }, [
      profile.location ? el('span', { class: 'preview__meta-item' }, [
        el('span', { class: 'preview__meta-icon', html: icon('i-people') }),
        document.createTextNode(profile.location),
      ]) : null,
      profile.joinDate ? el('span', { class: 'preview__meta-item' }, [
        el('span', { class: 'preview__meta-icon', html: icon('i-cal') }),
        document.createTextNode(`Joined ${profile.joinDate}`),
      ]) : null,
    ]),
    el('div', { class: 'preview__stats-row' }, [
      stat(profile.following || '0',  'Following'),
      stat(profile.followers,         'Followers'),
      stat(profile.postCount || '0',  'Posts'),
    ]),
    el('div', { class: 'preview__empty-note' }, [
      el('div', { class: 'preview__empty-icon', html: icon('i-sparkle') }),
      el('div', {}, [
        el('div', { class: 'preview__empty-title' }, 'No post history yet, leaning on signals around the account'),
        el('div', { class: 'preview__empty-sub' }, "I'll use your interest preferences, the accounts you follow, and your brand context to guide us until performance data builds up."),
      ]),
    ]),
    el('div', { class: 'preview__divider' }),
    el('div', { class: 'preview__section' }, [
      el('div', { class: 'preview__section-title' }, 'Inferred interest space'),
      topicRow('Accounts followed in niche',  '12'),
      topicRow('X interest tags',             'Fashion · Heritage · Sustainability'),
      topicRow("Bookmarks on others' posts", 'Heritage threads 4× more than product'),
    ]),
  ]);
  append(card);
}

function topicRow(name, stat) {
  return el('div', { class: 'topic-row' }, [
    el('span', { class: 'topic-row__name' }, name),
    el('span', { class: 'topic-row__stat' }, stat),
  ]);
}

/* =========================================================================
   10. TREND CARDS PREVIEW
   ========================================================================= */
/* =========================================================================
   SUCCESS-POST TEASER — opening hook, shown before the social-connect ask.
   A mock X post with high engagement, framing what Scout is going to help
   the user achieve. Visual proof anchors the value prop.
   ========================================================================= */

function successMetric(iconId, value, label) {
  return el('div', { class: 'success-post__metric' }, [
    el('span', { class: 'success-post__metric-icon', html: icon(iconId) }),
    el('span', { class: 'success-post__metric-value' }, value),
    el('span', { class: 'success-post__metric-label' }, label),
  ]);
}

function trendsPreview() {
  const items = state.accountType === 'brand' ? [
    ['i-fire',  'Trending: #SouthAsianHeritageWeek', 'Spiking 4.2× this week. Strong overlap with your audience and brand themes.'],
    ['i-trend', 'Competitor activity',                '@generation.pk posted a craft-origin reel yesterday, 22k views in 18h. @khaadiofficial running a Ramadan capsule teaser.'],
    ['i-people','Audience pattern',                   'Your demographic bookmarks heritage explained posts at 3× the niche average. Education plus aesthetic is the unlock.'],
  ] : [
    ['i-fire',  'Trending: AI design tooling debate', 'Strong week, designers split on Cursor / Figma AI. High bookmark rate on nuanced takes.'],
    ['i-trend', 'Competitor activity',                '@brian_lovin shipped a craft essay, 9k engagements in 24h. @rauchg on shipping speed, 14k.'],
    ['i-people','Audience pattern',                   'Your demographic responds 2.4× more to specific examples than to abstract principles. Show the artifact.'],
  ];
  const card = el('div', { class: 'preview preview--simple' }, [
    el('div', { class: 'preview__section' }, [
      el('div', { class: 'preview__section-title' }, "What's happening in your niche"),
      ...items.map(([ic, t, d]) => trendCard(ic, t, d)),
    ]),
  ]);
  append(card);
}
function trendCard(iconId, title, desc) {
  return el('div', { class: 'trend-card' }, [
    el('div', { class: 'trend-card__icon', html: icon(iconId) }),
    el('div', {}, [
      el('div', { class: 'trend-card__title' }, title),
      el('div', { class: 'trend-card__desc' }, desc),
    ]),
  ]);
}

/* =========================================================================
   11. DASHBOARD RENDER (pending items reflect actual skips)
   ========================================================================= */
/* =========================================================================
   KNOWLEDGE — top-right widget that fills as Scout learns.
   Compact: 2×2 grid of square blocks (40% empty / 80% filled).
   Expanded: 1/3 width vertical panel (100% opacity, full facts visible).
   ========================================================================= */
const KB_META = [
  { id: 'brand',     label: 'Brand',              empty: 'Identity, products, niche, voice' },
  { id: 'trending',  label: 'Trending',           empty: 'Trends, competitors, audience patterns' },
  { id: 'algorithm', label: 'Platform Algorithm', empty: 'X algorithm and content rules' },
];

// Brand block label depends on account type — "Brand" for brands,
// "About you" for individuals. Resolved at render time.
function kbBlockLabel(metaId) {
  if (metaId === 'brand') {
    return state.accountType === 'individual' ? 'About you' : 'Brand';
  }
  const meta = KB_META.find(m => m.id === metaId);
  return meta ? meta.label : metaId;
}

function renderKB() {
  const panel = document.getElementById('kb-panel');
  if (!panel) return;
  panel.innerHTML = '';

  const anyExpanded = ['brand', 'trending', 'algorithm'].some(k => state.kb[k].expanded);
  panel.classList.toggle('kb-panel--has-expanded', anyExpanded);

  // Backdrop overlay, mounted on body so it dims the entire app surface
  // behind the expanded panel. Click closes whichever block is expanded
  // (unless we're in a confirmation moment, which locks the panel open).
  let overlay = document.getElementById('kb-overlay');
  if (anyExpanded) {
    if (!overlay) {
      overlay = el('div', { id: 'kb-overlay', class: 'kb-overlay' });
      document.body.appendChild(overlay);
    }
    overlay.onclick = () => {
      if (state.kb.actionCallback) return;
      ['brand', 'trending', 'algorithm'].forEach(k => state.kb[k].expanded = false);
      renderKB();
    };
  } else if (overlay) {
    overlay.remove();
  }

  // Always-visible heading — single combined "Knowledge" label.
  panel.appendChild(el('div', { class: 'kb-panel__head' }, [
    el('div', { class: 'kb-panel__title' }, 'Knowledge'),
  ]));

  const grid = el('div', { class: 'kb-panel__grid' });

  KB_META.forEach((meta) => {
    const kb = state.kb[meta.id];
    const filled = kb.facts.length > 0;
    const isActive = state.kb.activeId === meta.id;
    const isExpanded = !!kb.expanded;
    const showActions = isExpanded && state.kb.actionCallback != null;

    // State precedence: expanded > active > filled > empty.
    let stateClass = ' kb-block--empty';
    if (isExpanded)      stateClass = ' kb-block--expanded';
    else if (isActive)   stateClass = ' kb-block--active' + (filled ? ' kb-block--has-content' : '');
    else if (filled)     stateClass = ' kb-block--filled';

    const summary = isExpanded
      ? null
      : (filled
          ? kb.facts.slice(0, 3).map(f => f.label).join(' · ') +
            (kb.facts.length > 3 ? ` · +${kb.facts.length - 3} more` : '')
          : meta.empty);

    const factEls = isExpanded
      ? (filled
          ? kb.facts.map(f => el('div', { class: 'kb-block__fact' }, [
              el('span', { class: 'kb-block__fact-label' }, f.label),
              el('span', { class: 'kb-block__fact-value' }, f.value),
            ]))
          : [el('div', { class: 'kb-block__placeholder' }, meta.empty)])
      : [];

    // Right-side affordance: a collapse arrow when expanded. The active
    // block shows a 4-corner animated sparkle field instead of a static dot
    // (rendered separately, below).
    let headRight = null;
    if (isExpanded) {
      headRight = el('button', {
        class: 'kb-block__collapse',
        'aria-label': 'Collapse',
        html: icon('i-collapse'),
        onclick: (e) => {
          e.stopPropagation();
          if (state.kb.actionCallback) return;
          kb.expanded = false;
          renderKB();
        },
      });
    }

    const blockChildren = [
      el('div', { class: 'kb-block__head' }, [
        el('div', { class: 'kb-block__title' }, kbBlockLabel(meta.id)),
        headRight,
      ]),
      summary ? el('div', { class: 'kb-block__summary' }, summary) : null,
      isExpanded ? el('div', { class: 'kb-block__body' }, factEls) : null,
    ];

    // Active-and-not-expanded: a quiet "Building…" status pinned to the
    // bottom-left. Three dots fade in turn — a typing-indicator rhythm,
    // subtle, no flash. Behind the status, three light-purple blobs
    // drift across the lower third of the block to indicate active
    // generation; a backdrop-blur layer above them softens into a
    // gradient wash.
    if (isActive && !isExpanded) {
      blockChildren.push(
        el('div', { class: 'kb-block__bloom', 'aria-hidden': 'true' }, [
          el('span', { class: 'kb-block__bloom-blob kb-block__bloom-blob--a' }),
          el('span', { class: 'kb-block__bloom-blob kb-block__bloom-blob--b' }),
          el('span', { class: 'kb-block__bloom-blob kb-block__bloom-blob--c' }),
          el('span', { class: 'kb-block__bloom-veil' }),
        ])
      );
      blockChildren.push(
        el('div', { class: 'kb-block__status', 'aria-live': 'polite' }, [
          document.createTextNode('Building'),
          el('span', { class: 'kb-block__status-dot' }, '.'),
          el('span', { class: 'kb-block__status-dot' }, '.'),
          el('span', { class: 'kb-block__status-dot' }, '.'),
        ])
      );
    }

    if (showActions) {
      blockChildren.push(
        el('div', { class: 'kb-block__action-footer' }, [
          el('button', {
            class: 'kb-block__action kb-block__action--ghost',
            onclick: (e) => { e.stopPropagation(); state.kb.actionCallback && state.kb.actionCallback('edit'); },
          }, 'Edit'),
          el('button', {
            class: 'kb-block__action kb-block__action--primary',
            onclick: (e) => { e.stopPropagation(); state.kb.actionCallback && state.kb.actionCallback('confirm'); },
          }, 'Looks right'),
        ])
      );
    }

    const block = el('div', {
      class: 'kb-block' + stateClass,
      'data-kb': meta.id,
      onclick: isExpanded
        // Click on an expanded block (away from buttons) collapses it,
        // unless we're in a confirmation moment for that block.
        ? (state.kb.actionCallback ? null : () => { kb.expanded = false; renderKB(); })
        // Click on a compact block expands it (collapses any other expanded block).
        : () => {
            ['brand', 'trending', 'algorithm'].forEach(k => state.kb[k].expanded = false);
            kb.expanded = true;
            renderKB();
          },
    }, blockChildren);

    grid.appendChild(block);
  });
  panel.appendChild(grid);
}


function addKBFact(kbId, label, value) {
  const kb = state.kb[kbId];
  if (!kb) return;
  // Whichever KB is being written to becomes "active" — Scout's focus.
  state.kb.activeId = kbId;
  const existing = kb.facts.findIndex(f => f.label === label);
  if (existing >= 0) kb.facts[existing] = { label, value };
  else kb.facts.push({ label, value });
  renderKB();
}


function renderDashboard() {
  const dash = $('#dash');
  dash.innerHTML = '';

  const isBrand = state.accountType === 'brand';
  const firstName = (state.user.name || 'there').split(/\s+/)[0];

  // ───── Welcome strip ──────────────────────────────────────────────────
  const heroTitle = state.publishedPost
    ? `Your first post is live, ${firstName}.`
    : `Welcome back, ${firstName}.`;
  const heroSub = isBrand
    ? "Scout's tracking 3 trends and a peak window in your niche right now. Pick what's next."
    : "Scout's tracked 3 conversations and your peak window today. Pick what's next.";
  dash.appendChild(el('div', { class: 'dash__welcome' }, [
    el('h1', { class: 'dash__welcome-title' }, heroTitle),
    el('p',  { class: 'dash__welcome-sub' }, heroSub),
  ]));

  // ───── Two Scout-powered CTAs ─────────────────────────────────────────
  dash.appendChild(el('div', { class: 'dash__ctas' }, [
    buildPostCTA(isBrand),
    buildCampaignCTA(isBrand),
  ]));

  // ───── Scout's pulse ──────────────────────────────────────────────────
  dash.appendChild(el('div', { class: 'dash__pulse' }, [
    el('div', { class: 'dash__pulse-head' }, [
      el('span', { class: 'dash__pulse-mark', html: icon('i-logo') }),
      el('h3', { class: 'dash__pulse-title' }, "Scout's pulse"),
      el('span', { class: 'dash__pulse-status' }, [
        el('span', { class: 'dash__pulse-dot' }),
        document.createTextNode('Live'),
      ]),
    ]),
    el('div', { class: 'dash__pulse-grid' }, [
      buildPulseTrend(isBrand),
      buildPulseWindow(isBrand),
      buildPulseSetup(),
    ]),
  ]));
}

function buildPostCTA(isBrand) {
  const samples = isBrand ? [
    { handle: '@rasa', body: "Heritage isn't an aesthetic. It's a postcode and a person who can name the stitch." },
    { handle: '@rasa', body: "Bibi taught us mirror work in Hyderabad. 31 years, hands faster than my notes." },
    { handle: '@rasa', body: "Workshop reels outperform studio reels 1.8× for us. Tells you what your audience wants." },
  ] : [
    { handle: '@aqamar', body: "Most design system posts skip the part that matters: adoption. Token tables are easy." },
    { handle: '@aqamar', body: "First time I shipped a system, optimized the wrong thing for six months. Lesson logged." },
    { handle: '@aqamar', body: "AI replacing designers is a take from people who don't ship. The real question is which 30%." },
  ];

  const stack = el('div', { class: 'cta-card__stack' },
    samples.map((s, i) => el('div', { class: `cta-card__post cta-card__post--${i + 1}` }, [
      el('div', { class: 'cta-card__post-head' }, [
        el('span', { class: 'cta-card__post-avatar' }),
        el('span', { class: 'cta-card__post-handle' }, s.handle),
      ]),
      el('div', { class: 'cta-card__post-body' }, s.body),
    ])),
  );

  return el('button', {
    class: 'cta-card cta-card--post',
    type: 'button',
    onclick: () => { /* hook for post-creation flow */ },
  }, [
    el('div', { class: 'cta-card__pill' }, [
      el('span', { class: 'cta-card__pill-mark', html: icon('i-logo') }),
      document.createTextNode('Scout · drafts in your voice'),
    ]),
    el('h2', { class: 'cta-card__title' }, 'Craft your next post'),
    el('p', { class: 'cta-card__sub' },
      'Scout writes in your tone, on the trends that matter. You edit, you ship.',
    ),
    stack,
    el('span', { class: 'cta-card__action' }, [
      document.createTextNode('Create post'),
      el('span', { class: 'cta-card__action-arrow', html: icon('i-arrow-right') }),
    ]),
  ]);
}

function buildCampaignCTA(isBrand) {
  const rows = isBrand ? [
    { icon: 'i-trend',  label: 'Goals',     value: 'Audience growth · Sales' },
    { icon: 'i-people', label: 'Audience',  value: 'Women 22 to 34 · Pakistan' },
    { icon: 'i-cal',    label: 'Duration',  value: '12 days · Heritage Week' },
    { icon: 'i-chat',   label: 'Posts',     value: '9 scheduled · 3 angles' },
  ] : [
    { icon: 'i-trend',  label: 'Goals',     value: 'Thought leadership · Leads' },
    { icon: 'i-people', label: 'Audience',  value: 'Designers & PMs · 25 to 40' },
    { icon: 'i-cal',    label: 'Duration',  value: '14 days · Office hours' },
    { icon: 'i-chat',   label: 'Posts',     value: '6 scheduled · 2 angles' },
  ];

  const brief = el('div', { class: 'cta-card__brief' }, [
    el('div', { class: 'cta-card__brief-head' }, [
      el('span', { class: 'cta-card__brief-tag' }, 'Campaign brief'),
      el('span', { class: 'cta-card__brief-status' }, 'Draft'),
    ]),
    ...rows.map(r => el('div', { class: 'cta-card__brief-row' }, [
      el('span', { class: 'cta-card__brief-icon', html: icon(r.icon) }),
      el('span', { class: 'cta-card__brief-label' }, r.label),
      el('span', { class: 'cta-card__brief-value' }, r.value),
    ])),
  ]);

  return el('button', { class: 'cta-card cta-card--campaign', type: 'button' }, [
    el('div', { class: 'cta-card__pill' }, [
      el('span', { class: 'cta-card__pill-mark', html: icon('i-logo') }),
      document.createTextNode('Scout · multi post planning'),
    ]),
    el('h2', { class: 'cta-card__title' }, 'Run a campaign'),
    el('p', { class: 'cta-card__sub' },
      'Goals, audience, schedule, posts. Scout assembles the brief, you approve.',
    ),
    brief,
    el('span', { class: 'cta-card__action' }, [
      document.createTextNode('Start campaign'),
      el('span', { class: 'cta-card__action-arrow', html: icon('i-arrow-right') }),
    ]),
  ]);
}

function buildPulseTrend(isBrand) {
  const data = isBrand
    ? { tag: '#SouthAsianHeritageWeek', delta: '4.2× w/w', detail: 'matches your themes' }
    : { tag: 'AI tooling debate',        delta: '5.6× saves', detail: 'on nuanced takes' };
  return el('div', { class: 'pulse pulse--trend' }, [
    el('div', { class: 'pulse__label' }, 'Top trend'),
    el('div', { class: 'pulse__value' }, data.tag),
    el('div', { class: 'pulse__detail' }, [
      el('span', { class: 'pulse__delta' }, data.delta),
      document.createTextNode(' · ' + data.detail),
    ]),
  ]);
}

function buildPulseWindow(isBrand) {
  const data = isBrand
    ? { window: '2 to 4pm PKT', detail: 'In 3 hours · weekday peak' }
    : { window: '9 to 11am PKT', detail: 'Tomorrow morning · global window' };
  return el('div', { class: 'pulse pulse--window' }, [
    el('div', { class: 'pulse__label' }, 'Peak window'),
    el('div', { class: 'pulse__value' }, data.window),
    el('div', { class: 'pulse__detail' }, data.detail),
  ]);
}

function buildPulseSetup() {
  // Total setup tasks. The demo path completes all of them; skips lower this.
  const total = state.accountType === 'brand' ? 4 : 3;
  const skipped = state.skipped.size;
  const done = Math.max(0, total - skipped);
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return el('div', { class: 'pulse pulse--setup' + (allDone ? ' pulse--setup-complete' : '') }, [
    el('div', { class: 'pulse__label' }, 'Setup'),
    el('div', { class: 'pulse__value' }, allDone ? 'Complete' : `${done} of ${total} done`),
    el('div', { class: 'pulse__bar', 'aria-valuenow': String(pct), role: 'progressbar' }, [
      el('div', { class: 'pulse__bar-fill', style: `width: ${pct}%` }),
    ]),
    el('div', { class: 'pulse__detail' },
      allDone ? 'Knowledge, voice, and tracking locked in.' : 'Finish to sharpen Scout.',
    ),
  ]);
}

/* =========================================================================
   14. STEP FUNCTIONS, the conversation graph
   Each step is an async function that updates state and returns when complete.
   ========================================================================= */

async function step1_opening() {
  // Hero owns the only human touch point at this stage: profile type.
  // openingHero() blocks until the user picks Individual or Brand and writes
  // state.accountType.
  await openingHero();

  const persona = state.accountType === 'brand' ? DEMO_BRAND : DEMO_INDIVIDUAL;
  state.brand = { ...persona };
  state.audience = persona.audienceDefault;
  state.tone = persona.tone;
  state.competitors = persona.competitorsDefault;

  // KB depends on accountType (brands track product/niche, individuals track
  // topics/expertise). Render only now that the persona is known.
  renderKB();

  // Scout greets the user warmly — the conversation begins immediately after
  // the profile pick. No first-post hook here; that framing came on splash 3.
  const greeting = state.accountType === 'brand'
    ? "Perfect. I'll learn your brand the way you'd describe it to a friend — your voice, your audience, what's already landing. Five minutes, max."
    : `Perfect, ${state.user.name}. I'll learn how you think and write — your voice, your audience, what's already landing. Five minutes, max.`;
  await scoutMsg(greeting, { typingFor: 900, beat: 400 });
}

async function step3_product_lines_brand_only() {
  if (state.accountType !== 'brand') return;
  await scoutMsg(
    "One important question. Does rasa have distinct product lines that should speak to different audiences? " +
    "An embroidery line for special occasions might need a different voice than an everyday line.",
    { typingFor: 1100, beat: 400 }
  );
  const answer = await quickReplies(
    ['Yes, multiple lines', 'No, one brand voice', 'Not sure'],
    { primaryIndex: 0 }
  );

  if (answer.startsWith('Not sure')) {
    await scoutMsg(
      "Quick clarifier, do you sell more than one type of product, or do all your products target the same kind of customer?",
      { typingFor: 900, beat: 400 }
    );
    const sub = await quickReplies(['Different customer types', 'Same customer'], { primaryIndex: 0 });
    if (sub.startsWith('Same')) {
      state.skipped.add('product-lines');
      await scoutMsg("Got it, one master voice. Cleaner that way.", { typingFor: 600 });
      return;
    }
    // else fall through to "Yes" handling
  }

  if (answer.startsWith('No')) {
    state.skipped.add('product-lines');
    await scoutMsg("Got it, one master voice. I'll keep it cohesive.", { typingFor: 600, beat: 400 });
    return;
  }

  await scoutMsg(
    "Tell me about each line, what it is, who it's for, and what makes it different. " +
    "I'll create separate contexts so I can tailor content per line.",
    { typingFor: 1000, beat: 400 }
  );

  // Demo: stage a scripted reply listing the lines
  await sleep(700);
  userMsg(
    "Three lines: Heritage Capsule (occasion wear, women 28 to 40, formal heritage), " +
    "Everyday Edit (modern kurtas and tops, women 22 to 34, casual), " +
    "Atelier (limited run statement pieces, collectors and gift buyers, premium)."
  );

  state.productLines = [
    { name: 'Heritage Capsule', audience: 'Women 28 to 40, occasion led', tone: 'Reverent, refined' },
    { name: 'Everyday Edit',    audience: 'Women 22 to 34, daily wear',   tone: 'Casual, witty' },
    { name: 'Atelier',          audience: 'Collectors, gift buyers',   tone: 'Considered, premium' },
  ];

  await narratedProcess('Building your product line contexts', [
    { icon: 'i-grid',    text: 'Creating Heritage Capsule context. Separate audience, tone variant.' },
    { icon: 'i-grid',    text: 'Creating Everyday Edit context. Inherits master voice with a casual lift.' },
    { icon: 'i-grid',    text: 'Creating Atelier context. Premium register, lower posting frequency.' },
    { icon: 'i-link',    text: 'Wiring each line to the master brand identity.' },
  ], { lineBeat: 900 });

  await scoutMsg("Here's how the structure looks, edit if anything's off.", { typingFor: 600, beat: 400 });
  await productLineTreeCard(state.productLines);

  // Each product line becomes a fact in the Product KB
  state.productLines.forEach(l => addKBFact('brand', l.name, `${l.audience} · ${l.tone}`));
  refreshBrandDrawer();
}

async function step4_goals() {
  // Goals as frame-setter — runs before any account scan so Scout reads
  // everything that follows through the lens of what the user is trying to
  // achieve. Short copy, no upfront KPI dump (that surfaces later when it's
  // useful).
  await scoutMsg(
    "Before I dig in, what are you trying to achieve on X? Pick up to 3, the ones that matter most.",
    { typingFor: 900, beat: 300 }
  );
  state.goals = await selectionChips([
    'Grow audience', 'Drive traffic to site', 'Build thought leadership',
    'Boost sales', 'Increase brand awareness', 'Generate leads',
  ], { maxSelections: 3 });

  const headline = state.goals.slice(0, 2).join(' and ') + (state.goals.length > 2 ? ' (and more)' : '');
  await scoutMsg(
    `Got it, ${headline}. Here's how I'll measure that:`,
    { typingFor: 800, beat: 300 }
  );

  const kpiMap = {
    'Grow audience':            'Follower growth rate · profile visits from posts',
    'Drive traffic to site':    'Outbound link CTR · referral sessions from X',
    'Build thought leadership': 'Bookmark rate · reply quality · saves to likes ratio',
    'Boost sales':              'Link in bio clicks · post to conversion path',
    'Increase brand awareness': 'Impressions · reach lift · share of voice in niche',
    'Generate leads':           'Reply to DM rate · profile to form conversions',
  };
  renderKpiCard(state.goals, kpiMap);

  await scoutMsg(
    "These become the targets I'll optimize your content around.",
    { typingFor: 700, beat: 400 }
  );
  addKBFact('brand', 'Goals', state.goals.join(', '));
  addKBFact('brand', 'KPIs', state.goals.map(g => kpiMap[g] ? kpiMap[g].split(' · ')[0] : 'Engagement quality').join(', '));
  refreshBrandDrawer();
}

function renderKpiCard(goals, kpiMap) {
  const rows = goals.map(g => {
    const kpi = (kpiMap[g] || 'Engagement quality').split(' · ');
    return el('div', { class: 'kpi-row' }, [
      el('span', { class: 'kpi-row__icon', html: icon('i-trend') }),
      el('span', { class: 'kpi-row__goal' }, g),
      el('span', { class: 'kpi-row__arrow' }, '→'),
      el('span', { class: 'kpi-row__kpi' }, [
        el('strong', { class: 'kw' }, kpi[0]),
        kpi.length > 1 ? document.createTextNode(' · ' + kpi.slice(1).join(' · ')) : null,
      ]),
    ]);
  });
  const card = el('div', { class: 'kpi-card' }, [
    el('div', { class: 'kpi-card__head' }, [
      document.createTextNode('How I will measure that'),
    ]),
    el('div', { class: 'kpi-card__rows' }, rows),
  ]);
  append(card);
}

async function step5_x_connect() {
  await scoutMsg(
    "First step, connect the account where you publish. I'll read what's working and build from there.",
    { typingFor: 1100, beat: 500 }
  );
  const { result, card } = await connectSocial();

  if (result === 'skip') {
    state.skipped.add('x-connect');
    await scoutMsg(
      "No problem. Without account data the best way to get me up to speed is for you to share what you've got. The chat below takes website links, brand docs, or just a description in your own words.",
      { typingFor: 1300, beat: 500 }
    );
    return 'skipped-entirely';
  }

  // OAuth simulation. The connect card stays visible behind the modal so the
  // user keeps context. The X row marks as "Connecting…" while modal is open,
  // then flips to "Connected" after authorization.
  if (card) markConnectXState(card, 'connecting');
  await fakeOAuthModal();
  if (card) markConnectXState(card, 'connected');
  userMsg('Authorized X');

  await scoutMsg(
    "Connected. Thanks. Let me read what's there.",
    { typingFor: 700, beat: 400 }
  );
  // After Scout's ack, retire the widget gracefully.
  if (card) {
    card.classList.add('connect--retiring');
    setTimeout(() => card.remove(), 400);
  }
  return 'connected-scan';
}

// Reflect connection progress on the visible X platform row inside the
// connect widget. Keeps the user oriented while the OAuth modal is open.
function markConnectXState(card, stateName) {
  const xRow = card.querySelector('.platform--x');
  if (!xRow) return;
  const cta = xRow.querySelector('.platform__cta');
  if (!cta) return;
  if (stateName === 'connecting') {
    xRow.classList.add('platform--connecting');
    cta.textContent = 'Connecting…';
  } else if (stateName === 'connected') {
    xRow.classList.remove('platform--connecting');
    xRow.classList.add('platform--connected');
    cta.textContent = 'Connected';
  }
}

function fakeOAuthModal() {
  return new Promise((resolve) => {
    const dialog = el('div', { class: 'oauth-dialog' }, [
      el('div', { class: 'oauth-dialog__head' }, [
        el('span', { class: 'oauth-dialog__x', html: icon('i-x-logo') }),
        document.createTextNode('Authorize Flagstaff Social'),
      ]),
      el('div', { class: 'oauth-dialog__body' }, [
        el('div', { class: 'oauth-dialog__app' }, [
          el('strong', {}, 'Flagstaff Social'),
          ' wants to access your X account.',
        ]),
        el('ul', { class: 'oauth-dialog__perms' }, [
          el('li', {}, 'Read your profile and posts'),
          el('li', {}, 'See accounts you follow'),
          el('li', {}, 'View engagement on your posts'),
        ]),
        el('div', { class: 'oauth-dialog__note' }, 'Read-only. Flagstaff cannot post without your approval.'),
      ]),
      el('div', { class: 'oauth-dialog__actions' }, [
        el('button', { class: 'btn-ghost' }, 'Cancel'),
        el('button', { class: 'btn-x oauth-dialog__authorize' }, 'Authorize app'),
      ]),
    ]);
    const backdrop = el('div', { class: 'oauth-backdrop' }, [dialog]);
    document.body.appendChild(backdrop);
    dialog.querySelector('.oauth-dialog__authorize').addEventListener('click', async () => {
      backdrop.classList.add('oauth-backdrop--exiting');
      await sleep(220);
      backdrop.remove();
      resolve();
    });
  });
}

async function step6_profile_scan() {
  // Choose between established and new variants
  const isNew = state.xAccountMaturity === 'new';

  if (isNew) {
    await narratedProcess('Studying your X profile', [
      { icon: 'i-search',   text: 'Pulling profile data' },
      { icon: 'i-sparkle',  text: 'Fresh account, no post history to analyze yet.' },
      { icon: 'i-search',   text: 'Looking at your interests and the accounts you follow.' },
      { icon: 'i-people',   text: "You're following accounts in heritage fashion and the South Asian creator space, that confirms your positioning." },
      { icon: 'i-tag',      text: 'X interest tags: Fashion · Heritage · Sustainability.' },
      { icon: 'i-bookmark', text: "Bookmark patterns on others' posts hint that your audience values context, not just product." },
    ]);
    await scoutMsg(
      "Your account is fresh, so I don't have engagement data yet. I'll lean on your brand context, niche trends, and the signals around your account until we build your own performance history. Honestly, that means we get to set the strategy from scratch. No bad habits to unlearn.",
      { typingFor: 1300, beat: 400 }
    );
    xProfilePreviewEmpty(state.brand);
  } else {
    await narratedProcess('Studying your X profile', [
      { icon: 'i-search',   text: 'Pulling profile data and the last 50 posts.' },
      { icon: 'i-people',   text: `${state.brand.followers} followers. Solid foundation, room to compound.` },
      { icon: 'i-quote',    text: `Bio reads "${state.accountType === 'brand' ? 'heritage, restitched' : 'designer · systems · craft'}". Clean positioning.` },
      { icon: 'i-trend',    text: state.accountType === 'brand'
        ? 'Posts about heritage origin stories outperform product posts by 3.1×.'
        : 'Posts with concrete examples outperform abstract takes by 2.4×.' },
      { icon: 'i-clock',    text: state.accountType === 'brand'
        ? 'Your audience is most active 2 to 4pm Pakistan time.'
        : 'Your audience is most active 9 to 11am PKT and 8 to 10pm PKT.' },
      { icon: 'i-bookmark', text: 'Bookmarks are your strongest signal. People are saving, not just liking.' },
      { icon: 'i-people',   text: state.accountType === 'brand'
        ? 'Following list confirms positioning in the South Asian fashion creator ecosystem.'
        : 'Following list confirms positioning in the design craft community.' },
    ]);
    await scoutMsg("Got a clear picture. Here's what stands out:", { typingFor: 600, beat: 400 });
    xProfilePreview(buildProfileSummary());
  }
  // Seed Main KB with what we just learned from the scan
  addKBFact('brand', 'Handle',     state.brand.handle);
  addKBFact('brand', 'Followers',  state.brand.followers);
  if (!isNew) {
    addKBFact('brand', 'Best format', state.accountType === 'brand' ? 'Image threads' : 'Threads with screenshots');
    addKBFact('brand', 'Peak activity', state.accountType === 'brand' ? '2 to 4pm PKT' : '9 to 11am PKT');
  }
  scrollDown();
  await sleep(1200);
}

function buildProfileSummary() {
  // Forward the full demo persona to the preview card. The card knows how to
  // render every field; we simply pass through the data Scout extracted.
  const p = state.brand;
  return {
    displayName: p.displayName || p.name,
    name:        p.name,
    handle:      p.handle,
    bio:         p.bio,
    location:    p.location,
    verified:    p.verified,
    followers:   p.followers,
    following:   p.following,
    postCount:   p.postCount,
    joinDate:    p.joinDate,
    industry:    p.industry || p.niche,
    topTopics:   p.topTopics || [],
    primaryAudience:   p.primaryAudience,
    secondaryAudience: p.secondaryAudience,
    peakActivity:      p.peakActivity,
  };
}

// First drawer open: review what Scout learned from the profile scan + materials.
// Drawer opens, fills sections with writing animation, reveals Accept, waits for
// the user, then closes. Identity/Themes/Products/Top topics/Audience(primary)/
// Peak activity are visible. Tone, goals, refined audience appear in the second
// open later.
async function step_brand_review_first() {
  const isBrand = state.accountType === 'brand';
  await scoutMsg(
    isBrand
      ? "Here's what I've pulled together about your brand. Take a look on the right and accept when it reads right."
      : "Here's what I've pulled together about you. Take a look on the right and accept when it reads right.",
    { typingFor: 1300, beat: 400 }
  );
  openBrandDrawer();
  await refreshBrandDrawer();

  addKBFact('brand', 'Niche', state.brand.niche);
  addKBFact('brand', 'Themes', state.brand.themes.join(', '));
  if (isBrand) addKBFact('brand', 'Products', state.brand.products.join(', '));

  revealBrandDrawerAccept();
  await new Promise((resolve) => { drawerState.acceptResolver = resolve; });
  userMsg('Accept');
  closeBrandDrawer();
}

// ------------------------ Brand / About-you drawer ------------------------
// A right-side panel that lives from the moment Scout starts learning until
// the user explicitly accepts it. Every state mutation (audience, tone,
// goals, product lines) refreshes the drawer; the user can pencil any field.
const drawerState = {
  node: null,
  tab: null,
  acceptResolver: null,
  rendered: new Set(),
  writeQueue: Promise.resolve(),
  minimized: false,
};

function openBrandDrawer() {
  if (drawerState.node) return;
  // Each open is a fresh render — clear which sections have been written.
  drawerState.rendered = new Set();
  const isBrand = state.accountType === 'brand';
  const drawer = el('aside', { class: 'brand-drawer', 'aria-label': isBrand ? 'About your brand' : 'About you' }, [
    el('button', {
      class: 'brand-drawer__minimize',
      'aria-label': 'Minimize',
      onclick: () => setBrandDrawerMinimized(true),
      html: icon('i-collapse'),
    }),
    el('div', { class: 'brand-drawer__head' }, [
      el('h2', { class: 'brand-drawer__title' }, isBrand ? 'About your brand' : 'About you'),
      el('p', { class: 'brand-drawer__sub' }, 'Scout is filling this as she learns.'),
    ]),
    el('div', { class: 'brand-drawer__body' }),
    el('div', { class: 'brand-drawer__foot' }, [
      el('div', { class: 'brand-drawer__foot-actions' }, [
        el('button', {
          class: 'btn-ghost brand-drawer__not-quite',
          type: 'button',
          onclick: () => enterNotQuiteMode(),
        }, 'Not quite'),
        el('button', {
          class: 'btn-primary brand-drawer__accept',
          type: 'button',
          onclick: () => {
            if (drawerState.acceptResolver) {
              const r = drawerState.acceptResolver;
              drawerState.acceptResolver = null;
              closeBrandDrawer();
              r('accept');
            }
          },
        }, 'Accept'),
      ]),
    ]),
  ]);
  // Re-open pill, shown while minimized.
  const tab = el('button', {
    class: 'brand-drawer-tab',
    'aria-label': 'Open ' + (isBrand ? 'brand profile' : 'profile'),
    onclick: () => setBrandDrawerMinimized(false),
  }, [
    el('span', { class: 'brand-drawer-tab__icon', html: icon('i-arrow-right') }),
    el('span', { class: 'brand-drawer-tab__label' }, isBrand ? 'About your brand' : 'About you'),
  ]);
  const backdrop = el('div', { class: 'brand-drawer-backdrop' });
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);
  document.body.appendChild(tab);
  drawerState.node = drawer;
  drawerState.tab = tab;
  drawerState.backdrop = backdrop;
  drawerState.rendered = new Set();
  drawerState.writeQueue = Promise.resolve();
  drawerState.minimized = false;
  requestAnimationFrame(() => {
    drawer.classList.add('brand-drawer--open');
    backdrop.classList.add('brand-drawer-backdrop--open');
  });
}

function setBrandDrawerMinimized(min) {
  if (!drawerState.node) return;
  drawerState.minimized = min;
  drawerState.node.classList.toggle('brand-drawer--minimized', min);
  drawerState.tab?.classList.toggle('brand-drawer-tab--visible', min);
}

function closeBrandDrawer() {
  if (!drawerState.node) return;
  drawerState.node.classList.remove('brand-drawer--open');
  drawerState.tab?.classList.remove('brand-drawer-tab--visible');
  drawerState.backdrop?.classList.remove('brand-drawer-backdrop--open');
  setTimeout(() => {
    drawerState.node?.remove();
    drawerState.tab?.remove();
    drawerState.backdrop?.remove();
    drawerState.node = null;
    drawerState.tab = null;
    drawerState.backdrop = null;
    drawerState.rendered.clear();
  }, 480);
}

// Compute the ordered list of sections that should exist based on current state.
// Each section emits a unique id, an eyebrow label, and the DOM body (sans eyebrow).
function computeBrandDrawerSections() {
  const isBrand = state.accountType === 'brand';
  const out = [];

  if (state.brand && state.brand.name) {
    out.push({
      id: 'identity',
      eyebrow: 'Identity',
      writeText: state.brand.name,
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__name', 'data-write': '1' }),
        el('div', { class: 'brand-drawer__sub-line' }, [
          state.brand.niche || '',
          state.brand.location ? ' · ' + state.brand.location : '',
        ].join('')),
        state.brand.positioning ? el('p', { class: 'brand-drawer__positioning' }, state.brand.positioning) : null,
      ].filter(Boolean)),
    });
  }
  if (state.brand && state.brand.themes && state.brand.themes.length) {
    out.push({
      id: 'themes',
      eyebrow: 'Themes',
      build: () => el('div', { class: 'brand-drawer__pills' },
        state.brand.themes.map(t => el('span', { class: 'brand-drawer__pill' }, t))
      ),
    });
  }
  if (isBrand && state.brand && state.brand.products && state.brand.products.length) {
    out.push({
      id: 'products',
      eyebrow: 'Products',
      build: () => el('ul', { class: 'brand-drawer__list' },
        state.brand.products.map(p => el('li', {}, p))
      ),
    });
  }
  if (!isBrand && state.topics && state.topics.length) {
    out.push({
      id: 'topics',
      eyebrow: 'Topics',
      build: () => el('div', { class: 'brand-drawer__pills' },
        state.topics.map(t => el('span', { class: 'brand-drawer__pill' }, t))
      ),
    });
  }
  if (isBrand && state.productLines && state.productLines.length) {
    out.push({
      id: 'product-lines',
      eyebrow: 'Product lines',
      build: () => el('div', { class: 'brand-drawer__lines' },
        state.productLines.map(line => el('div', { class: 'brand-drawer__line' }, [
          el('div', { class: 'brand-drawer__line-name' }, line.name),
          el('div', { class: 'brand-drawer__line-meta' }, `${line.audience} · ${line.tone}`),
        ]))
      ),
    });
  }
  // Top performing topics — moved here from xProfileStats so the drawer is
  // the single surface for Scout's profile read.
  if (state.brand && state.brand.topTopics && state.brand.topTopics.length) {
    out.push({
      id: 'top-topics',
      eyebrow: 'Top performing topics',
      build: () => el('div', { class: 'brand-drawer__topic-bars' },
        state.brand.topTopics.map(t => el('div', { class: 'brand-drawer__topic-bar' }, [
          el('div', { class: 'brand-drawer__topic-row' }, [
            el('span', { class: 'brand-drawer__topic-name' }, t.name),
            el('span', { class: 'brand-drawer__topic-pct' }, `+${t.engagement}%`),
          ]),
          el('div', { class: 'brand-drawer__topic-track' }, [
            el('div', {
              class: 'brand-drawer__topic-fill',
              style: `width: ${Math.min(100, t.engagement)}%;`,
            }),
          ]),
        ]))
      ),
    });
  }
  // Audience: primary block uses avatar cluster + persona-default. Once the
  // user validates a custom audience via audience_infer, surface that string
  // as a narrated overwrite.
  if (state.brand && (state.brand.primaryAudience || state.audience)) {
    out.push({
      id: 'audience',
      eyebrow: 'Audience',
      writeText: state.audience || state.brand.primaryAudience,
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__audience-row' }, [
          el('div', { class: 'brand-drawer__avatar-cluster' }, [
            el('span', { class: 'brand-drawer__avatar' }),
            el('span', { class: 'brand-drawer__avatar' }),
            el('span', { class: 'brand-drawer__avatar' }),
          ]),
          el('p', { class: 'brand-drawer__audience', 'data-write': '1' }),
        ]),
        state.brand?.secondaryAudience ? el('div', { class: 'brand-drawer__secondary' }, state.brand.secondaryAudience) : null,
      ].filter(Boolean)),
    });
  }
  // Tone only surfaces after the user has explicitly picked one (toneSample set).
  if (state.toneSample) {
    out.push({
      id: 'tone',
      eyebrow: 'Tone',
      writeText: state.tone,
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__primary', 'data-write': '1' }),
        el('p', { class: 'brand-drawer__sample' }, state.toneSample),
      ]),
    });
  }
  // Peak activity — moved here from xProfileStats.
  if (state.brand && state.brand.peakActivity) {
    out.push({
      id: 'peak-activity',
      eyebrow: 'Peak activity',
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__peak-strip' }, [
          el('div', { class: 'brand-drawer__peak-track' }, [
            el('div', { class: 'brand-drawer__peak-highlight' }),
          ]),
          el('div', { class: 'brand-drawer__peak-labels' }, [
            el('span', {}, '12a'), el('span', {}, '6a'), el('span', {}, '12p'), el('span', {}, '6p'), el('span', {}, '12a'),
          ]),
        ]),
        el('div', { class: 'brand-drawer__peak-text' }, state.brand.peakActivity),
      ]),
    });
  }
  if (state.goals && state.goals.length) {
    out.push({
      id: 'goals',
      eyebrow: 'Goals',
      build: () => el('div', { class: 'brand-drawer__goals' },
        state.goals.map(g => el('div', { class: 'brand-drawer__goal' }, g))
      ),
    });
  }
  return out;
}

// Idempotent: only animates new sections. Each new section appends with a
// fade + write animation. Queued so concurrent calls don't interleave.
function refreshBrandDrawer() {
  if (!drawerState.node) return;
  const body = drawerState.node.querySelector('.brand-drawer__body');
  if (!body) return;
  drawerState.writeQueue = drawerState.writeQueue.then(async () => {
    const sections = computeBrandDrawerSections();
    for (const sec of sections) {
      if (drawerState.rendered.has(sec.id)) continue;
      drawerState.rendered.add(sec.id);
      await writeDrawerSection(body, sec);
    }
  }).catch((e) => console.error('brand drawer write error', e));
  return drawerState.writeQueue;
}

async function writeDrawerSection(body, sec) {
  // Build the section shell with an empty value container.
  const valueWrap = sec.build();
  const sectionEl = el('section', { class: 'brand-drawer__section', 'data-drawer-section': sec.id }, [
    el('div', { class: 'brand-drawer__eyebrow' }, sec.eyebrow),
    valueWrap,
  ]);
  body.appendChild(sectionEl);
  // Force a paint, then run the entry animation.
  requestAnimationFrame(() => sectionEl.classList.add('brand-drawer__section--in'));
  await sleep(260);

  // Find write targets (elements marked data-write) and stream the text into them.
  const writeTargets = sectionEl.querySelectorAll('[data-write="1"]');
  if (writeTargets.length && sec.writeText) {
    for (const target of writeTargets) {
      target.classList.add('brand-drawer__writing');
      await typewriterInto(target, sec.writeText, 18);
      target.classList.remove('brand-drawer__writing');
    }
  }
  // Brief settle pause before the next section starts.
  await sleep(220);
}

function revealBrandDrawerAccept() {
  if (!drawerState.node) return;
  drawerState.node.classList.add('brand-drawer--awaiting');
  drawerState.node.classList.remove('brand-drawer--prompting');
}

// "Not quite" path: keep the drawer open and backdrop visible, swap the
// foot's Accept/Not quite buttons for a single-line prompt input. The user
// types feedback; on submit, Scout narrates a brief adjustment and the
// Accept/Not quite buttons return so the user can re-confirm.
function enterNotQuiteMode() {
  if (!drawerState.node) return;
  const foot = drawerState.node.querySelector('.brand-drawer__foot');
  if (!foot) return;
  // Mark state so other parts of the UI know we're in feedback mode.
  drawerState.node.classList.add('brand-drawer--prompting');

  // Replace foot contents with a prompt input.
  foot.innerHTML = '';
  const input = el('input', {
    type: 'text',
    class: 'brand-drawer__prompt-input',
    placeholder: 'Tell Scout what to change…',
    'aria-label': 'Tell Scout what to change',
  });
  const submit = el('button', {
    class: 'btn-primary brand-drawer__prompt-submit',
    type: 'button',
    'aria-label': 'Send',
    html: icon('i-arrow-right'),
  });
  const prompt = el('form', {
    class: 'brand-drawer__prompt',
    onsubmit: (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      handleNotQuiteSubmit(text);
    },
  }, [input, submit]);
  foot.appendChild(prompt);
  // Focus the input shortly after mount so the cursor is ready.
  requestAnimationFrame(() => input.focus());
}

async function handleNotQuiteSubmit(promptText) {
  if (!drawerState.node) return;
  const foot = drawerState.node.querySelector('.brand-drawer__foot');
  if (!foot) return;
  // Trade the prompt input for a short "Adjusting…" status while Scout
  // simulates a refresh.
  foot.innerHTML = '';
  foot.appendChild(
    el('div', { class: 'brand-drawer__prompt-status', 'aria-live': 'polite' }, [
      el('span', { class: 'brand-drawer__prompt-status-dot' }),
      document.createTextNode('Adjusting based on your note…'),
    ])
  );
  // Brief pause so the message reads.
  await sleep(1400);
  // Re-render the original Accept/Not quite foot row in place.
  foot.innerHTML = '';
  foot.appendChild(
    el('div', { class: 'brand-drawer__foot-actions' }, [
      el('button', {
        class: 'btn-ghost brand-drawer__not-quite',
        type: 'button',
        onclick: () => enterNotQuiteMode(),
      }, 'Not quite'),
      el('button', {
        class: 'btn-primary brand-drawer__accept',
        type: 'button',
        onclick: () => {
          if (drawerState.acceptResolver) {
            const r = drawerState.acceptResolver;
            drawerState.acceptResolver = null;
            closeBrandDrawer();
            r('accept');
          }
        },
      }, 'Accept'),
    ])
  );
  drawerState.node.classList.remove('brand-drawer--prompting');
}

// Audience is inferred, not asked. Scout proposes a specific audience based on
// brand + X profile + niche scan, with the reasoning that grounds it. User
// validates with a quick-reply.
async function step_audience_infer() {
  const xConnected = !state.skipped.has('x-connect');
  const isBrand = state.accountType === 'brand';

  const lead = xConnected
    ? "Based on everything, your brand, your X data, and what's working in your niche, here's who I'd target:"
    : "Based on your brand and what's working in your niche right now, here's who I'd target:";
  await scoutMsg(lead, { typingFor: 1100, beat: 300 });

  const proposal = state.brand.audienceDefault || state.audience;
  // Insight pulled from persona/data signals; persona-specific.
  const insight = isBrand
    ? 'They respond best to heritage explained posts paired with modern visuals. Saves run 3× the niche average on context rich posts versus pure product shots.'
    : 'They respond best to specific examples over abstract principles. Bookmark rate is 2.4× higher when posts name the tool, the task, and the tradeoff.';
  await scoutMsg(proposal, { typingFor: 1000, beat: 300 });
  await scoutMsg(insight, { typingFor: 1300, beat: 400 });

  const verdict = await quickReplies(
    ["That's right", 'Adjust audience', 'Different audience in mind'],
    { primaryIndex: 0 }
  );

  if (verdict.startsWith('Adjust') || verdict.startsWith('Different')) {
    const next = await inlineTextInput({
      placeholder: 'Who are you actually targeting?',
      submitLabel: 'Use this',
      initial: verdict.startsWith('Adjust') ? proposal : '',
    });
    state.audience = next || proposal;
    await scoutMsg("Updated. I'll work with that.", { typingFor: 600, beat: 300 });
  } else {
    state.audience = proposal;
    await scoutMsg("Good. That's the lens I'll write into.", { typingFor: 700, beat: 300 });
  }
  addKBFact('brand', 'Audience', state.audience);
  refreshBrandDrawer();
}

// Second drawer open: the final review just before Scout shifts to trends.
// Reopens the drawer with everything Scout has gathered, including new
// sections (tone, goals, validated audience). Same lifecycle as the first.
async function step_brand_review_final() {
  await scoutMsg(
    "Here's the complete picture on your right. Take a look, and accept when it reads right.",
    { typingFor: 1200, beat: 400 }
  );
  openBrandDrawer();
  await refreshBrandDrawer();
  revealBrandDrawerAccept();
  await new Promise((resolve) => { drawerState.acceptResolver = resolve; });
  userMsg('Accept');
  closeBrandDrawer();
}

// Tone/voice as its own beat: 3 editable cards, each a sample post in a
// different voice. User can rewrite the sample, then picks the one that
// sounds like them. Selected card sets state.tone (label) and state.toneSample
// (the chosen text).
async function step_tone_voice() {
  const directions = state.brand.toneDirections || [];
  if (!directions.length) return;

  const lead = state.accountType === 'brand'
    ? "Based on your brand and the trends I'm tracking, here are three tones that stood out — which one would you prefer?"
    : "Based on you and the trends I'm tracking, here are three tones that stood out — which one would you prefer?";
  await scoutMsg(lead, { typingFor: 1100, beat: 400 });

  await new Promise((resolve) => {
    const list = el('div', { class: 'tone-list' });
    let activeCard = null;
    let bubble = null;
    let commitTimer = null;

    const commit = (d) => {
      state.tone = d.label;
      state.brand.tone = d.label;
      state.toneSample = d.sample;
      addKBFact('brand', 'Tone', d.label);
      refreshBrandDrawer();
      Array.from(list.children).forEach(c => { c.style.pointerEvents = 'none'; });
      (async () => {
        await scoutMsg("Got it. Calibrating to that voice.", { typingFor: 700, beat: 400 });
        resolve();
      })();
    };

    directions.forEach((d) => {
      const card = el('button', { class: 'tone-card', type: 'button' }, [
        el('div', { class: 'tone-card__head' }, [
          el('span', { class: 'tone-card__pill' }, [
            el('span', { class: 'tone-card__pill-icon', html: icon(d.icon || 'i-sparkle') }),
            el('span', { class: 'tone-card__pill-label' }, d.label),
          ]),
        ]),
        el('p', { class: 'tone-card__text' }, d.sample),
        el('span', { class: 'tone-card__pick' }, [
          document.createTextNode('Pick this voice'),
          el('span', { class: 'tone-card__pick-arrow' }, '→'),
        ]),
      ]);

      card.addEventListener('click', () => {
        if (activeCard === card) return;
        activeCard = card;
        Array.from(list.children).forEach((c) => {
          c.classList.toggle('tone-card--active', c === card);
          c.classList.toggle('tone-card--dim', c !== card);
        });
        const label = `Picked: ${d.label}`;
        if (!bubble) bubble = userMsg(label);
        else {
          const t = bubble.querySelector('.msg__bubble');
          if (t) t.textContent = label;
        }
        if (commitTimer) clearTimeout(commitTimer);
        commitTimer = setTimeout(() => commit(d), 1500);
      });
      list.appendChild(card);
    });

    append(list);
  });
}

// Individual-only: capture topics/expertise as the parallel to a brand's
// product lines. Multi-select with custom add — same shape as goals.
async function step_topics_individual() {
  await scoutMsg(
    "Which topics do you actually want to talk about? Pick the ones you want me to track and draft for.",
    { typingFor: 900, beat: 300 }
  );
  const pool = (state.brand.topics && state.brand.topics.length)
    ? state.brand.topics
    : (DEMO_INDIVIDUAL.topics || []);
  state.topics = await selectionChips(pool, { allowCustom: true, customLabel: 'Add your own' });
  refreshBrandDrawer();
  await scoutMsg("Got it. I'll keep an eye on those.", { typingFor: 600, beat: 300 });
  addKBFact('brand', 'Topics', state.topics.join(', '));
}

// New: replaces the old action-tile picker. The composer is the universal
// text input. User can paste website link, upload docs, or describe in their
// own words. For the demo we auto-stage one URL paste so the presenter
// doesn't have to type for every prompt.
async function stepMaterials() {
  const xConnected = !state.skipped.has('x-connect');

  await scoutMsg(
    xConnected
      ? "Want to deepen this? Drop your website link or upload any brand docs in the chat. Or describe in your own words. Whatever you share, I'll learn from."
      : "To get me up to speed, share what you've got. Drop your website link, upload brand docs, or describe in your own words. Anything works.",
    { typingFor: 1300, beat: 500 }
  );

  // Demo: auto-stage a URL paste in the chat
  await sleep(900);
  userMsg(state.brand.websiteUrl);

  const lines = state.accountType === 'brand' ? [
    { icon: 'i-globe',   text: `Loading ${state.brand.websiteUrl}` },
    { icon: 'i-grid',    text: 'Three product categories live on the site. Sindhi embroidery, Kashmiri shawls, contemporary kurtas.' },
    { icon: 'i-quote',   text: 'Your About page tells a strong founder story. That is reusable content material.' },
    { icon: 'i-sparkle', text: 'Brand messaging emphasizes craftsmanship and ethical sourcing. Both differentiators in this niche.' },
    { icon: 'i-palette', text: 'Pulling color palette and tone of voice from the copy.' },
  ] : [
    { icon: 'i-globe',   text: `Loading ${state.brand.websiteUrl}` },
    { icon: 'i-quote',   text: 'Short bio plus an essays index. Most essays are about design systems and product craft.' },
    { icon: 'i-sparkle', text: 'Voice in the writing reads as direct, specific, non academic.' },
    { icon: 'i-link',    text: "I see an 'office hours' page. That is a strong CTA you could surface more." },
    { icon: 'i-palette', text: 'Pulling tone of voice signals from the essay openings.' },
  ];

  await narratedProcess('Scanning your site', lines);

  await scoutMsg("Anything else, or are we good with this?", { typingFor: 700, beat: 400 });
  await quickReplies(["That's everything", 'Add more later'], { primaryIndex: 0 });

  // Populate Main KB from the scan
  addKBFact('brand', 'Brand',       state.brand.name);
  addKBFact('brand', 'Positioning', state.brand.positioning);
  addKBFact('brand', 'Themes',      state.brand.themes.join(', '));
  if (state.accountType === 'brand') {
    addKBFact('brand', 'Products',  state.brand.products.join(', '));
  }
}

async function step7_intel_scan() {
  await scoutMsg(
    "Now let me scan what's happening in your niche right now, trends, competitor activity, audience patterns.",
    { typingFor: 1000, beat: 400 }
  );
  const lines = state.accountType === 'brand' ? [
    { icon: 'i-search', text: 'Searching South Asian heritage-fashion conversations on X.' },
    { icon: 'i-fire',   text: '#SouthAsianHeritageWeek is up 4.2× week-on-week.' },
    { icon: 'i-trend',  text: 'Competitor @generation.pk posted a craft-origin reel yesterday. 22k views in 18 hours.' },
    { icon: 'i-people', text: 'Detected 5 active competitors and 12 niche creators worth tracking.' },
    { icon: 'i-clock',  text: 'Peak engagement window for your niche: weekdays 1 to 4pm PKT.' },
    { icon: 'i-sparkle',text: 'Strong rising signal: heritage explainers paired with modern visuals.' },
  ] : [
    { icon: 'i-search', text: 'Searching design craft and product design conversations on X.' },
    { icon: 'i-fire',   text: 'AI-tooling debate is the dominant topic this week. High bookmark rate on nuanced takes.' },
    { icon: 'i-trend',  text: 'Competitor @brian_lovin shipped a craft essay. 9k engagements in 24 hours.' },
    { icon: 'i-people', text: 'Detected 4 competitors and 18 niche creators worth tracking.' },
    { icon: 'i-clock',  text: 'Peak engagement window for your niche: weekday mornings PKT (your audience is global).' },
    { icon: 'i-sparkle',text: 'Strong rising signal: specific examples beat abstract principles.' },
  ];
  await narratedProcess('Scanning the niche', lines);
  trendsPreview();

  // Populate Trend KB
  if (state.accountType === 'brand') {
    addKBFact('trending', 'Top trend',     '#SouthAsianHeritageWeek (4.2× w/w)');
    addKBFact('trending', 'Competitors',   '@generation.pk · @khaadiofficial · @sapphirepakistan');
    addKBFact('trending', 'Peak window',   'Weekdays 1 to 4pm PKT');
  } else {
    addKBFact('trending', 'Top trend',     'AI design tooling debate');
    addKBFact('trending', 'Competitors',   '@brian_lovin · @mds · @rauchg');
    addKBFact('trending', 'Peak window',   'Weekday mornings PKT');
  }
  await sleep(1400);
}

// Merged direction-picker: three full drafts, each grounded in a different
// trend angle and rendered with theme + tone + format chips + drafted body +
// a generated image. User picks one to edit and publish.
async function step_post_directions() {
  const groups = (state.brand.trendGroups || []).slice(0, 3);
  const iterMap = state.brand.postIterations || {};
  if (!groups.length) return;

  // Visual eyebrow that frames the entire first-post moment.
  append(el('div', { class: 'first-post-banner' }, [
    el('span', { class: 'first-post-banner__dot' }),
    document.createTextNode('Your first post'),
  ]));

  await scoutMsg(
    "I've drafted three directions for your first post. Each rides a different angle and bundles a tone, a format, and a visual. Pick the one that sounds like you.",
    { typingFor: 1300, beat: 400 }
  );

  // Cinematic narration — Scout drafts the post in the open.
  await narratedProcess('Drafting your first post', [
    { icon: 'i-quote',   text: 'Pulling from your voice and audience signals.' },
    { icon: 'i-trend',   text: 'Cross-checking the live trend window.' },
    { icon: 'i-image',   text: 'Generating a visual for each angle.' },
    { icon: 'i-sparkle', text: 'Stitching everything together.' },
  ], { lineBeat: 800 });

  // Build one direction per trend group, defaulting to its "Personal story"
  // iteration as the leading draft body.
  const directions = groups.map((g) => {
    const its = iterMap[g.id] || [];
    const lead = its[0] || { angle: 'Direction', body: g.summary || '' };
    return { group: g, body: lead.body, angle: lead.angle, iterationId: lead.id };
  });

  return new Promise((resolve) => {
    const list = el('div', { class: 'directions-list' });
    let activeCard = null;
    let bubble = null;
    let commitTimer = null;

    const commit = (d) => {
      state.selectedTrendGroupId = d.group.id;
      state.selectedIterationId = d.iterationId;
      state.draftPost = d.body;
      addKBFact('trending', 'Selected angle', d.group.theme);
      Array.from(list.children).forEach(c => { c.style.pointerEvents = 'none'; });
      list.classList.add('directions-list--chosen');
      laterRow.remove();
      resolve(d.iterationId);
    };

    const displayName = state.brand.displayName || state.brand.name || 'You';
    const handle      = state.brand.handle      || '@you';
    const isBrand     = state.accountType === 'brand';
    const avatarSrc   = isBrand ? '/ProfileBrand.jpeg' : '/Profile.png';

    directions.forEach((d, i) => {
      const card = el('div', {
        class: 'direction-card',
        onclick: () => {
          if (activeCard === card) return;
          activeCard = card;
          Array.from(list.children).forEach((c) => {
            c.classList.toggle('direction-card--active', c === card);
            c.classList.toggle('direction-card--dim', c !== card);
          });
          const label = `Picked: ${d.group.theme}`;
          if (!bubble) bubble = userMsg(label);
          else {
            const t = bubble.querySelector('.msg__bubble');
            if (t) t.textContent = label;
          }
          if (commitTimer) clearTimeout(commitTimer);
          commitTimer = setTimeout(() => commit(d), 1500);
        },
      }, [
        // Author row — avatar + name + verified + handle + dot + time.
        el('div', { class: 'direction-card__author' }, [
          el('span', { class: 'direction-card__avatar', style: `background-image: url('${avatarSrc}');` }),
          el('div', { class: 'direction-card__id' }, [
            el('div', { class: 'direction-card__name-row' }, [
              document.createTextNode(displayName),
              el('span', { class: 'direction-card__name-verified', html: icon('i-check') }),
              el('span', { class: 'direction-card__handle' }, handle),
              el('span', { class: 'direction-card__sep' }, '·'),
              el('span', { class: 'direction-card__time' }, 'now'),
            ]),
          ]),
        ]),
        // Body text.
        el('div', { class: 'direction-card__body' }, d.body),
        // Generated image preview.
        directionImage(d, i),
        // Tone/format chips.
        el('div', { class: 'direction-card__chips' }, [
          el('span', { class: 'direction-card__chip' }, d.group.tone),
          el('span', { class: 'direction-card__chip' }, d.group.format),
        ]),
        // X-style action row — reply, repost, like, views, bookmark, share.
        el('div', { class: 'direction-card__actions' }, [
          el('span', { class: 'direction-card__action' }, [
            el('span', { html: icon('i-reply') }),
            el('span', { class: 'direction-card__action-n' }, '12'),
          ]),
          el('span', { class: 'direction-card__action' }, [
            el('span', { html: icon('i-repost') }),
            el('span', { class: 'direction-card__action-n' }, '4'),
          ]),
          el('span', { class: 'direction-card__action' }, [
            el('span', { html: icon('i-heart') }),
            el('span', { class: 'direction-card__action-n' }, '87'),
          ]),
          el('span', { class: 'direction-card__action' }, [
            el('span', { html: icon('i-trend') }),
            el('span', { class: 'direction-card__action-n' }, '1.2K'),
          ]),
          el('span', { class: 'direction-card__action' }, [
            el('span', { html: icon('i-bookmark') }),
          ]),
          el('span', { class: 'direction-card__action' }, [
            el('span', { html: icon('i-share') }),
          ]),
        ]),
        el('span', { class: 'direction-card__pick' }, [
          document.createTextNode('Use this direction'),
          el('span', {}, '→'),
        ]),
      ]);
      list.appendChild(card);
    });

    const laterRow = el('div', { class: 'qreplies iteration-list__later' }, [
      el('button', {
        class: 'qreply',
        onclick: () => {
          if (commitTimer) clearTimeout(commitTimer);
          state.skipped.add('first-post');
          userMsg('Save these and decide later');
          Array.from(list.children).forEach(c => { c.style.pointerEvents = 'none'; c.classList.add('direction-card--dim'); });
          laterRow.remove();
          resolve('later');
        },
      }, 'Save these and decide later'),
    ]);

    append(list);
    append(laterRow);
  });
}

// Mock image generation — uses real post imagery for the demo. Each
// direction maps to a different post visual; the loading shimmer plays
// briefly so the card reads as "Scout just generated this." The image
// set differs by accountType (brand vs individual).
function directionImage(d, i) {
  const isBrand = state.accountType === 'brand';
  const visuals = isBrand
    ? [
        { src: '/PostA.jpeg', tint: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 60%, #b45309 100%)' },
        { src: '/PostB.jpeg', tint: 'linear-gradient(135deg, #c7d2fe 0%, #818cf8 60%, #4f46e5 100%)' },
        { src: '/PostC.jpeg', tint: 'linear-gradient(135deg, #bbf7d0 0%, #34d399 60%, #047857 100%)' },
      ]
    : [
        { src: '/IndividualPostA.jpeg', tint: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 60%, #b45309 100%)' },
        { src: '/IndividualPostB.jpeg', tint: 'linear-gradient(135deg, #c7d2fe 0%, #818cf8 60%, #4f46e5 100%)' },
        { src: '/IndividualPostC.jpeg', tint: 'linear-gradient(135deg, #bbf7d0 0%, #34d399 60%, #047857 100%)' },
      ];
  const v = visuals[i % visuals.length];
  const wrap = el('div', {
    class: 'direction-card__image direction-card__image--loading',
    style: `background-image: url('${v.src}'), ${v.tint}; background-size: cover; background-position: center;`,
  }, [
    el('div', { class: 'direction-card__image-shimmer' }),
  ]);
  // After a short delay, drop the loading shimmer.
  setTimeout(() => wrap.classList.remove('direction-card__image--loading'), 900 + i * 300);
  return wrap;
}

// Edit the chosen draft, then publish (simulated).
async function step_edit_publish() {
  await scoutMsg(
    "Edit anything you want. When it's right, hit Publish.",
    { typingFor: 800, beat: 400 }
  );

  await new Promise((resolve) => {
    const ta = el('textarea', { class: 'post-editor__textarea', rows: '6' }, state.draftPost);
    const counter = el('span', { class: 'post-editor__counter' }, String(state.draftPost.length) + ' / 280');

    const updateCounter = () => {
      const len = ta.value.length;
      counter.textContent = `${len} / 280`;
      counter.classList.toggle('post-editor__counter--warn', len > 260);
      counter.classList.toggle('post-editor__counter--over', len > 280);
    };

    const editor = el('div', { class: 'post-editor' }, [
      el('div', { class: 'post-editor__head' }, [
        el('span', { class: 'post-editor__head-icon', html: icon('i-pencil') }),
        document.createTextNode('Your first post'),
      ]),
      ta,
      el('div', { class: 'post-editor__foot' }, [
        counter,
        el('div', { class: 'post-editor__actions' }, [
          el('button', {
            class: 'btn-primary post-editor__publish',
            onclick: async () => {
              const body = ta.value.trim();
              if (!body) return;
              state.draftPost = body;
              state.publishedPost = { body, postedAt: Date.now() };
              editor.remove();
              userMsg('Publish');
              await narratedProcess('Publishing to X', [
                { icon: 'i-sparkle', text: 'Queueing to X publish endpoint.' },
                { icon: 'i-clock',   text: "Posting at the next peak window for your audience." },
                { icon: 'i-check',   text: 'Posted. Tracking will update on the dashboard.' },
              ], { lineBeat: 800 });
              renderPublishedPost(body);
              addKBFact('brand', 'First post', body.length > 80 ? body.slice(0, 77) + '…' : body);
              resolve();
            },
          }, [
            el('span', { class: 'post-editor__publish-label' }, 'Publish'),
            el('span', { html: icon('i-arrow-right') }),
          ]),
        ]),
      ]),
    ]);

    ta.addEventListener('input', updateCounter);
    append(editor);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); });
  });
}

function renderPublishedPost(body) {
  const isBrand = state.accountType === 'brand';
  const avatarSrc = isBrand ? '/ProfileBrand.jpeg' : '/Profile.png';
  const card = el('div', { class: 'success-post success-post--published' }, [
    el('div', { class: 'success-post__head' }, [
      el('div', { class: 'success-post__avatar', style: `background-image: url('${avatarSrc}');` }),
      el('div', { class: 'success-post__id' }, [
        el('div', { class: 'success-post__name-row' }, [
          el('span', { class: 'success-post__name' }, state.brand.displayName || state.brand.name),
          state.brand.verified ? el('span', { class: 'success-post__verified', html: icon('i-check') }) : null,
        ]),
        el('div', { class: 'success-post__handle' }, (state.brand.handle || '') + ' · Just now'),
      ]),
      el('span', { class: 'success-post__badge success-post__badge--live' }, [
        el('span', { class: 'success-post__badge-icon', html: icon('i-check') }),
        document.createTextNode('Live'),
      ]),
    ]),
    el('div', { class: 'success-post__body' }, body),
    el('div', { class: 'success-post__metrics' }, [
      successMetric('i-reply',    '0', 'replies'),
      successMetric('i-repost',   '0', 'reposts'),
      successMetric('i-heart',    '0', 'likes'),
      successMetric('i-bookmark', '0', 'bookmarks'),
    ]),
    el('div', { class: 'success-post__footer' }, "Tracking from here. I'll surface results on the dashboard."),
  ]);
  append(card);
}

// Profile score — return-loop hook. When someone sees the post and considers
// following, they visit the profile. 2-3 seconds to convert them. Specific,
// actionable items the user can fix later.
async function step_profile_score() {
  // Skip the scan if X wasn't connected — nothing to score.
  if (state.skipped.has('x-connect')) return;

  await scoutMsg(
    "One more thing. When someone sees your post and considers following, they visit your profile. It has about three seconds to convert them. Let me score it.",
    { typingFor: 1400, beat: 400 }
  );

  await narratedProcess('Scoring your profile', [
    { icon: 'i-search', text: 'Checking your bio.' },
    { icon: 'i-image',  text: 'Evaluating profile photo and banner.' },
    { icon: 'i-quote',  text: 'Looking at your pinned post.' },
    { icon: 'i-link',   text: 'Checking for a website link and CTA.' },
  ], { lineBeat: 700 });

  const isBrand = state.accountType === 'brand';
  const items = isBrand ? [
    { state: 'ok',   text: 'Profile photo reads clear and on brand.' },
    { state: 'ok',   text: 'Bio communicates niche in one line.' },
    { state: 'warn', text: 'No CTA in bio. Add a link to shop or newsletter.' },
    { state: 'bad',  text: 'No pinned post. Your strongest piece should sit at the top.' },
    { state: 'ok',   text: 'Website link present.' },
    { state: 'warn', text: 'Banner is generic. A heritage visual would carry your positioning.' },
  ] : [
    { state: 'ok',   text: 'Profile photo reads clear.' },
    { state: 'ok',   text: 'Bio names the role and the audience.' },
    { state: 'warn', text: 'No CTA in bio. Your office hours page deserves a line.' },
    { state: 'bad',  text: 'Pinned post is from four months ago. Swap in a recent essay.' },
    { state: 'ok',   text: 'Website link present.' },
    { state: 'warn', text: 'Banner is generic. A craft visual would carry your positioning.' },
  ];

  const pct = Math.round(items.filter(i => i.state === 'ok').length / items.length * 100);
  state.profileScore = pct;

  await new Promise((resolve) => {
    const card = el('div', { class: 'profile-score' }, [
      el('div', { class: 'profile-score__head' }, [
        el('div', { class: 'profile-score__head-left' }, [
          document.createTextNode('Profile score'),
        ]),
        el('span', { class: 'profile-score__pct' }, pct + '%'),
      ]),
      el('div', { class: 'profile-score__bar' }, [
        el('div', { class: 'profile-score__bar-fill', style: `width: ${pct}%;` }),
      ]),
      el('ul', { class: 'profile-score__list' },
        items.map(i => {
          const iconId = i.state === 'ok' ? 'i-check' : i.state === 'warn' ? 'i-warn' : 'i-x-mark';
          return el('li', { class: 'profile-score__item profile-score__item--' + i.state }, [
            el('span', { class: 'profile-score__item-icon', html: icon(iconId) }),
            el('span', { class: 'profile-score__item-text' }, i.text),
          ]);
        }),
      ),
      el('div', { class: 'conf__actions' }, [
        el('button', {
          class: 'btn-ghost',
          onclick: () => { card.remove(); userMsg("I'll fix these later"); resolve('later'); },
        }, "I'll fix these later"),
        el('button', {
          class: 'btn-primary',
          onclick: () => { card.remove(); userMsg('Show me how'); resolve('how'); },
        }, 'Show me how'),
      ]),
    ]);
    append(card);
  });

  await scoutMsg(
    "I'll keep these in your dashboard. Each one becomes a quick win when you have a few minutes.",
    { typingFor: 1000, beat: 400 }
  );
}

// "Building your infrastructure" — the theatrical payoff. Five lines, each
// representing real setup work, narrated with checkmarks. The KB widget is
// already populated; this is the moment Scout names what was built.
async function step_infrastructure_build() {
  await scoutMsg(
    "You've given me everything I need. Let me set up your marketing infrastructure.",
    { typingFor: 1100, beat: 400 }
  );

  await narratedProcess('Building your marketing infrastructure', [
    { icon: 'i-check', text: 'Brand knowledge base. Locked.' },
    { icon: 'i-check', text: "X algorithm rules and content guardrails. Loaded." },
    { icon: 'i-check', text: 'Trend monitoring for your niche. Active.' },
    { icon: 'i-check', text: 'Optimal posting windows for your audience. Calibrated.' },
    { icon: 'i-check', text: 'Content strategy. Configured.' },
  ], { lineBeat: 900 });
}

async function step13_handoff() {
  const lead = state.publishedPost
    ? `Everything's ready, ${state.user.name}. Your first post is live. The dashboard tracks it from here, alongside drafts, trends, and what's working.`
    : `Everything's ready, ${state.user.name}. The dashboard is where you'll work from here. Take your time, look around, or jump straight in.`;
  await scoutMsg(lead, { typingFor: 1200, beat: 700 });
  await sleep(1100);
  enterApp();
}

function enterApp() {
  // Onboarding's "Go to dashboard" step lands the user on the new panelized
  // Home dashboard (which shares its visual language with Campaigns).
  goToHome();
}

/* =========================================================================
   15. CONVERSATION ROUTER
   ========================================================================= */
async function runConversation() {
  if (stream.dataset.started === '1') return;
  stream.dataset.started = '1';

  // Act 1 — Greet and connect.
  await step1_opening();                                      // hero + strategist intro

  const xPath = await step5_x_connect();                      // connect → OAuth (or skip)
  if (xPath === 'connected-scan') {
    await step6_profile_scan();                               // narrate scan + show preview
  }

  // Act 2 — Materials, then the first drawer review (Scout's read of the brand).
  await stepMaterials();                                      // website / docs / verbal
  await step_brand_review_first();                            // drawer opens → fills → accept → closes

  // Act 3 — Topics/products + goals.
  if (state.accountType === 'brand') await step3_product_lines_brand_only();
  else                               await step_topics_individual();
  await step4_goals();                                        // goals → KPI translation

  // Act 4 — Market scan, audience inference, final drawer review before trends.
  await step7_intel_scan();
  await step_audience_infer();                                // Scout proposes, user validates
  await step_brand_review_final();                            // drawer reopens with new sections → accept → closes

  // Tone surfaces only AFTER the trending knowledge has been filled and the
  // user has accepted it — so the voice picker reads as "given everything
  // we now know, here are the directions that fit."
  await step_tone_voice();                                    // tone-direction card pick

  // Act 5 — Merged directions → drafts → publish (or save for later).
  const iterChoice = await step_post_directions();
  if (iterChoice === 'later') {
    await scoutMsg(
      "Saved. The drafts will be waiting on your dashboard when you're ready.",
      { typingFor: 800, beat: 400 }
    );
  } else {
    await step_edit_publish();
  }

  // Act 6 — Profile score (return loop) → infrastructure build → handoff.
  await step_profile_score();
  await step_infrastructure_build();
  await step13_handoff();
}

/* =========================================================================
   17. DEMO CONTROLS
   ========================================================================= */
function bindDemoControls() {
  $('#ctl-restart').addEventListener('click', () => location.reload());
  $('#ctl-skip').addEventListener('click', () => {
    stream.dataset.started = '1';
    enterApp();
  });

  $('#composer-send').addEventListener('click', () => {
    const v = $('#composer-input').value.trim();
    if (!v) return;
    $('#composer-input').value = '';
    if (pendingComposerResolver) {
      const resolve = pendingComposerResolver;
      pendingComposerResolver = null;
      $('#composer-input').placeholder = 'Message Scout…';
      setComposerEnabled(false);
      resolve(v);
    } else {
      userMsg(v);
    }
  });
  $('#composer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('#composer-send').click(); }
  });

  // Toggle X account maturity for demo (hidden control via keyboard)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'n' && e.shiftKey && e.metaKey) {
      state.xAccountMaturity = state.xAccountMaturity === 'new' ? 'established' : 'new';
      console.log('X account maturity →', state.xAccountMaturity);
    }
  });
}

/* =========================================================================
   17b. PRE-CONVERSATION SPLASH (3 screens)
   Names the pain → shows the knowledge → shows the outcome.
   ========================================================================= */
const SPLASH_FLAG_KEY = 'flagstaff_seen_splash';
const splashState = { index: 0, dismissed: false };

async function runSplash() {
  const leftStage  = $('#splash-left-stage');
  const rightStage = $('#splash-right-stage');
  const dots = $$('.splash__dot');
  const skipBtn = $('#splash-skip');
  const ctaBtn  = $('#splash-cta');
  const ctaLabel = $('#splash-cta-label');
  const backBtn = $('#splash-back');
  if (!leftStage || !rightStage) return endSplash();

  const CTA_LABELS = ['Next', 'Next', "Let's craft your first post"];

  let activeLeft = null;
  let activeRight = null;
  let inflight = false;

  const mount = async (idx) => {
    if (inflight) return;
    inflight = true;

    // Crossfade — fade out current content in place, swap, fade in new content.
    if (activeLeft)  activeLeft.classList.add('splash__pane--out');
    if (activeRight) activeRight.classList.add('splash__pane--out');
    await sleep(activeLeft || activeRight ? 220 : 0);
    if (activeLeft)  activeLeft.remove();
    if (activeRight) activeRight.remove();

    const nextLeft  = buildSplashLeft(idx);
    const nextRight = buildSplashRight(idx);
    leftStage.appendChild(nextLeft);
    rightStage.appendChild(nextRight);
    activeLeft = nextLeft;
    activeRight = nextRight;

    // Force a reflow so the "in" transition plays from the initial state.
    void nextLeft.offsetHeight;
    nextLeft.classList.add('splash__pane--in');
    nextRight.classList.add('splash__pane--in');

    dots.forEach((d, i) => d.classList.toggle('splash__dot--active', i === idx));
    if (ctaLabel) ctaLabel.textContent = CTA_LABELS[idx];
    if (ctaBtn) ctaBtn.classList.toggle('splash__cta--final', idx === 2);
    if (backBtn) backBtn.classList.toggle('splash__back--visible', idx > 0);
    splashState.index = idx;

    requestAnimationFrame(() => playSplashScreen(idx, nextRight));
    inflight = false;
  };

  const advance = () => {
    if (splashState.index < 2) mount(splashState.index + 1);
    else endSplash();
  };
  const back = () => {
    if (splashState.index > 0) mount(splashState.index - 1);
  };

  if (skipBtn) skipBtn.addEventListener('click', endSplash);
  if (ctaBtn)  ctaBtn.addEventListener('click', advance);
  if (backBtn) backBtn.addEventListener('click', back);

  mount(0);
}

function endSplash() {
  splashState.dismissed = true;
  try { localStorage.setItem(SPLASH_FLAG_KEY, '1'); } catch (e) {}
  // Smooth handoff: pull the splash up slightly while fading it out, then
  // reveal the conversation view (which contains the greeting hero). The
  // hero's own beats then take over.
  const view = $('#view-splash');
  if (view) {
    view.classList.add('view--exiting');
    setTimeout(() => {
      showView('view-conv');
      // Let the chat view fade up softly. The hero plays its own intro.
      const convView = $('#view-conv');
      if (convView) {
        convView.classList.add('view--entering');
        requestAnimationFrame(() => {
          convView.classList.add('view--entered');
        });
      }
      runConversation();
    }, 460);
  } else {
    showView('view-conv');
    runConversation();
  }
}

function buildSplashLeft(idx) {
  // UX-copy direction for the splash:
  // 1. Open with a sharper promise that names the alternative (templated AI).
  // 2. Show the work: a knowledge base built from the user, not stock data.
  // 3. End on outcome: the metrics that actually matter for creators.
  const titles = [
    'Posts that sound like you. Not like everyone else on the internet.',
    'A knowledge base, built from you.',
    'Numbers that matter. Not just impressions.',
  ];
  const bodies = [
    "Scout is your AI marketing partner. It learns your voice, your audience, and the trends moving your niche right now, then drafts the posts only you could write.",
    "Your brand. Your audience. Your voice. Your numbers. Scout assembles all of it into one living knowledge base, refreshed every time you sit down to post.",
    "Scout finds what's working for your niche and doubles down. Growth, saves, share of voice, replies that turn into customers, all tracked from day one.",
  ];
  return el('div', { class: 'splash__pane splash__copy' }, [
    el('h1', { class: 'splash__copy-title' }, titles[idx]),
    el('p', { class: 'splash__copy-body' }, bodies[idx]),
  ]);
}

function buildSplashRight(idx) {
  const pane = el('div', { class: 'splash__pane splash__pane--right' });
  if (idx === 0)      pane.appendChild(buildSplashScreen1Right());
  else if (idx === 1) pane.appendChild(buildSplashScreen2Right());
  else                pane.appendChild(buildSplashScreen3Right());
  return pane;
}


/* ---- Screen 1: Noise vs polished post ---- */

function buildSplashScreen1Right() {
  // Rotating post wheel: nine substantial post cards arranged in a circle
  // whose centre sits below the visible mask. Each card carries a real
  // post caption + image so the wheel reads as a feed of work, not just
  // skeleton placeholders. Hearts drift up occasionally from random posts.
  const POSTS = [
    { ext: 'jpeg', caption: "Feeling indecisive? Pick the everything bagel." },
    { ext: 'png',  caption: 'You deserve a treat. Iced oat lattes are back.' },
    { ext: 'png',  caption: 'Coucou. The lemon macaron is back this week.' },
    { ext: 'png',  caption: "If your design doesn't tell a story, who will listen?" },
    { ext: 'png',  caption: 'Warm breakfast is one bite away.' },
    { ext: 'png',  caption: 'Baith jaao. The chair we all grew up around.' },
    { ext: 'png',  caption: 'New Molts. Classic malt, roasted hops.' },
    { ext: 'png',  caption: 'Trail logged. Inbox can wait.' },
    { ext: 'jpeg', caption: "Warning: so good you can't see straight." },
  ];
  const N = POSTS.length;
  const tiles = POSTS.map((p, i) => {
    const angle = (i / N) * 360;
    const imgSrc = `/Posts/${i + 1}.${p.ext}`;
    return el('div', {
      class: 'splash-wheel__tile',
      'data-tile-idx': String(i),
      style: `--angle: ${angle}deg;`,
    }, [
      el('div', {
        class: 'splash-wheel__tile-inner',
        style: `--init-r: ${-angle}deg;`,
      }, [
        buildPostSkeleton(imgSrc, p.caption),
      ]),
    ]);
  });

  const heartLayer = el('div', { class: 'splash-wheel-hearts', id: 'splash-wheel-hearts', 'aria-hidden': 'true' });

  return el('div', { class: 'splash__block splash-wheel-block' }, [
    el('div', { class: 'splash-wheel-mask' }, [
      el('div', { class: 'splash-wheel' }, tiles),
      heartLayer,
    ]),
  ]);
}

// Skeleton-style post card with a real caption + image. Mirrors the visual
// vocabulary of /Skeleton.svg: avatar dot + name bar + caption text + media
// + metric bars.
function buildPostSkeleton(imgSrc, caption) {
  return el('div', { class: 'post-skeleton' }, [
    el('div', { class: 'post-skeleton__head' }, [
      el('div', { class: 'post-skeleton__avatar' }),
      el('div', { class: 'post-skeleton__id' }, [
        el('div', { class: 'post-skeleton__bar post-skeleton__bar--name' }),
        el('div', { class: 'post-skeleton__bar post-skeleton__bar--handle' }),
      ]),
    ]),
    caption
      ? el('div', { class: 'post-skeleton__caption' }, caption)
      : el('div', { class: 'post-skeleton__text' }, [
          el('div', { class: 'post-skeleton__bar post-skeleton__bar--line' }),
          el('div', { class: 'post-skeleton__bar post-skeleton__bar--line post-skeleton__bar--line-short' }),
        ]),
    el('div', { class: 'post-skeleton__media', style: `background-image: url('${imgSrc}');` }),
    el('div', { class: 'post-skeleton__metrics' }, [
      el('div', { class: 'post-skeleton__metric' }),
      el('div', { class: 'post-skeleton__metric' }),
      el('div', { class: 'post-skeleton__metric' }),
      el('div', { class: 'post-skeleton__metric' }),
    ]),
  ]);
}

/* ---- Screen 2: Knowledge drawer ----
   The same side-drawer the user opens during the conversation (brand-drawer).
   Scout's mark sits at the top-left of the section; the drawer takes the
   rest. Content alternates between Brand and Trending — same look as the
   in-conversation drawer, with sections filling in sequentially. */
function buildSplashScreen2Right() {
  const scoutAvatarSvg = `
    <svg viewBox="0 0 32 32" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8"  cy="8"  r="6" class="scout-loader__c scout-loader__c--1"/>
      <circle cx="8"  cy="24" r="6" class="scout-loader__c scout-loader__c--2"/>
      <circle cx="24" cy="24" r="6" class="scout-loader__c scout-loader__c--3"/>
      <circle cx="24" cy="8"  r="6" class="scout-loader__c scout-loader__c--4"/>
    </svg>
  `;
  const scoutAvatar = parseSvg(scoutAvatarSvg);

  return el('div', { class: 'splash__block splash2-block' }, [
    el('div', { class: 'splash2-canvas', 'aria-hidden': 'true' }, [
      el('div', { class: 'splash2-canvas__halo' }),
    ]),

    el('div', {
      class: 'splash2-mark msg__avatar--scout msg__avatar--loading',
      id: 'splash2-scout-avatar',
    }, [scoutAvatar]),

    // Drawer container — same vocabulary as the in-conversation brand-drawer.
    el('div', { class: 'splash2-drawer', id: 'splash2-drawer' }),
  ]);
}

// Splash 2 drawer content — exact same shape as the in-conversation
// brand-drawer. Each section is a {eyebrow, build()} pair so we can reveal
// them sequentially. Brand and Trending are two variants of the same panel.
function splash2BrandSections() {
  return [
    {
      eyebrow: 'Identity',
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__name' }, 'rasa'),
        el('div', { class: 'brand-drawer__sub-line' }, 'Heritage Fashion · Karachi, Pakistan'),
        el('p', { class: 'brand-drawer__positioning' }, 'Modern Gen Z take on traditional Pakistani crafts.'),
      ]),
    },
    {
      eyebrow: 'Themes',
      build: () => el('div', { class: 'brand-drawer__pills' }, [
        el('span', { class: 'brand-drawer__pill' }, 'Heritage'),
        el('span', { class: 'brand-drawer__pill' }, 'Sustainability'),
        el('span', { class: 'brand-drawer__pill' }, 'Local artisanship'),
      ]),
    },
    {
      eyebrow: 'Top performing topics',
      build: () => el('div', { class: 'brand-drawer__topic-bars' }, [
        topicBarEl('Heritage origin stories', 92),
        topicBarEl('Behind the scenes artisan', 67),
        topicBarEl('Styling guides', 45),
      ]),
    },
    {
      eyebrow: 'Audience',
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__audience-row' }, [
          el('div', { class: 'brand-drawer__avatar-cluster' }, [
            el('span', { class: 'brand-drawer__avatar' }),
            el('span', { class: 'brand-drawer__avatar' }),
            el('span', { class: 'brand-drawer__avatar' }),
          ]),
          el('p', { class: 'brand-drawer__audience' }, 'Women 22 to 34 in Pakistan, the UAE, and the Pakistani diaspora, culturally curious, mobile first, value heritage with a modern eye.'),
        ]),
        el('div', { class: 'brand-drawer__secondary' }, 'Mothers and gift buyers · 35 to 50'),
      ]),
    },
    {
      eyebrow: 'Peak activity',
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__peak-strip' }, [
          el('div', { class: 'brand-drawer__peak-track' }, [
            el('div', { class: 'brand-drawer__peak-highlight' }),
          ]),
          el('div', { class: 'brand-drawer__peak-labels' }, [
            el('span', {}, '12a'), el('span', {}, '6a'), el('span', {}, '12p'), el('span', {}, '6p'), el('span', {}, '12a'),
          ]),
        ]),
        el('div', { class: 'brand-drawer__peak-text' }, 'Weekdays 2 to 4pm PKT'),
      ]),
    },
  ];
}

function splash2TrendingSections() {
  return [
    {
      eyebrow: 'Top topic',
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__name' }, 'Heritage origin stories'),
        el('div', { class: 'brand-drawer__sub-line' }, '+92% engagement vs. niche average'),
      ]),
    },
    {
      eyebrow: 'Top trend',
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__name' }, '#SouthAsianHeritageWeek'),
        el('div', { class: 'brand-drawer__sub-line' }, '+4.2× week on week · spiking now'),
      ]),
    },
    {
      eyebrow: 'What audiences save',
      build: () => el('div', { class: 'brand-drawer__topic-bars' }, [
        topicBarEl('Founder transparency', 88),
        topicBarEl('Workshop reels', 73),
        topicBarEl('Process breakdowns', 54),
      ]),
    },
    {
      eyebrow: 'Best format',
      build: () => el('div', { class: 'brand-drawer__pills' }, [
        el('span', { class: 'brand-drawer__pill' }, 'Image + caption'),
        el('span', { class: 'brand-drawer__pill' }, 'Names the artisan'),
        el('span', { class: 'brand-drawer__pill' }, '< 240 chars'),
      ]),
    },
    {
      eyebrow: 'Peak window',
      build: () => el('div', {}, [
        el('div', { class: 'brand-drawer__peak-strip' }, [
          el('div', { class: 'brand-drawer__peak-track' }, [
            el('div', { class: 'brand-drawer__peak-highlight' }),
          ]),
          el('div', { class: 'brand-drawer__peak-labels' }, [
            el('span', {}, '12a'), el('span', {}, '6a'), el('span', {}, '12p'), el('span', {}, '6p'), el('span', {}, '12a'),
          ]),
        ]),
        el('div', { class: 'brand-drawer__peak-text' }, 'Weekdays 2 to 4pm PKT'),
      ]),
    },
  ];
}

function topicBarEl(name, pct) {
  return el('div', { class: 'brand-drawer__topic-bar' }, [
    el('div', { class: 'brand-drawer__topic-row' }, [
      el('span', { class: 'brand-drawer__topic-name' }, name),
      el('span', { class: 'brand-drawer__topic-pct' }, `+${pct}%`),
    ]),
    el('div', { class: 'brand-drawer__topic-track' }, [
      el('div', { class: 'brand-drawer__topic-fill', style: `width: ${Math.min(100, pct)}%;` }),
    ]),
  ]);
}

// Render the splash 2 drawer using the same vocabulary as the in-conversation
// brand-drawer. Title, sub, and then a list of sections — each with an
// uppercase eyebrow and a body built by `sec.build()`.
function renderSplash2Drawer(node, kind) {
  if (!node) return;
  node.innerHTML = '';

  const isBrand = kind === 'brand';
  const title = isBrand ? 'About your brand' : "What's working";
  const sub = 'Scout is filling this as she learns.';
  const sections = isBrand ? splash2BrandSections() : splash2TrendingSections();

  node.appendChild(el('div', { class: 'splash2-drawer__head' }, [
    el('h2', { class: 'splash2-drawer__title' }, title),
    el('p',  { class: 'splash2-drawer__sub' }, sub),
  ]));
  const body = el('div', { class: 'splash2-drawer__body' });
  sections.forEach((sec) => {
    body.appendChild(el('section', { class: 'brand-drawer__section splash2-section--pre' }, [
      el('div', { class: 'brand-drawer__eyebrow' }, sec.eyebrow),
      sec.build(),
    ]));
  });
  node.appendChild(body);
}

/* ---- Screen 3: Outcomes ----
   A 3×3 post grid that fills the right section. The middle tile is a white
   engagement stat card with an upward-trending sparkline. */
function buildSplashScreen3Right() {
  // Tiles map to /Posts/1..4 then /Posts/5..8 (the middle slot is the stat
  // tile). Captions match each image's actual hero copy.
  const POSTS = [
    { ext: 'jpeg', caption: "Feeling indecisive? Pick the everything bagel." },
    { ext: 'png',  caption: 'You deserve a treat. Iced oat lattes are back.' },
    { ext: 'png',  caption: 'Coucou. The lemon macaron is back this week.' },
    { ext: 'png',  caption: "If your design doesn't tell a story, who will listen?" },
    null, // middle: stat tile
    { ext: 'png',  caption: 'Warm breakfast is one bite away.' },
    { ext: 'png',  caption: 'Baith jaao. The chair we all grew up around.' },
    { ext: 'png',  caption: 'New Molts. Classic malt, roasted hops.' },
    { ext: 'png',  caption: 'Trail logged. Inbox can wait.' },
  ];

  const tiles = POSTS.map((p, i) => {
    if (p === null) return buildSplash3StatTile();
    const imgIdx = i < 4 ? i + 1 : i;
    const src = `/Posts/${imgIdx}.${p.ext}`;
    return el('div', { class: 'splash3-tile' }, [buildPostSkeleton(src, p.caption)]);
  });

  return el('div', { class: 'splash__block splash3-block' }, [
    el('div', { class: 'splash3-grid' }, tiles),
  ]);
}

// White engagement stat card — clean surface, upward sparkline. Reads like
// a dashboard widget pulled out of the product.
function buildSplash3StatTile() {
  const linePath  = 'M2,32 L14,28 L26,30 L38,22 L50,24 L62,16 L74,14 L86,8 L98,4';
  const fillPath  = 'M2,32 L14,28 L26,30 L38,22 L50,24 L62,16 L74,14 L86,8 L98,4 L98,40 L2,40 Z';
  return el('div', { class: 'splash3-tile splash3-tile--stat' }, [
    el('div', { class: 'splash3-stat' }, [
      el('div', { class: 'splash3-stat__eyebrow' }, [
        el('span', { class: 'splash3-stat__dot' }),
        document.createTextNode('Engagement · 30d'),
      ]),
      el('div', { class: 'splash3-stat__value', id: 'splash3-stat-value' }, '↑ 3.8×'),
      el('div', { class: 'splash3-stat__label' }, 'vs. your previous baseline'),
      el('div', { class: 'splash3-stat__chart' }, [
        parseSvg(
          '<svg viewBox="0 0 100 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" class="splash3-stat__svg" aria-hidden="true">' +
            '<defs>' +
              '<linearGradient id="splash3-grad" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%"  stop-color="#a78bfa" stop-opacity="0.28"/>' +
                '<stop offset="100%" stop-color="#a78bfa" stop-opacity="0"/>' +
              '</linearGradient>' +
            '</defs>' +
            '<path class="splash3-stat__svg-fill" d="' + fillPath + '" fill="url(#splash3-grad)"/>' +
            '<path class="splash3-stat__svg-line" d="' + linePath + '" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle class="splash3-stat__svg-dot" cx="98" cy="4" r="3.4" fill="#7c3aed"/>' +
          '</svg>'
        ),
      ]),
    ]),
  ]);
}

/* ---- Per-screen animation kickoff ---- */
function playSplashScreen(idx, root) {
  if (idx === 0) {
    playSplashWheelHearts(root);
    return;
  }
  if (idx === 1) {
    playSplashScreen2Sequence(root);
    return;
  }
  if (idx === 2) {
    playSplash3Stat(root);
    return;
  }
}

// Animate the splash 3 stat value counting up.
function playSplash3Stat(root) {
  const node = root.querySelector('#splash3-stat-value');
  if (!node) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = 3.8;
  const start = performance.now();
  const dur = 1200;
  const tick = (now) => {
    if (!root.isConnected) return;
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = (target * eased).toFixed(1);
    node.textContent = `↑ ${v}×`;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Splash 1: hearts spawn rarely at random x positions along the wheel arc
// and float upward. Reduced motion → no spawn. Cleaned up on unmount.
function playSplashWheelHearts(root) {
  const layer = root.querySelector('#splash-wheel-hearts');
  if (!layer) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let stopped = false;
  const spawn = () => {
    if (stopped || !root.isConnected) return;
    const x = 20 + Math.random() * 60; // 20–80% across the wheel
    const heart = el('span', {
      class: 'splash-wheel-heart',
      style: `left: ${x.toFixed(1)}%;`,
    }, '♥');
    layer.appendChild(heart);
    setTimeout(() => heart.remove(), 4500);
    // Long gaps between hearts so the page reads as calm.
    setTimeout(spawn, 3500 + Math.random() * 3500);
  };
  setTimeout(spawn, 1400);
  const observer = new MutationObserver(() => {
    if (!root.isConnected) { stopped = true; observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Splash 2 sequence:
//  1. Scout pill animates in (top-left of right block)
//  2. Drawer dissolves up from the bottom-right corner
//  3. Drawer's heading appears
//  4. Section rows fill in one by one (eyebrow + value, typewriter on the value)
//  5. Drawer slides back down out of view
//  6. Scout re-emerges with new activity label
//  7. A second drawer appears with "Thoughts" content
// The whole loop repeats while the screen is mounted.
async function playSplashScreen2Sequence(root) {
  const scoutAvatar = root.querySelector('#splash2-scout-avatar');
  const drawer      = root.querySelector('#splash2-drawer');
  if (!scoutAvatar || !drawer) return;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const beat = (ms) => sleep(reduced ? 0 : ms);

  const setScoutThinking = () => {
    scoutAvatar.classList.add('msg__avatar--loading');
    scoutAvatar.innerHTML = '';
    scoutAvatar.appendChild(parseSvg(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="8"  cy="8"  r="6" class="scout-loader__c scout-loader__c--1"/>
        <circle cx="8"  cy="24" r="6" class="scout-loader__c scout-loader__c--2"/>
        <circle cx="24" cy="24" r="6" class="scout-loader__c scout-loader__c--3"/>
        <circle cx="24" cy="8"  r="6" class="scout-loader__c scout-loader__c--4"/>
      </svg>
    `));
  };
  const setScoutSettled = () => {
    scoutAvatar.classList.remove('msg__avatar--loading');
    scoutAvatar.innerHTML = '<svg><use href="#i-logo"/></svg>';
  };

  const fillDrawer = async (kind) => {
    setScoutThinking();
    renderSplash2Drawer(drawer, kind);
    // Reveal title/sub, then each section sequentially.
    await beat(180);
    drawer.querySelector('.splash2-drawer__head')?.classList.add('splash2-section--in');
    await beat(260);
    const sections = drawer.querySelectorAll('.brand-drawer__section');
    for (const s of sections) {
      s.classList.remove('splash2-section--pre');
      s.classList.add('splash2-section--in');
      await beat(280);
    }
    // Replay the top-topic bar fills so they animate from 0.
    const bars = drawer.querySelectorAll('.brand-drawer__topic-fill');
    bars.forEach((b) => {
      const w = b.style.width;
      b.style.width = '0%';
      requestAnimationFrame(() => { b.style.width = w; });
    });
    setScoutSettled();
    await beat(2200);
  };

  const fadeOutDrawer = async () => {
    drawer.classList.add('splash2-drawer--out');
    await beat(360);
    drawer.classList.remove('splash2-drawer--out');
    drawer.innerHTML = '';
  };

  let stopped = false;
  const observer = new MutationObserver(() => {
    if (!root.isConnected) { stopped = true; observer.disconnect(); }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  while (!stopped && root.isConnected) {
    await fillDrawer('brand');
    if (stopped || !root.isConnected) break;
    await fadeOutDrawer();
    await beat(300);

    await fillDrawer('trending');
    if (stopped || !root.isConnected) break;
    await fadeOutDrawer();
    await beat(300);
  }
}




/* =========================================================================
   17.5 CAMPAIGNS DASHBOARD
   ========================================================================= */

const CAMPAIGN_STATUSES = [
  { id: 'all',      label: 'All' },
  { id: 'review',   label: 'In Review' },
  { id: 'draft',    label: 'In Draft' },
  { id: 'scheduled',label: 'Scheduled' },
  { id: 'published',label: 'Published' },
  { id: 'progress', label: 'In Progress' },
  { id: 'revision', label: 'Revision Requested' },
  { id: 'rejected', label: 'Rejected' },
];

/* Campaigns model — running + upcoming + rest.
   The dashboard's top rows are pinned to the .live and .upcoming ones; the
   rest live under the filter tabs like before. `leadAxis` and `whyNow` are
   the Phase-1 curated fields that carry forward into "up next" cards. */
const DEMO_CAMPAIGNS = [
  {
    id: 'track-5-theory-sprint',
    title: 'Track 5 Theory Sprint',
    description: 'A 4 post theory build riding this week’s Track 5 chatter. Carousel first, poll next, anniversary tie-in queued.',
    status: 'progress',
    state:  'live',
    startDate: '22 Oct 2026',
    endDate:   '27 Oct 2026',
    postCount: 4,
    commentCount: 28,
    author: 'Swiftie Central',
    createdAt: 'Created 21 Oct',
    live: {
      reach:     '48.7k',
      replies:   '612',
      nextPost:  'Thu 7pm',
      nextIn:    'in 5h',
      lift:      '3.4× baseline',
    },
  },
  {
    id: '1989-anniversary-week',
    title: '1989 Anniversary Week',
    description: 'A 5 post anniversary countdown landing on Oct 27. Throwbacks, easter eggs, fan memories, and one debate-driving poll.',
    status: 'review',
    state:  'upcoming',
    leadAxis: 'event',
    source:   'the upcoming 1989 anniversary on Oct 27',
    banner:   'Based on the upcoming 1989 anniversary on Oct 27.',
    fact:     'The 1989 anniversary lands Oct 27, and your anniversary throwbacks are consistently your highest-reach content.',
    move:     'Turns the event into a 5-post countdown across your strongest Swiftie formats.',
    startDate: '23 Oct 2026',
    endDate:   '27 Oct 2026',
    postCount: 5,
    commentCount: 0,
    author: 'Scout · curated',
    createdAt: 'Refreshed 4h ago',
  },
  {
    id: 'rank-the-eras-r2',
    title: 'Rank the Eras Poll, round 2',
    description: 'Your last eras ranking poll hit 4.1× replies. A tighter bracket format brings the debate back before anniversary week.',
    status: 'review',
    state:  'upcoming',
    leadAxis: 'pattern-echo',
    source:   'your top performer ‘Rank the eras poll’',
    banner:   'Based on your top performing campaign, ‘Rank the eras poll.’',
    fact:     'Your last eras ranking poll was your top-commented post this year at 4.1× your usual replies.',
    move:     'Replays the debate format with a cleaner bracket and a finals post.',
    startDate: '18 Oct 2026',
    endDate:   '24 Oct 2026',
    postCount: 4,
    commentCount: 0,
    author: 'Scout · curated',
    createdAt: 'Refreshed 2d ago',
  },
  {
    id: 'cornelia-street-clues',
    title: 'Cornelia Street Clues',
    description: 'A theory carousel opening on the lyric thread fans keep reviving. Saves first, comments second.',
    status: 'draft',
    state:  'other',
    startDate: '20 Oct 2026',
    endDate:   '24 Oct 2026',
    postCount: 4,
    commentCount: 4,
    author: 'Swiftie Central',
    createdAt: 'Created 12 Oct',
  },
  {
    id: 'friendship-bracelet-friday',
    title: 'Friendship Bracelet Friday',
    description: 'Weekly fan prompt series. Low lift, high replies, designed to collect stories and repostable UGC.',
    status: 'review',
    state:  'other',
    startDate: 'Ongoing',
    endDate:   '',
    postCount: 8,
    commentCount: 6,
    author: 'Swiftie Central',
    createdAt: 'Created 02 Oct',
  },
  {
    id: 'rank-the-eras-r1',
    title: 'Rank the Eras Poll',
    description: 'The original bracket-style poll that turned era loyalty into a comments thread. Still the account’s top reply driver.',
    status: 'published',
    state:  'other',
    startDate: '12 Sep 2026',
    endDate:   '19 Sep 2026',
    postCount: 4,
    commentCount: 89,
    author: 'Swiftie Central',
    createdAt: 'Created 08 Sep',
  },
];

const campaignsState = { filter: 'all' };

function normalizeCampaignTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function applyGeneratedCampaignPostback(params = new URLSearchParams(location.search)) {
  const postedId = params.get('campaign-posted');
  if (!postedId) return;
  const title = params.get('campaign-title') || 'New campaign';
  const postCount = Number(params.get('campaign-posts')) || 4;
  const startDate = params.get('campaign-start') || 'Thu, 7:00 PM';
  const endDate = params.get('campaign-end') || 'Sun, 12:00 PM';
  const titleKey = normalizeCampaignTitle(title);
  const posted = DEMO_CAMPAIGNS.find(c =>
    c.id === postedId || normalizeCampaignTitle(c.title) === titleKey
  );
  const generatedCampaign = {
    id: postedId,
    title,
    description: 'A ' + postCount + ' post campaign generated by Scout and queued for @swiftie.central.',
    status: 'scheduled',
    state: 'other',
    startDate,
    endDate,
    postCount,
    commentCount: 0,
    author: 'Swiftie Central',
    createdAt: 'Generated just now',
  };
  if (posted) {
    Object.assign(posted, generatedCampaign, { id: posted.id });
  } else {
    DEMO_CAMPAIGNS.unshift(generatedCampaign);
  }
  campaignsState.filter = 'all';
}

function statusMeta(id) {
  return CAMPAIGN_STATUSES.find(s => s.id === id) || CAMPAIGN_STATUSES[0];
}

function campaignCard(c, opts) {
  const status = statusMeta(c.status);
  const attrs = { class: 'camp-card', 'data-status': c.status };
  if (opts && opts.onclick) attrs.onclick = opts.onclick;
  // Range formatting: join with "to" when both bounds exist, otherwise
  // show the label alone. Avoids the "Ongoing " dangling separator.
  const dateRange = c.endDate ? (c.startDate + ' to ' + c.endDate) : c.startDate;
  // Comment count: pluralize, and mute the dot on zero so it doesn't read
  // as an unread alert.
  const commentsLabel = c.commentCount + (c.commentCount === 1 ? ' comment' : ' comments');
  return el('article', attrs, [
    el('div', { class: 'camp-card__head' }, [
      el('h3', { class: 'camp-card__title' }, c.title),
      el('button', {
        class: 'camp-card__kebab', 'aria-label': 'Campaign actions', type: 'button',
        html: icon('i-kebab'),
        onclick: (e) => e.stopPropagation(),
      }),
    ]),
    el('p', { class: 'camp-card__desc' }, c.description),
    el('div', { class: 'camp-card__meta' }, [
      el('span', { class: 'camp-card__date', html: icon('i-cal') + '<span>' + dateRange + '</span>' }),
      el('span', { class: 'camp-card__posts' }, c.postCount + (c.postCount === 1 ? ' post' : ' posts')),
    ]),
    el('div', { class: 'camp-card__meta camp-card__meta--tight' }, [
      el('span', { class: 'camp-status camp-status--' + c.status }, status.label),
      el('span', {
        class: 'camp-card__comments' + (c.commentCount === 0 ? ' camp-card__comments--zero' : ''),
      }, [
        el('span', { class: 'camp-card__comments-dot', 'aria-hidden': 'true' }),
        document.createTextNode(commentsLabel),
      ]),
    ]),
    el('div', { class: 'camp-card__divider', 'aria-hidden': 'true' }),
    el('footer', { class: 'camp-card__foot' }, [
      el('span', { class: 'camp-card__author' }, [
        (c.author || '').startsWith('Scout')
          ? el('span', { class: 'camp-card__avatar camp-card__avatar--scout', 'aria-hidden': 'true', html: icon('i-logo') })
          : el('span', { class: 'camp-card__avatar', 'aria-hidden': 'true' }),
        document.createTextNode(c.author),
      ]),
      el('span', { class: 'camp-card__timestamp' }, c.createdAt),
    ]),
  ]);
}

function renderCampaignCards() {
  const grid = $('#campaigns-grid');
  if (!grid) return;
  const filter = campaignsState.filter;
  // Under "All", the dashboard top rows already show `live` + `upcoming`.
  // Keep the rest here so the grid isn't duplicating them.
  const list = DEMO_CAMPAIGNS.filter(c => {
    if (filter === 'all') return c.state === 'other';
    return c.status === filter;
  });
  grid.innerHTML = '';
  if (list.length === 0) {
    // Empty state — Peak-End Rule: give the user a next-move instead of a
    // dead-end string. Nudge them back to Create Campaign.
    const filterLabel = ({
      review: 'in review', draft: 'in draft', published: 'published',
      progress: 'in progress', revision: 'in revision', rejected: 'rejected',
    })[filter] || 'in this view';
    const empty = el('div', { class: 'camp-empty' }, [
      el('div', { class: 'camp-empty__icon', html: icon('i-megaphone') }),
      el('div', { class: 'camp-empty__title' }, 'No campaigns ' + filterLabel + '.'),
      el('div', { class: 'camp-empty__body' },
        filter === 'all'
          ? 'Once you create a campaign, it will land here.'
          : 'Try a different filter or start a new campaign.'),
      el('button', {
        class: 'btn-create camp-empty__cta',
        type: 'button',
        onclick: () => goToScout('p1'),
      }, [
        el('span', { class: 'btn-create__icon', html: icon('i-plus') }),
        el('span', {}, 'Create Campaign'),
      ]),
    ]);
    grid.appendChild(empty);
    return;
  }
  list.forEach(c => grid.appendChild(campaignCard(c, { onclick: () => goToScout('p2') })));
}

/* Running Now hero + Up Next row — pinned to the top of the dashboard.
   Only render when the filter is 'all' (the default landing state).
   Click behaviour on both routes into the two-column detail (Scout p2). */
function renderRunningHero(parent) {
  const running = DEMO_CAMPAIGNS.find(c => c.state === 'live');
  if (!running) return;
  const live = running.live || {};
  const stat = (label, value) => el('div', { class: 'camp-hero__stat' }, [
    el('div', { class: 'camp-hero__stat-label' }, label),
    el('div', { class: 'camp-hero__stat-value' }, value),
  ]);
  const hero = el('article', {
    class: 'camp-hero',
    'data-status': running.status,
    onclick: () => goToScout('p2'),
  }, [
    el('div', { class: 'camp-hero__live' }, [
      el('span', { class: 'camp-hero__pulse', 'aria-hidden': 'true' }),
      document.createTextNode('LIVE · '),
      el('b', {}, running.title),
    ]),
    el('div', { class: 'camp-hero__body' }, [
      el('div', { class: 'camp-hero__left' }, [
        el('p', { class: 'camp-hero__desc' }, running.description),
        el('div', { class: 'camp-hero__meta' }, [
          el('span', { class: 'camp-hero__meta-item', html: icon('i-cal') + '<span>' + running.startDate + ' to ' + running.endDate + '</span>' }),
          el('span', { class: 'camp-hero__meta-item' }, running.postCount + ' posts'),
          el('span', { class: 'camp-hero__meta-item' }, running.commentCount + ' comments'),
        ]),
      ]),
    ]),
    el('div', { class: 'camp-hero__stats' }, [
      stat('Reach',     live.reach    || '—'),
      stat('Replies',   live.replies  || '—'),
      stat('Posts',     String(running.postCount || 0)),
      stat('Comments',  String(running.commentCount || 0)),
      stat('Next post', live.nextPost || '—'),
    ]),
    el('div', { class: 'camp-hero__foot' }, [
      el('span', { class: 'camp-hero__foot-author' }, running.author),
      el('span', { class: 'camp-hero__open' }, [document.createTextNode('Open '), el('span', { html: icon('i-arrow-right') })]),
    ]),
  ]);
  parent.appendChild(hero);
}

/* Word-wrap helper — takes a sentence and returns an array of nodes where
   each word is wrapped in <span class="w" style="--i:N"> so the CSS can stagger
   the reveal animation. Punctuation stays attached to the preceding word so
   commas / dashes don't wrap onto their own line. */
function scoutWords(sentence, startIdx) {
  const nodes = [];
  let i = startIdx || 0;
  // Split on **...** markers first (alternating: even = plain, odd = bold),
  // then per-word inside each segment so stagger animation still applies.
  const segs = sentence.split(/\*\*/);
  segs.forEach((seg, si) => {
    const bold = (si % 2) === 1;
    const cls = bold ? 'w w--bold' : 'w';
    seg.split(/(\s+)/).forEach(part => {
      if (/^\s+$/.test(part)) {
        nodes.push(document.createTextNode(part));
      } else if (part.length) {
        nodes.push(el('span', { class: cls, style: '--i:' + i }, part));
        i++;
      }
    });
  });
  return { nodes, next: i };
}

/* Join a list of phrases as "A", "A and B", or "A, B, and C" (Oxford). */
function joinPhrases(parts) {
  if (parts.length <= 1) return parts.join('');
  if (parts.length === 2) return parts[0] + ' and ' + parts[1];
  return parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
}

function buildScoutNote() {
  const upcoming = DEMO_CAMPAIGNS.filter(c => c.state === 'upcoming').slice(0, 3);
  if (upcoming.length === 0) return null;

  const n = upcoming.length;
  // Pull each campaign's compact source label (added on the data). Order by
  // narrative priority: past performer first (grounds trust), then reactive
  // (what's coming), then experiment (a swing). Campaigns without a source
  // are skipped so the note stays honest to what Scout can actually cite.
  const axisOrder = { 'pattern-echo': 0, event: 1, reactive: 2, experiment: 3 };
  const sources = upcoming
    .slice()
    .sort((a, b) => (axisOrder[a.leadAxis] ?? 9) - (axisOrder[b.leadAxis] ?? 9))
    .map(c => c.source)
    .filter(Boolean);
  const utterance = "I’ve curated " + n + " campaign" + (n === 1 ? '' : 's') + " based on " + joinPhrases(sources) + ".";

  const line = scoutWords(utterance, 0);
  // Tag the last word with `w--last` — its ::after caret gets the extended
  // blink-and-fade lifecycle. Every other word's ::after does a brief pop as
  // that word arrives, so the caret visually follows the last-spoken word.
  const wordSpans = line.nodes.filter(n => n.classList && n.classList.contains('w'));
  const lastWord = wordSpans[wordSpans.length - 1];
  if (lastWord) lastWord.classList.add('w--last');

  const ctaBtn = el('button', {
    class: 'scout-note__cta',
    type: 'button',
    'aria-label': 'Review Scout drafts',
    onclick: () => openScoutRationale(upcoming),
  }, [
    document.createTextNode('View curated campaigns'),
    el('span', { class: 'scout-note__cta-arrow', html: icon('i-arrow-right') }),
  ]);

  return el('div', { class: 'scout-note' }, [
    el('span', { class: 'scout-note__mark', 'aria-hidden': 'true', html: icon('i-logo') }),
    el('div', { class: 'scout-note__body' }, [
      el('p', { class: 'scout-note__line' }, line.nodes),
      el('div', { class: 'scout-note__action' }, [ctaBtn]),
    ]),
  ]);
}

function leadAxisLabel(axis) {
  switch (axis) {
    case 'event':        return 'Event';
    case 'reactive':     return 'Reactive';
    case 'pattern-echo': return 'Pattern-echo';
    case 'experiment':   return 'Experiment';
    default:             return 'Curated';
  }
}

/* Rationale side panel — opened from the Scout note's "Review drafts" CTA.
   Each card is a fact → move statement: the evidence Scout cited, then what
   this draft actually does about it. No redundant "PICK THIS IF" register —
   the panel title already says these are Scout's drafts. */
function openScoutRationale(campaigns) {
  // Guard: if it's already mounted, no-op.
  if (document.getElementById('scout-rationale')) return;

  // Sort by narrative priority so the card order matches the note's ordering
  // (past performer first — grounds trust — then the reactive signal, then
  // any experimental swing).
  const axisOrder = { 'pattern-echo': 0, event: 1, reactive: 2, experiment: 3 };
  const sorted = campaigns.slice().sort(
    (a, b) => (axisOrder[a.leadAxis] ?? 9) - (axisOrder[b.leadAxis] ?? 9)
  );

  // Intro line cites the actual sources (pulled from each campaign's
  // `source` field) so the drawer opens with "why," not with generic
  // copy about "reasoning is under each."
  const sources = sorted.map(c => c.source).filter(Boolean);
  const intro = sources.length
    ? 'Curated from ' + joinPhrases(sources) + '.'
    : 'Every draft cites the signal it’s built on.';

  const items = sorted.map(c => {
    const axis = c.leadAxis || 'default';
    const dateRange = c.endDate ? (c.startDate + ' to ' + c.endDate) : c.startDate;
    const postsLabel = (c.postCount || 0) + ((c.postCount === 1) ? ' post' : ' posts');
    // Banner leads with Scout's mark so the card carries its authorship in
    // the message itself — the footer no longer needs a separate "Scout ·
    // curated" label.
    const bannerIcon = 'i-logo';

    // Match the dashboard's camp-card structure so the two surfaces read as
    // the same UI element. .scout-rat__item just adds button-reset niceties.
    //
    // Clicking a card jumps into the campaign creation flow with a
    // scout-brief param carrying the reasoning that generated the
    // campaign. The flow uses it as Scout's opening chat message so the
    // user sees why this campaign exists before shaping it further.
    // Axis → shape mapping keeps the deep-link aligned with the closest
    // existing SHAPES entry in create-campaign.html.
    const shapeForAxis = axis === 'event' ? 'holiday'
                       : axis === 'reactive' ? 'trend'
                       : axis === 'pattern-echo' ? 'success'
                       : axis === 'experiment' ? 'custom'
                       : 'holiday';
    const briefParts = [c.banner, c.fact, c.move].filter(Boolean).join(' ');
    const briefUrl = '../designs/create-campaign.html'
      + '?shape=' + encodeURIComponent(shapeForAxis)
      + '&scout-brief=' + encodeURIComponent(briefParts)
      + '&campaign-title=' + encodeURIComponent(c.title);

    return el('button', {
      class: 'camp-card scout-rat__item',
      type: 'button',
      'aria-label': 'Open ' + c.title + ' — tweak and review',
      onclick: () => { closeScoutRationale(); location.href = briefUrl; },
    }, [
      // Banner citing the reasoning source — replaces the axis pill so the
      // card leads with WHY, not with a label.
      c.banner ? el('div', { class: 'scout-rat__banner scout-rat__banner--' + axis }, [
        el('span', { class: 'scout-rat__banner-icon', 'aria-hidden': 'true', html: icon(bannerIcon) }),
        el('span', { class: 'scout-rat__banner-text' }, c.banner),
      ]) : null,
      el('div', { class: 'camp-card__head' }, [
        el('h3', { class: 'camp-card__title' }, c.title),
      ]),
      el('div', { class: 'scout-rat__reasoning' }, [
        el('p', { class: 'scout-rat__fact' }, c.fact || c.description),
        c.move ? el('p', { class: 'scout-rat__move' }, c.move) : null,
      ].filter(Boolean)),
      el('div', { class: 'camp-card__meta' }, [
        el('span', { class: 'camp-card__date', html: icon('i-cal') + '<span>' + dateRange + '</span>' }),
        el('span', { class: 'camp-card__posts' }, postsLabel),
      ]),
      el('div', { class: 'camp-card__divider', 'aria-hidden': 'true' }),
      el('footer', { class: 'camp-card__foot camp-card__foot--timestamp-only' }, [
        el('span', { class: 'camp-card__timestamp' }, c.createdAt || ''),
      ]),
    ].filter(Boolean));
  });

  const panel = el('aside', {
    id: 'scout-rationale',
    class: 'scout-rationale',
    role: 'complementary',
    'aria-label': 'Why Scout picked these campaigns',
  }, [
    el('header', { class: 'scout-rationale__head' }, [
      el('h2', { class: 'scout-rationale__title' }, 'Scout’s drafts'),
      el('button', {
        class: 'scout-rationale__close',
        type: 'button',
        'aria-label': 'Close',
        onclick: closeScoutRationale,
        html: icon('i-x-mark'),
      }),
    ]),
    el('p', { class: 'scout-rationale__intro' }, intro),
    el('div', { class: 'scout-rationale__list' }, items),
    el('footer', { class: 'scout-rationale__foot' }, [
      el('span', {}, 'None of these fit?'),
      el('button', {
        class: 'scout-rationale__foot-cta',
        type: 'button',
        onclick: () => { closeScoutRationale(); goToScout('p1'); },
      }, [
        document.createTextNode('Adjust Scout’s brief'),
        el('span', { html: icon('i-arrow-right') }),
      ]),
    ]),
  ]);

  // Mount as a sibling of .campaigns-panel inside #view-campaigns so the panel
  // sits at the same visual level. The view flips to row layout via CSS when
  // this state class is present.
  const view = document.getElementById('view-campaigns');
  if (!view) return;
  view.classList.add('view-campaigns--split');
  view.appendChild(panel);

  // Force a reflow so the initial collapsed width commits before we add the
  // open class — that's what gives the slide-in transition somewhere to run.
  void panel.offsetWidth;
  panel.classList.add('scout-rationale--open');

  // ESC to close. Torn down once the panel is removed.
  const onKey = (e) => { if (e.key === 'Escape') closeScoutRationale(); };
  document.addEventListener('keydown', onKey);
  panel._onKey = onKey;
}

function closeScoutRationale() {
  const panel = document.getElementById('scout-rationale');
  if (!panel) return;
  if (panel._onKey) document.removeEventListener('keydown', panel._onKey);
  panel.classList.remove('scout-rationale--open');
  // Wait for the exit transition to finish before tearing down.
  setTimeout(() => {
    if (panel.parentNode) panel.parentNode.removeChild(panel);
    const view = document.getElementById('view-campaigns');
    if (view) view.classList.remove('view-campaigns--split');
  }, 320);
}

function buildCampaignsView() {
  const root = $('#campaigns');
  if (!root) return;
  root.innerHTML = '';

  // Header: h4 title + 14/400 subtitle on the left, account chip + filled
  // indigo Create Campaign on the right. Matches the Figma spec exactly —
  // Scout's opener sits as its own section below the header, not merged in.
  const header = el('header', { class: 'campaigns__header' }, [
    el('div', { class: 'campaigns__heading' }, [
      el('h1', { class: 'campaigns__title' }, 'Campaigns'),
      el('p',  { class: 'campaigns__subtitle' },
        'Manage all your campaigns, whether scheduled, live, or still in draft from one place.'),
    ]),
    el('div', { class: 'campaigns__actions' }, [
      el('button', { class: 'acct-switch', type: 'button' }, [
        el('span', { class: 'acct-switch__x', html: icon('i-x-logo') }),
        el('span', { class: 'acct-switch__name' }, '@swiftie.central'),
        el('span', { class: 'acct-switch__chev', html: icon('i-chevron-down') }),
      ]),
      el('button', {
        class: 'btn-create', type: 'button',
        onclick: () => goToScout('p1'),
      }, [
        el('span', { class: 'btn-create__icon', html: icon('i-stars') }),
        document.createTextNode('Create Campaign'),
      ]),
    ]),
  ]);

  const note = buildScoutNote();

  const tabs = el('nav', { class: 'campaigns__tabs', role: 'tablist' },
    CAMPAIGN_STATUSES.map(s => {
      const count = s.id === 'all'
        ? DEMO_CAMPAIGNS.length
        : DEMO_CAMPAIGNS.filter(c => c.status === s.id).length;
      const isActive = s.id === campaignsState.filter;
      const isReview = s.id === 'review';
      const btn = el('button', {
        class: 'camp-tab' + (isActive ? ' camp-tab--active' : ''),
        type: 'button',
        role: 'tab',
        'aria-selected': isActive ? 'true' : 'false',
        'data-filter': s.id,
        onclick: () => {
          campaignsState.filter = s.id;
          $$('.camp-tab').forEach(t => {
            const on = t.getAttribute('data-filter') === s.id;
            t.classList.toggle('camp-tab--active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          renderCampaignCards();
        },
      }, [
        document.createTextNode(s.label),
      ]);
      if (isReview && count > 0) {
        btn.appendChild(el('span', { class: 'camp-tab__badge' }, String(count)));
      }
      return btn;
    })
  );

  const grid = el('div', { class: 'campaigns__grid', id: 'campaigns-grid' });

  root.appendChild(header);
  if (note) root.appendChild(note);
  root.appendChild(tabs);
  root.appendChild(grid);
  renderCampaignCards();
}

function setActiveNav(target) {
  $$('.sidebar__btn[data-nav]').forEach(b => {
    if (b.getAttribute('data-nav') === target) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

function enterPanelMode() {
  document.body.classList.remove('mode-onboarding');
  document.body.classList.add('mode-campaigns');
}

function goToCampaigns() {
  applyGeneratedCampaignPostback();
  enterPanelMode();
  showView('view-campaigns');
  setCrumbs(['Home', 'Campaigns']);
  setActiveNav('campaigns');
  buildCampaignsView();
}

function goToHome() {
  enterPanelMode();
  showView('view-dash');
  setCrumbs(['Home']);
  setActiveNav('home');
  buildHomeView();
}

/* =========================================================================
   HOME dashboard — the "main" dashboard reachable via the Home nav.
   Shares the panelized visual language with Campaigns: same backdrop,
   same panel wrapper, same header pattern, same card treatment.
   ========================================================================= */

const HOME_STATS = [
  { label: 'Active campaigns',   value: '2',    delta: '+1 this week',      tone: 'draft' },
  { label: 'Posts scheduled',    value: '13',   delta: 'Next: Thu · 7 PM',  tone: 'progress' },
  { label: 'Pending review',     value: '4',    delta: 'Oldest: 2 days',    tone: 'review' },
  { label: 'Published (30d)',    value: '28',   delta: '+11 vs. prior 30d', tone: 'published' },
];

const HOME_ACTIVITY = [
  { who: 'Scout',            what: 'curated a countdown for',        subject: '1989 Anniversary Week',       when: '12 min ago' },
  { who: 'Swiftie Central',  what: 'moved',                          subject: 'Track 5 Theory Sprint to In Progress', when: '2 hr ago' },
  { who: 'Scout',            what: 'replayed a winning format:',     subject: 'Rank the Eras Poll, round 2',  when: 'Yesterday' },
  { who: 'Swiftie Central',  what: 'published',                      subject: 'Cornelia Street clues post',   when: '2 days ago' },
];

const HOME_SUGGESTIONS = [
  { title: 'Build toward Oct 27', body: 'The 1989 anniversary is coming up. Scout has a 5-post countdown ready from your top-reach anniversary pattern.', cta: 'Review draft' },
  { title: 'Replay your reply winner', body: '"Rank the eras poll" pulled 4.1× your usual replies. Scout rebuilt it as a tighter bracket for this week.', cta: 'Open brief' },
  { title: 'Use the Track 5 chatter', body: '"Track 5" mentions are up 3.4× in your fandom lane. Scout drafted a theory carousel while the thread is active.', cta: 'Read draft' },
];

function buildHomeView() {
  const root = $('#home');
  root.innerHTML = '';

  // Page header — mirrors the campaigns header pattern (same classes).
  const header = el('header', { class: 'campaigns__header' }, [
    el('div', { class: 'campaigns__heading' }, [
      el('h1', { class: 'campaigns__title' }, 'Home'),
      el('p',  { class: 'campaigns__subtitle' },
        'Your workspace at a glance. Scout has been busy — here\'s what\'s moved.'),
    ]),
    el('div', { class: 'campaigns__actions' }, [
      el('button', { class: 'acct-switch', type: 'button' }, [
        el('span', { class: 'acct-switch__x', html: icon('i-x-logo') }),
        el('span', { class: 'acct-switch__name' }, '@swiftie.central'),
        el('span', { class: 'acct-switch__chev', html: icon('i-chevron-down') }),
      ]),
      el('button', {
        class: 'btn-create', type: 'button',
        onclick: () => goToScout('p1'),
      }, [
        el('span', { class: 'btn-create__icon', html: icon('i-plus') }),
        document.createTextNode('Create Campaign'),
      ]),
    ]),
  ]);

  // Stat strip — 4 compact cards, same visual family as campaign cards.
  const stats = el('div', { class: 'home-stats' },
    HOME_STATS.map(s => el('div', { class: 'home-stat' }, [
      el('div', { class: 'home-stat__label' }, s.label),
      el('div', { class: 'home-stat__value' }, s.value),
      el('div', { class: `home-stat__delta home-stat__delta--${s.tone}` }, s.delta),
    ]))
  );

  // Two-column: Recent activity | Scout's suggestions
  const activity = el('div', { class: 'home-card' }, [
    el('div', { class: 'home-card__head' }, [
      el('h2', { class: 'home-card__title' }, 'Recent activity'),
      el('button', { class: 'home-card__more', type: 'button' }, 'View all'),
    ]),
    el('ul', { class: 'home-activity' },
      HOME_ACTIVITY.map(a => el('li', { class: 'home-activity__row' }, [
        a.who === 'Scout'
          ? el('span', { class: 'home-activity__actor home-activity__actor--scout', 'aria-hidden': 'true', html: icon('i-logo') })
          : el('span', { class: 'home-activity__actor home-activity__actor--user' }, a.who.slice(0, 1)),
        el('div', { class: 'home-activity__body' }, [
          el('div', { class: 'home-activity__line' }, [
            el('strong', {}, a.who),
            document.createTextNode(' ' + a.what + ' '),
            el('span', { class: 'home-activity__subject' }, a.subject),
          ]),
          el('div', { class: 'home-activity__when' }, a.when),
        ]),
      ]))
    ),
  ]);

  const suggestions = el('div', { class: 'home-card' }, [
    el('div', { class: 'home-card__head' }, [
      el('h2', { class: 'home-card__title' }, [
        el('span', { class: 'home-card__title-mark', html: icon('i-stars') }),
        document.createTextNode('Scout\'s next moves'),
      ]),
    ]),
    el('ul', { class: 'home-suggestions' },
      HOME_SUGGESTIONS.map(s => el('li', { class: 'home-suggestion' }, [
        el('div', { class: 'home-suggestion__title' }, s.title),
        el('div', { class: 'home-suggestion__body' }, s.body),
        el('button', { class: 'home-suggestion__cta', type: 'button' }, [
          document.createTextNode(s.cta),
          el('span', { html: icon('i-arrow-right') }),
        ]),
      ]))
    ),
  ]);

  const twoCol = el('div', { class: 'home-two-col' }, [activity, suggestions]);

  root.appendChild(header);
  root.appendChild(stats);
  root.appendChild(twoCol);
}


function bindSidebarNav() {
  $$('.sidebar__btn[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-nav');
      if (target === 'campaigns') goToCampaigns();
      else if (target === 'home') goToHome();
    });
  });
}

/* =========================================================================
   Scout campaign flow — fetches designs/{id}.html panels into scout views.
   ========================================================================= */

const SCOUT_PHASES = {
  // p1 (New campaign / shape-picker) is inlined directly in poc/index.html
  // under #view-scout-p1 — no fetch needed. `inline: true` tells goToScout()
  // to skip loadScoutPanel() for this phase.
  p1:          { file: 'phase-1-curated',   view: 'view-scout-p1',       crumbs: ['Home', 'Campaigns', 'New'], inline: true },
  p2:          { file: 'phase-2-review',    view: 'view-scout-p2',       crumbs: ['Home', 'Campaigns', '1989 Anniversary Week'] },
  p25:         { file: 'phase-2-5-inflight',view: 'view-scout-p2-5',     crumbs: ['Home', 'Campaigns', '1989 Anniversary Week'] },
  p3:          { file: 'phase-3-home',      view: 'view-scout-p3',       crumbs: ['Home'] },
  kb:          { file: 'kb-drawer',         view: 'view-scout-kb',       crumbs: ['Home', 'Campaigns', 'Knowledge base'] },
  failures:    { file: 'failure-modes',     view: 'view-scout-failures', crumbs: ['Home', 'Campaigns', 'Failure modes'] },
  composer:    { file: 'composer-hedging',  view: 'view-scout-composer', crumbs: ['Home', 'Scout', 'Composer'] },
  playground:  { file: 'post-playground',   view: 'view-scout-playground', crumbs: ['Home', 'Post dashboard', 'Post playground'] },
};

const scoutLoadCache = new Map(); // file → parsed panel HTML

async function loadScoutPanel(file) {
  if (scoutLoadCache.has(file)) return scoutLoadCache.get(file);
  const res = await fetch('../designs/' + file + '.html', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Scout panel fetch failed: ' + file + ' (' + res.status + ')');
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'text/html');

  // Prefer the semantic panel; some designs (kb-drawer) wrap content in a section.
  const panel = doc.querySelector('main .panel')
             || doc.querySelector('.panel')
             || doc.querySelector('main')
             || doc.body;

  // Strip design-doc catalog demos ("Secondary states", "state 2 · Scoped-regen
  // dialog", etc.) — those are spec-sheet flourishes and shouldn't bleed into
  // the product surface. Every catalog block uses a consistent class prefix.
  if (panel) {
    const catalogSelectors = [
      '.p1-states', '.p1-state',
      '.p2-states', '.p2-state', '.p2-legacy',
      '.p3-states', '.p3-state',
      '.state-block',
      '.state-chip',
      '.state-label',
      '.state__label',
      '.state__num',
      '.spec__section-head', '.spec__section-num',
      '.designview',
      '[data-catalog]',
    ];
    catalogSelectors.forEach(sel => {
      panel.querySelectorAll(sel).forEach(node => node.remove());
    });

    // Phase 3 (and any page structured as a stack of parallel state <section>s)
    // renders every state in the design doc. In the product, only one state
    // renders — keep the first, drop the rest. Detected by any container that
    // holds multiple sibling <section> elements each carrying their own
    // .panel__header (which is the "primary state" marker). Never applies to
    // Phase 2 (single-state) or the components sheet.
    const stateContainers = [panel, ...panel.querySelectorAll('.state-stack, .panel__inner')];
    stateContainers.forEach(ctr => {
      const sections = [...ctr.querySelectorAll(':scope > section')];
      const parallel = sections.filter(s => s.querySelector(':scope > .panel__header'));
      if (parallel.length > 1) {
        parallel.slice(1).forEach(s => s.remove());
      }
    });
    // Also drop any home-footnote / catalog footer that only makes sense in
    // the design doc.
    panel.querySelectorAll('.home-footnote').forEach(n => n.remove());

    // KB drawer (kb-drawer.html) and any page that arrays parallel .state
    // examples inside a .stage — keep only the first .state so the product
    // renders a single surface, not the catalog of variants. Reset the grid
    // to a single column so the remaining state fills the container.
    const stages = panel.querySelectorAll('.stage');
    stages.forEach(stage => {
      const states = stage.querySelectorAll(':scope > .state, :scope > .state-frame');
      if (states.length > 1) {
        [...states].slice(1).forEach(n => n.remove());
      }
      if (states.length >= 1) {
        stage.style.gridTemplateColumns = '1fr';
      }
    });

    // Composer-hedging and failure-modes use .spec__section stacks for their
    // catalog. Keep only the first section.
    const specSections = panel.querySelectorAll('.spec__section');
    if (specSections.length > 1) {
      [...specSections].slice(1).forEach(n => n.remove());
    }

    // Gate the LIVE stat strip: campaigns.md §3.8 running variant renders it
    // only when the campaign is live/in-progress. The static design page ships
    // it as documentation; hide it when the visible badge indicates a
    // non-live state (draft / review / revision / rejected).
    const badge = panel.querySelector('.cpanel__badge');
    const isNonLive = badge && /--draft|--review|--revision|--rejected/.test(badge.className);
    if (isNonLive) {
      panel.querySelectorAll('.detail-live').forEach(el => el.remove());
    }
  }

  // The design pages carry page-scoped rules inside <head><style>. Extract
  // those (there's a single <style> per file) so the panel renders correctly.
  // Scope the rules to `#view-scout-{key}` so they don't leak across phases.
  const styleTags = Array.from(doc.querySelectorAll('head style')).map(s => s.textContent).join('\n');

  // The inline SVG sprite (icons the panel references via <use>) lives at the
  // top of body — pull it so the injected panel can resolve its icons.
  const sprite = doc.querySelector('body > svg[aria-hidden="true"]');

  const parts = [];
  if (sprite) parts.push(sprite.outerHTML);
  if (styleTags) parts.push('<style data-scout-scoped>' + styleTags + '</style>');
  if (panel) parts.push(panel.outerHTML);

  const html = parts.join('\n');
  scoutLoadCache.set(file, html);
  return html;
}

async function goToScout(phaseKey) {
  const phase = SCOUT_PHASES[phaseKey];
  if (!phase) { console.warn('[Scout] unknown phase', phaseKey); return; }

  // Phase 1 (create-campaign) now lives fully in designs/create-campaign.html
  // with the intent-based landing + composer. The POC's inline shape-picker
  // at #view-scout-p1 is retired — route users straight there.
  if (phaseKey === 'p1') {
    location.href = '../designs/create-campaign.html';
    return;
  }

  enterPanelMode();
  setActiveNav('campaigns');
  setCrumbs(phase.crumbs);

  const view = document.getElementById(phase.view);
  if (!view) return;

  // Inlined phases (currently p1) ship their markup directly in index.html;
  // just reveal the view and reset any prior "is-leaving" state so shape
  // cards animate in cleanly on repeat visits.
  if (phase.inline) {
    showView(phase.view);
    view.scrollTop = 0;
    const landing = view.querySelector('.cc-landing');
    if (landing) landing.classList.remove('is-leaving');
    return;
  }

  // Skeleton while we fetch
  if (!view.dataset.loaded) {
    view.innerHTML = '<div class="scout-skeleton"><span class="dot"></span>Loading Scout · ' + phase.file + '…</div>';
  }
  showView(phase.view);

  try {
    const html = await loadScoutPanel(phase.file);
    if (!view.dataset.loaded) {
      view.innerHTML = html;
      view.dataset.loaded = '1';
      // Scroll the injected panel to top on first mount
      view.scrollTop = 0;
    }
  } catch (err) {
    view.innerHTML = '<div class="scout-skeleton" style="color:#B42318">Failed to load ' + phase.file + '.<br><small>' + (err && err.message) + '</small></div>';
  }
}

/* Shape-picker click handler for the inlined p1 landing. Phase 1 only wires
   the entry gesture: pick a shape → landing gracefully leaves and the header
   acknowledges the choice. The refinement chat / drafts / publish steps come
   in later phases of the port. */
function bindCreateCampaignLanding() {
  const view = document.getElementById('view-scout-p1');
  if (!view || view.dataset.landingBound) return;
  view.dataset.landingBound = '1';

  // The POC's inline shape-picker at #view-scout-p1 is superseded by the
  // intent-based landing that lives in designs/create-campaign.html. Any
  // click inside the view routes there — clicking a specific card passes
  // its key so the target can pre-commit that intent; clicking anywhere
  // else lands on the intent picker itself.
  view.addEventListener('click', (e) => {
    const card = e.target.closest('.cc-shape-card');
    if (card && view.contains(card)) {
      const shapeKey = card.dataset.shape || '';
      location.href = '../designs/create-campaign.html' +
        (shapeKey ? '?shape=' + encodeURIComponent(shapeKey) : '');
    }
  });
}

// Delegated CTA routing inside any injected scout panel.
// Uses button text + href hints in the designs/ files so we don't have to
// re-annotate the fetched HTML with data-goto attributes.
function bindScoutFlowRouting() {
  document.addEventListener('click', (e) => {
    const view = e.target.closest('.scout-view');
    if (!view) return;

    // Postrow kebab → open ddmenu (§3.16). Anchored near the button; items
    // route to Quick approve (opens .drawer) / Open in playground / Regenerate
    // this post / Remove from campaign. Handled first so the click doesn't
    // fall through to the row's data-goto routing.
    const kebab = e.target.closest('.postrow__kebab');
    if (kebab) {
      e.preventDefault();
      e.stopPropagation();
      openPostrowKebabMenu(kebab);
      return;
    }

    // Phase-2 tabs (Review Posts / Campaign Brief) — swap the active tab and
    // show the matching data-panel. Scoped to the current view so a click on
    // one panel's tab can't accidentally affect another view's tab group.
    const tab = e.target.closest('.p2-tab');
    if (tab && view.contains(tab)) {
      e.preventDefault();
      const key = tab.dataset.tab;
      if (!key) return;
      const group = tab.closest('.p2-tabs') || view;
      group.querySelectorAll('.p2-tab').forEach(t => {
        const on = t.dataset.tab === key;
        t.classList.toggle('p2-tab--active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      view.querySelectorAll('[data-panel]').forEach(p => {
        p.hidden = p.dataset.panel !== key;
      });
      return;
    }

    // Anchor tags with hrefs pointing to another design → intercept and route
    const a = e.target.closest('a[href]');
    if (a) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/([a-z0-9-]+)\.html$/i);
      if (m) {
        const targetFile = m[1];
        const phaseKey = Object.keys(SCOUT_PHASES).find(k => SCOUT_PHASES[k].file === targetFile);
        if (phaseKey) { e.preventDefault(); goToScout(phaseKey); return; }
        if (targetFile === 'index') { e.preventDefault(); goToCampaigns(); return; }
      }
    }

    // data-goto="./file.html" (set by scout-flow prototype JS on some CTAs)
    const goto = e.target.closest('[data-goto]');
    if (goto) {
      const href = goto.getAttribute('data-goto') || '';
      const m = href.match(/([a-z0-9-]+)\.html$/i);
      if (m) {
        const targetFile = m[1];
        const phaseKey = Object.keys(SCOUT_PHASES).find(k => SCOUT_PHASES[k].file === targetFile);
        if (phaseKey) { e.preventDefault(); goToScout(phaseKey); return; }
        if (targetFile === 'index') { e.preventDefault(); goToCampaigns(); return; }
      }
    }
  });
}

// Postrow kebab dropdown — anchored to the button, positioned in fixed coords
// so it floats above the scroll containers. Uses .ddmenu (§3.16). Single
// menu instance reused across clicks; outside click / Esc closes.
function openPostrowKebabMenu(kebab) {
  closePostrowKebabMenu();
  const postrow = kebab.closest('.postrow');
  const rect = kebab.getBoundingClientRect();
  const MENU_H_EST = 200;
  const MENU_W = 320;

  const menu = document.createElement('div');
  menu.className = 'ddmenu postrow-ddmenu';
  menu.setAttribute('role', 'menu');
  menu.style.position = 'fixed';
  // Flip above the kebab if opening below would clip below the viewport
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < MENU_H_EST + 12;
  menu.style.top = (openUp ? (rect.top - MENU_H_EST - 6) : (rect.bottom + 6)) + 'px';
  menu.style.left = Math.max(8, rect.right - MENU_W) + 'px';
  menu.style.zIndex = '1000';

  const items = [
    { label: 'Quick approve',        icon: 'i-file-check',      action: 'approve' },
    { label: 'Open in playground',   icon: 'i-columns',         action: 'playground' },
    { label: 'Regenerate this post', icon: 'i-sparkle',         action: 'regen' },
    { label: 'Remove from campaign', icon: 'i-x-square',        action: 'remove' },
  ];

  menu.innerHTML = items.map(it => (
    '<div class="ddmenu__item" data-action="' + it.action + '">' +
      '<div class="ddmenu__item-inner">' +
        '<span class="ddmenu__item-icon"><svg><use href="#' + it.icon + '"/></svg></span>' +
        '<span class="ddmenu__item-label">' + it.label + '</span>' +
      '</div>' +
    '</div>'
  )).join('');

  document.body.appendChild(menu);

  const onItemClick = (evt) => {
    const item = evt.target.closest('.ddmenu__item');
    if (!item) return;
    const action = item.dataset.action;
    closePostrowKebabMenu();
    if (action === 'approve') {
      const drawer = document.querySelector('.scout-view.view--active #approval-drawer, .scout-view .drawer');
      if (drawer) { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); }
      return;
    }
    if (action === 'playground') {
      goToScout('playground');
      return;
    }
    // regen + remove: no-op for the POC (would flash a toast in production)
  };
  menu.addEventListener('click', onItemClick);

  const onOutside = (evt) => {
    if (menu.contains(evt.target) || evt.target === kebab) return;
    closePostrowKebabMenu();
  };
  const onEsc = (evt) => { if (evt.key === 'Escape') closePostrowKebabMenu(); };
  setTimeout(() => {
    document.addEventListener('click', onOutside);
    document.addEventListener('keydown', onEsc);
  }, 0);

  menu._cleanup = () => {
    document.removeEventListener('click', onOutside);
    document.removeEventListener('keydown', onEsc);
  };
}

function closePostrowKebabMenu() {
  const existing = document.querySelector('.postrow-ddmenu');
  if (existing) {
    if (existing._cleanup) existing._cleanup();
    existing.remove();
  }
}

/* =========================================================================
   18. BOOT
   ========================================================================= */
function boot() {
  console.log('[Flagstaff] boot');
  bindDemoControls();
  bindSidebarNav();
  bindScoutFlowRouting();
  bindCreateCampaignLanding();
  setComposerEnabled(false);

  // Route boot by ?view= (campaigns, home, splash, conv) with campaigns as
  // the default. Other views remain reachable via the sidebar nav or the
  // demo controls (skip / restart) — the boot just picks the landing.
  const params = new URLSearchParams(location.search);
  const target = params.get('view');

  if (target === 'splash') {
    try { localStorage.removeItem(SPLASH_FLAG_KEY); } catch (e) {}
    setCrumbs(['Home', 'Onboarding']);
    showView('view-splash');
    setTimeout(() => runSplash(), 100);
    return;
  }
  if (target === 'conv') {
    try { localStorage.setItem(SPLASH_FLAG_KEY, '1'); } catch (e) {}
    setCrumbs(['Home', 'Onboarding', 'Conversation']);
    showView('view-conv');
    setTimeout(() => runConversation(), 200);
    return;
  }
  if (target === 'home') {
    goToHome();
    return;
  }
  if (target === 'create' || target === 'create-campaign') {
    // Entry point from the standalone campaigns dashboard: land on the
    // campaign creation flow (Scout · Phase 1 curated).
    goToScout('p1');
    return;
  }
  // Default: Campaigns dashboard.
  goToCampaigns();
}

// The script is at the end of <body> so DOMContentLoaded may have already
// fired by the time this runs. Handle both cases.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  // DOM already parsed — boot immediately.
  boot();
}
})();
