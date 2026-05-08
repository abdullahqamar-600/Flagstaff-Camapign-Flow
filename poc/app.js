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
  name: 'Tkxel',
  niche: 'Fashion / Heritage',
  industry: 'Heritage Fashion',
  products: ['Sindhi-embroidered tops', 'Kashmiri shawls', 'Modern kurtas'],
  positioning: 'Modern Gen Z take on traditional Pakistani crafts',
  themes: ['Heritage', 'Sustainability', 'Local artisanship'],
  tone: 'Casual, witty, culture-forward',
  websiteUrl: 'https://tkxel.com',
  competitorsDefault: ['@generation.pk', '@khaadiofficial', '@sapphirepakistan'],
  // X profile metadata (mirrors what Twitter exposes)
  handle: '@tkxel_official',
  displayName: 'Tkxel',
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
    { name: 'Behind-the-scenes artisan', engagement: 67 },
    { name: 'Styling guides',            engagement: 45 },
  ],
  primaryAudience:   'Women 22–34 · Pakistan & diaspora',
  secondaryAudience: 'Mothers and gift buyers · 35–50',
  peakActivity: 'Weekdays 2–4pm PKT',
  audienceDefault: 'Women 22–34 in Pakistan, the UAE, and the Pakistani diaspora, culturally curious, mobile-first, value heritage with a modern eye.',
  toneDirections: [
    {
      id: 'warm-story',
      label: 'Warm, story-led',
      sample: "Heritage isn't an aesthetic. It's a postcode and a person who can name the stitch. We learn first, then we make.",
    },
    {
      id: 'direct-candid',
      label: 'Direct, candid',
      sample: "We don't 'reinterpret tradition' — we work with people doing it now and we pay them properly. Everything else is marketing.",
    },
    {
      id: 'reverent-grounded',
      label: 'Reverent, grounded',
      sample: "Sindhi mirror work. Mid-century origins. Bibi taught us — she's been at it 31 years. Worth knowing whose hands made what you wear.",
    },
  ],
  trendGroups: [
    {
      id: 'heritage',
      theme: '#SouthAsianHeritageWeek',
      tone: 'Warm, story-led',
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
      theme: 'Behind-the-scenes craft',
      tone: 'Reverent, grounded',
      format: 'Single post + photo',
      signal: 'Saves > likes',
      summary: 'Workshop content gets craft questions; studio content gets price questions.',
    },
  ],
  postIterations: {
    heritage: [
      { id: 'a', angle: 'Personal story', body: "My nani's dupatta has stitches I can't name. This week I'm trying to learn them, properly. If you've got heritage you don't fully know, you're not alone — pull a thread, see what unspools." },
      { id: 'b', angle: 'Hot take',       body: "Half of what gets called 'heritage' on this app is aesthetics with no postcode. The actual craft has names, regions, and people still doing it for less than it's worth. Worth knowing the difference." },
      { id: 'c', angle: 'Data-driven',    body: "We pulled the numbers on our last 30 posts. The ones that named the artisan and the region got 3.8× the saves of pure product shots. Audiences want context, not catalog. #SouthAsianHeritageWeek" },
    ],
    founder: [
      { id: 'a', angle: 'Personal story', body: "Year one of running Tkxel: I underpaid myself, overpaid for marketing, and learned that the artisans we work with had been waiting twenty years for someone to put their names on the label. That last one is why we keep going." },
      { id: 'b', angle: 'Hot take',       body: "Founder transparency on this app is mostly performance. Real transparency is boring — this is what the cost breakdown looks like, this is what we got wrong last quarter, this is what we're still figuring out." },
      { id: 'c', angle: 'Data-driven',    body: "Posts where we share an honest founder note get 2.6× more replies than launch posts. Replies turn into customers at 4× the rate of likes. The lesson: stop polishing, start talking." },
    ],
    craft: [
      { id: 'a', angle: 'Personal story', body: "Spent the morning at Bibi's workshop in Hyderabad. She's been doing mirror work for 31 years. Her hands move faster than I can take notes. Some of what we sell started here — felt important to say." },
      { id: 'b', angle: 'Hot take',       body: "If your 'handcrafted' brand can't show you the hands, it isn't. The reason most heritage brands hide the workshop is that the workshop is the asset, not the boutique." },
      { id: 'c', angle: 'Data-driven',    body: "Workshop reels outperform studio reels 1.8× for us. The comment sentiment is different too — workshop content gets craft questions, studio content gets price questions. Tells you what your audience actually cares about." },
    ],
  },
};

const DEMO_INDIVIDUAL = {
  name: 'Abdullah Qamar',
  niche: 'Product design / Design systems',
  industry: 'Product Design',
  products: ['Practical design writing', 'Design-system templates', 'Office-hours mentoring'],
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
    { name: 'Design-system teardowns', engagement: 88 },
    { name: 'Honest takes',            engagement: 64 },
    { name: 'Career advice threads',   engagement: 41 },
  ],
  primaryAudience:   'Designers · PMs · 25–40',
  secondaryAudience: 'Founders / heads of product at early-stage startups',
  peakActivity: 'Weekday mornings PKT',
  audienceDefault: 'Designers and PMs 25–40, mid-level, building craft and reputation. Mostly North America and South Asia, mobile-first, save things for later.',
  toneDirections: [
    {
      id: 'direct-generous',
      label: 'Direct, generous',
      sample: "Most design-system posts skip the part that matters — adoption. Token tables are easy. Getting a PM to ship without DM-ing a designer is hard.",
    },
    {
      id: 'confessional-specific',
      label: 'Confessional, specific',
      sample: "Shipped a design system once. Engineers ignored it for six months. The fix: I'd built the wrong primitive. Lesson learned twice.",
    },
    {
      id: 'sharp-contrarian',
      label: 'Sharp, contrarian',
      sample: "'AI replaces designers' is a take from people who don't ship. The real question is which 30% of the job goes first — and whether you're spending 30% of your time there.",
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
      theme: 'Design-system teardowns',
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
      { id: 'c', angle: 'Data-driven',    body: "Looked at engagement on AI-tool posts in our niche over 90 days. Nuanced takes (specific tool, specific task, specific tradeoff) outperform 'AI is great/bad' posts by 5.6× on saves. Specifics win." },
    ],
    'system-teardowns': [
      { id: 'a', angle: 'Personal story', body: "First time I shipped a design system, I optimized the wrong thing for six months. I made the buttons perfect. Nobody used the buttons. The thing engineering needed was a layout primitive I hadn't built. Lesson learned twice." },
      { id: 'b', angle: 'Hot take',       body: "Most design-system posts on here are screenshots of token tables. Tokens aren't the system. The system is whether a PM can ship a feature without DM'ing a designer at 6pm. Measure that." },
      { id: 'c', angle: 'Data-driven',    body: "Audit of 12 internal design systems I've worked on: the ones that got adopted shared one trait — they shipped one usable component before they had a doc site. The ones with great docs and no early component sat unused. Component first, doc second." },
    ],
    'public-work': [
      { id: 'a', angle: 'Personal story', body: "Office hours this Friday. Four free 30-minute slots for designers stuck on a system decision. I'll learn something too — half the time the question reframes how I'd answer it. Reply if you want one." },
      { id: 'b', angle: 'Hot take',       body: "Building in public on this app has become its own genre, and most of it is the same three updates dressed differently. If you want it to land, share the decision you got wrong, not the dashboard going up and to the right." },
      { id: 'c', angle: 'Data-driven',    body: "Posts where I share something I got wrong get 2.4× the reply rate of posts where I share what worked. Replies become DMs become consulting calls. The 'wrong' content is the funnel." },
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
  await sleep(beat);
  return typingNode;
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

function quickReplies(options, { primaryIndex = -1 } = {}) {
  return new Promise((resolve) => {
    const wrap = el('div', { class: 'qreplies' });
    options.forEach((opt, i) => {
      const btn = el('button', {
        class: 'qreply' + (i === primaryIndex ? ' qreply--primary' : ''),
        onclick: () => {
          // Selected pill stays in the chat as the user's "answer".
          // Unselected pills are removed so the row reads as a record.
          Array.from(wrap.children).forEach((c) => {
            if (c !== btn) c.remove();
          });
          btn.classList.add('qreply--chosen');
          btn.disabled = true;
          wrap.classList.add('qreplies--chosen');
          resolve(opt);
        },
      }, opt);
      wrap.appendChild(btn);
    });
    append(wrap);
  });
}

function selectionChips(options, { allowCustom = false, customLabel = 'Something else' } = {}) {
  return new Promise((resolve) => {
    const selected = new Set();
    const wrap = el('div', { class: 'chips' });
    const allOptions = [...options];
    if (allowCustom) allOptions.push(customLabel);

    allOptions.forEach((opt) => {
      const isCustom = allowCustom && opt === customLabel;
      const btn = el('button', {
        class: 'chip' + (isCustom ? ' chip--custom' : ''),
        'aria-pressed': 'false',
        onclick: async () => {
          if (isCustom) {
            // Don't toggle; open inline text input
            const customText = await inlineTextInput({ placeholder: 'Type your custom goal…', submitLabel: 'Add' });
            if (customText) {
              selected.add(customText);
              const tag = el('button', {
                class: 'chip',
                'aria-pressed': 'true',
              }, customText);
              wrap.insertBefore(tag, btn);
              done.disabled = false;
            }
            return;
          }
          const on = btn.getAttribute('aria-pressed') === 'true';
          btn.setAttribute('aria-pressed', String(!on));
          on ? selected.delete(opt) : selected.add(opt);
          done.disabled = selected.size === 0;
        },
      }, opt);
      wrap.appendChild(btn);
    });

    const done = el('button', {
      class: 'qreply qreply--primary chips__done',
      disabled: 'true',
      onclick: () => {
        if (selected.size === 0) return;
        const list = Array.from(selected);
        // Drop the unselected chips; freeze the selected ones in place.
        Array.from(wrap.children).forEach((chip) => {
          if (chip.getAttribute('aria-pressed') !== 'true') chip.remove();
        });
        Array.from(wrap.children).forEach((chip) => {
          chip.disabled = true;
          chip.classList.add('chip--chosen');
        });
        wrap.classList.add('chips--chosen');
        doneRow.remove();
        resolve(list);
      },
    }, 'Done');
    const doneRow = el('div', { class: 'qreplies' }, [done]);
    append(wrap);
    append(doneRow);
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
  // Single hero merging the start prompt and the greeting/profile selection.
  // The logo lands once and stays put through the transition; only the hook
  // content (title + sub + Start) swaps for the greeting + profile blocks.
  const hero = buildHero();
  $('.conv').prepend(hero);
  document.body.classList.add('mode-hero');

  const logoStage = hero.querySelector('.hero__mark');
  const hookStage = hero.querySelector('.hero__hook');
  const titleEl   = hero.querySelector('.hero__title');
  const subEl     = hero.querySelector('.hero__sub');
  const greet     = {
    title:    hero.querySelector('.hero__title'),
    sub:      hero.querySelector('.hero__sub'),
    question: hero.querySelector('.hero__question'),
    blocks:   hero.querySelector('.hero__blocks'),
  };

  // Beat 0: logo lands (and stays for the rest of the hero).
  await sleep(120);
  logoStage.classList.add('hero__stage--in');
  await sleep(500);

  // Beat 1: hook content reveals (title + sub + Start). Wait for click.
  hookStage.classList.add('hero__stage--in');

  await new Promise((resolve) => {
    hero.querySelector('.hero__cta').addEventListener('click', resolve, { once: true });
  });

  // Hook content exits; logo stays put.
  hookStage.classList.remove('hero__stage--in');
  hookStage.classList.add('hero__stage--out');
  await sleep(360);

  // Beat 2: "Hi, [Name]."
  greet.title.classList.add('hero__stage--in');
  await typewriterInto(titleEl, `Hi, ${state.user.name}.`, 55);
  await sleep(600);

  // Beat 3: "I'm Scout."
  greet.sub.classList.add('hero__stage--in');
  await typewriterInto(subEl, "I'm Scout.", 55);
  await sleep(800);

  // Beat 4: question line.
  greet.question.classList.add('hero__stage--in');
  await sleep(500);

  // Beat 5: profile-type blocks; wait for click before exiting.
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
  // Two beats, one hero. Logo persists. Hook + greeting share the SAME slot
  // (grid-stacked) so the title transition happens in place, not "above"
  // and "below". Hook sits above greet in the stacking order; on Start
  // click hook fades out and greet stages reveal in the same position.
  return el('div', { class: 'hero', id: 'hero' }, [
    el('div', { class: 'hero__inner' }, [
      el('div', {
        class: 'hero__mark hero__stage',
        html: '<svg width="44" height="44" style="color: var(--primary);"><use href="#i-logo"/></svg>',
      }),
      el('div', { class: 'hero__slot' }, [
        // Greet (under-layer) — children animate independently.
        el('div', { class: 'hero__greet' }, [
          el('h1', { class: 'hero__title hero__stage' }),
          el('p',  { class: 'hero__sub hero__stage' }),
          el('div', { class: 'hero__question hero__stage' }, "Tell me who I'm setting up for."),
          el('div', { class: 'hero__blocks hero__stage' }, [
            heroBlock('individual', 'i-individual', 'Individual', 'Solo creator, freelancer, or thought leader'),
            heroBlock('brand',      'i-brand',      'Brand',      'Company, agency, or multi-product brand'),
          ]),
        ]),
        // Hook (over-layer) — full content + Start.
        el('div', { class: 'hero__hook hero__stage' }, [
          el('h1', { class: 'hero__hook-title' }, "Let's craft your first post."),
          el('p',  { class: 'hero__hook-sub' },
            "Five minutes with Scout and you'll have something worth publishing, built from your voice, your audience, and what's working in your niche right now.",
          ),
          el('button', { class: 'hero__cta', type: 'button' }, [
            el('span', {}, 'Start'),
            el('span', { html: icon('i-arrow-right') }),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function heroBlock(acct, iconId, label, desc) {
  return el('button', {
    class: 'hero-block',
    'data-acct': acct,
    'data-picked': 'false',
  }, [
    el('div', { class: 'hero-block__icon', html: icon(iconId) }),
    el('div', { class: 'hero-block__label' }, label),
    el('div', { class: 'hero-block__desc' }, desc),
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
async function narratedProcess(_label, lines, { lineBeat = 1100, exitBeat = 280, _finalBeat = 0 } = {}) {
  const slot = el('div', { class: 'proc-line' });
  append(slot);

  const normalize = (l) => (typeof l === 'string' ? { icon: 'i-sparkle', text: l } : l);

  for (let i = 0; i < lines.length; i++) {
    const { icon: iconId, text } = normalize(lines[i]);

    // Fade out the current pointer (if any) before swapping content
    if (slot.firstChild) {
      slot.firstChild.classList.add('proc-line__pointer--exit');
      await sleep(exitBeat);
      slot.innerHTML = '';
    }

    const pointer = el('div', { class: 'proc-line__pointer' }, [
      el('span', { class: 'proc-line__icon', html: icon(iconId) }),
      el('span', { class: 'proc-line__text' }, text),
    ]);
    slot.appendChild(pointer);
    scrollDown();

    await sleep(lineBeat);
  }

  // Fade out the last pointer and remove the slot entirely
  if (slot.firstChild) {
    slot.firstChild.classList.add('proc-line__pointer--exit');
    await sleep(exitBeat);
  }
  slot.remove();
  return null;
}

/* =========================================================================
   6. CONFIRMATION CARD with INLINE EDIT
   ========================================================================= */
function confirmationCard({ title, rows, primary = 'Looks right', secondary = 'Edit', onEditField } = {}) {
  return new Promise((resolve) => {
    const rowEls = rows.map(([label, value, key]) => makeConfRow(label, value, key, onEditField));

    const card = el('div', { class: 'conf' }, [
      el('div', { class: 'conf__title' }, [
        el('div', { class: 'conf__title-left' }, [
          el('span', { class: 'conf__title-mark', html: icon('i-logo') }),
          document.createTextNode(title),
        ]),
      ]),
      el('div', { class: 'conf__rows' }, rowEls),
      el('div', { class: 'conf__actions' }, [
        el('button', { class: 'btn-ghost', onclick: () => { /* edit hint */ } }, secondary + ' fields above'),
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
          el('span', { class: 'conf__title-mark', html: icon('i-logo') }),
          document.createTextNode('Brand knowledge structure'),
        ]),
      ]),
      el('div', { class: 'pl-tree__master' }, [
        el('div', { class: 'pl-tree__master-label' }, 'MASTER BRAND'),
        el('div', { class: 'pl-tree__master-name' }, state.brand.name),
      ]),
      el('div', { class: 'pl-tree__items' }, items),
      el('div', { class: 'conf__actions' }, [
        el('button', { class: 'btn-ghost', onclick: () => {} }, 'Edit lines'),
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
        onclick: isActive
          ? () => { card.remove(); resolve('connect'); }
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
          onclick: () => { card.remove(); userMsg('Skip for now'); resolve('skip'); },
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
  // Edge-to-edge card. Banner runs flush to the rounded corners; the avatar
  // overlaps the banner/content boundary, like Twitter's own profile UI.
  const verifiedBadge = profile.verified
    ? el('span', { class: 'preview__verified', 'aria-label': 'Verified', html: icon('i-check') })
    : null;

  const topTopicEls = (profile.topTopics || []).map(t => el('div', { class: 'topic-bar' }, [
    el('div', { class: 'topic-bar__row' }, [
      el('span', { class: 'topic-bar__name' }, t.name),
      el('span', { class: 'topic-bar__pct' }, `+${t.engagement}%`),
    ]),
    el('div', { class: 'topic-bar__track' }, [
      el('div', { class: 'topic-bar__fill', style: `width: ${Math.min(100, t.engagement)}%;` }),
    ]),
  ]));

  const card = el('div', { class: 'preview preview--full' }, [
    el('div', { class: 'preview__banner' }),
    el('div', { class: 'preview__identity' }, [
      el('div', { class: 'preview__avatar' }),
      el('div', { class: 'preview__name-row' }, [
        el('div', { class: 'preview__name' }, [
          document.createTextNode(profile.displayName || profile.name),
          verifiedBadge,
        ]),
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
      stat(profile.following, 'Following'),
      stat(profile.followers, 'Followers'),
      stat(profile.postCount, 'Posts'),
    ]),
    el('div', { class: 'preview__divider' }),
    el('div', { class: 'preview__section' }, [
      el('div', { class: 'preview__section-title' }, 'Industry'),
      el('div', { class: 'preview__industry' }, profile.industry),
    ]),
    el('div', { class: 'preview__divider' }),
    el('div', { class: 'preview__section' }, [
      el('div', { class: 'preview__section-title' }, 'Top performing topics'),
      el('div', { class: 'topic-bars' }, topTopicEls),
    ]),
    el('div', { class: 'preview__divider' }),
    el('div', { class: 'preview__section' }, [
      el('div', { class: 'preview__audience-grid' }, [
        el('div', {}, [
          el('div', { class: 'preview__section-title' }, 'Primary audience'),
          el('div', { class: 'preview__audience-text' }, profile.primaryAudience),
        ]),
        el('div', {}, [
          el('div', { class: 'preview__section-title' }, 'Secondary audience'),
          el('div', { class: 'preview__audience-text' }, profile.secondaryAudience),
        ]),
      ]),
    ]),
    el('div', { class: 'preview__divider' }),
    el('div', { class: 'preview__section' }, [
      el('div', { class: 'preview__section-title' }, 'Peak activity'),
      el('div', { class: 'preview__industry' }, profile.peakActivity),
    ]),
  ]);
  append(card);
}

function stat(value, label) {
  return el('div', { class: 'preview__stat' }, [
    el('div', { class: 'preview__stat-value' }, value || '—'),
    el('div', { class: 'preview__stat-label' }, label),
  ]);
}

function xProfilePreviewEmpty(profile) {
  const card = el('div', { class: 'preview preview--empty' }, [
    el('div', { class: 'preview__banner' }),
    el('div', { class: 'preview__identity' }, [
      el('div', { class: 'preview__avatar' }),
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
      stat(profile.following || '—',  'Following'),
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
function kv(label, val) {
  return el('div', { class: 'kv' }, [
    el('div', { class: 'kv__label' }, label),
    el('div', { class: 'kv__val' }, val),
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
function successPostTeaser() {
  const card = el('div', { class: 'success-post' }, [
    el('div', { class: 'success-post__head' }, [
      el('div', { class: 'success-post__avatar' }),
      el('div', { class: 'success-post__id' }, [
        el('div', { class: 'success-post__name-row' }, [
          el('span', { class: 'success-post__name' }, 'a brand like yours'),
          el('span', { class: 'success-post__verified', html: icon('i-check') }),
        ]),
        el('div', { class: 'success-post__handle' }, '@on_flagstaff · 2d'),
      ]),
      el('span', { class: 'success-post__badge' }, [
        el('span', { class: 'success-post__badge-icon', html: icon('i-fire') }),
        document.createTextNode('Hit'),
      ]),
    ]),
    el('div', { class: 'success-post__body' },
      'Most "heritage" fashion isn\'t. Short thread on why the embroidery on your kurta probably has a postal code, and why that matters.'),
    el('div', { class: 'success-post__media' }, [
      el('span', { class: 'success-post__media-overlay' }, '↑ 4.2× expected reach'),
    ]),
    el('div', { class: 'success-post__metrics' }, [
      successMetric('i-reply',    '892',    'replies'),
      successMetric('i-repost',   '1.2k',   'reposts'),
      successMetric('i-heart',    '12.4k',  'likes'),
      successMetric('i-bookmark', '3.8k',   'bookmarks'),
    ]),
    el('div', { class: 'success-post__footer' },
      'Outperforming 94% of posts in this niche this week.'),
  ]);
  append(card);
  return card;
}

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
    ['i-people','Audience pattern',                   'Your demographic bookmarks heritage-explained posts at 3× the niche average. Education plus aesthetic is the unlock.'],
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
    // subtle, no flash.
    if (isActive && !isExpanded) {
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

function confirmKBBlock(id) {
  // Auto-expand a block, surface action buttons, resolve on user click.
  return new Promise((resolve) => {
    ['brand', 'trending', 'algorithm'].forEach(k => state.kb[k].expanded = false);
    state.kb[id].expanded = true;
    state.kb.actionCallback = (result) => {
      state.kb.actionCallback = null;
      state.kb[id].expanded = false;
      renderKB();
      resolve(result);
    };
    renderKB();
  });
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

function setActiveKB(kbId) {
  if (!state.kb[kbId]) return;
  state.kb.activeId = kbId;
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
    { handle: '@tkxel_official', body: "Heritage isn't an aesthetic. It's a postcode and a person who can name the stitch." },
    { handle: '@tkxel_official', body: "Bibi taught us mirror work in Hyderabad. 31 years, hands faster than my notes." },
    { handle: '@tkxel_official', body: "Workshop reels outperform studio reels 1.8× for us. Tells you what your audience wants." },
  ] : [
    { handle: '@aqamar', body: "Most design-system posts skip the part that matters: adoption. Token tables are easy." },
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
    { icon: 'i-people', label: 'Audience',  value: 'Women 22–34 · Pakistan' },
    { icon: 'i-cal',    label: 'Duration',  value: '12 days · Heritage Week' },
    { icon: 'i-chat',   label: 'Posts',     value: '9 scheduled · 3 angles' },
  ] : [
    { icon: 'i-trend',  label: 'Goals',     value: 'Thought leadership · Leads' },
    { icon: 'i-people', label: 'Audience',  value: 'Designers & PMs · 25–40' },
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
      document.createTextNode('Scout · multi-post planning'),
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
    ? { window: '2–4pm PKT', detail: 'In 3 hours · weekday peak' }
    : { window: '9–11am PKT', detail: 'Tomorrow morning · global window' };
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

  const ack = state.accountType === 'brand'
    ? "Got it. Let's get your first post out together — about five minutes."
    : `Got it, ${state.user.name}. Let's get your first post out together — about five minutes.`;
  await scoutMsg(ack, { typingFor: 900, beat: 400 });
}

async function step3_product_lines_brand_only() {
  if (state.accountType !== 'brand') return;
  await scoutMsg(
    "One important question. Does Tkxel have distinct product lines that should speak to different audiences? " +
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
    "Three lines: Heritage Capsule (occasion-wear, women 28–40, formal heritage), " +
    "Everyday Edit (modern kurtas and tops, women 22–34, casual), " +
    "Atelier (limited-run statement pieces, collectors and gift buyers, premium)."
  );

  state.productLines = [
    { name: 'Heritage Capsule', audience: 'Women 28–40, occasion-led', tone: 'Reverent, refined' },
    { name: 'Everyday Edit',    audience: 'Women 22–34, daily wear',   tone: 'Casual, witty' },
    { name: 'Atelier',          audience: 'Collectors, gift buyers',   tone: 'Considered, premium' },
  ];

  await narratedProcess('Building your product-line contexts', [
    { icon: 'i-grid',    text: 'Creating Heritage Capsule context. Separate audience, tone variant.' },
    { icon: 'i-grid',    text: 'Creating Everyday Edit context. Inherits master voice with a casual lift.' },
    { icon: 'i-grid',    text: 'Creating Atelier context. Premium register, lower posting frequency.' },
    { icon: 'i-link',    text: 'Wiring each line to the master brand identity.' },
  ], { lineBeat: 900 });

  await scoutMsg("Here's how the structure looks, edit if anything's off.", { typingFor: 600, beat: 400 });
  await productLineTreeCard(state.productLines);

  // Each product line becomes a fact in the Product KB
  state.productLines.forEach(l => addKBFact('brand', l.name, `${l.audience} · ${l.tone}`));
}

async function step4_goals() {
  // Goals as frame-setter — runs before any account scan so Scout reads
  // everything that follows through the lens of what the user is trying to
  // achieve. Short copy, no upfront KPI dump (that surfaces later when it's
  // useful).
  await scoutMsg(
    "Before I dig in, what are you trying to achieve on X? Pick what matters most.",
    { typingFor: 900, beat: 300 }
  );
  state.goals = await selectionChips([
    'Grow audience', 'Drive traffic to site', 'Build thought leadership',
    'Boost sales', 'Increase brand awareness', 'Generate leads',
  ]);

  const headline = state.goals.slice(0, 2).join(' and ') + (state.goals.length > 2 ? ' (and more)' : '');
  await scoutMsg(
    `Got it, ${headline}. I'll read everything that follows through that lens.`,
    { typingFor: 800, beat: 400 }
  );
  addKBFact('brand', 'Goals', state.goals.join(', '));
}

async function step5_x_connect() {
  await scoutMsg(
    "First step — connect the account where you publish. I'll read what's working and build from there.",
    { typingFor: 1100, beat: 500 }
  );
  const result = await connectSocial();

  if (result === 'skip') {
    state.skipped.add('x-connect');
    await scoutMsg(
      "No problem. Without account data the best way to get me up to speed is for you to share what you've got. The chat below takes website links, brand docs, or just a description in your own words.",
      { typingFor: 1300, beat: 500 }
    );
    return 'skipped-entirely';
  }

  // OAuth simulation. After Authorize, the user-side message ("Authorized X")
  // posts — never on the platform-pick click, since that just opens the modal.
  await fakeOAuthModal();
  userMsg('Authorized X');

  await scoutMsg(
    "Connected. Reading your account now.",
    { typingFor: 700, beat: 400 }
  );
  return 'connected-scan';
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
      "Your account is fresh, so I don't have engagement data yet. I'll lean on your brand context, niche trends, and the signals around your account until we build your own performance history.",
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
        : 'Following list confirms positioning in the design-craft community.' },
    ]);
    await scoutMsg("Got a clear picture. Here's what stands out:", { typingFor: 600, beat: 400 });
    xProfilePreview(buildProfileSummary());
  }
  // Seed Main KB with what we just learned from the scan
  addKBFact('brand', 'Handle',     state.brand.handle);
  addKBFact('brand', 'Followers',  state.brand.followers);
  if (!isNew) {
    addKBFact('brand', 'Best format', state.accountType === 'brand' ? 'Image threads' : 'Threads with screenshots');
    addKBFact('brand', 'Peak activity', state.accountType === 'brand' ? '2–4pm PKT' : '9–11am PKT');
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

// FIRST major proposal: bundles identity + tone signals into a single
// confirmation card. The user reacts to one rich surface, edits inline,
// then approves. Replaces the old stepIndustryConfirm + step9_tone split.
async function step_knowledge_confirm() {
  await scoutMsg(
    "Here's the read. Edit anything that's off, then sign off.",
    { typingFor: 900, beat: 400 }
  );

  const isBrand = state.accountType === 'brand';
  const rows = [
    ['Name',        state.brand.name,                    'name'],
    ['Niche',       state.brand.niche,                   'niche'],
    ['Positioning', state.brand.positioning,             'positioning'],
    ['Audience',    state.audience,                      'audience'],
    ['Themes',      state.brand.themes,                  'themes'],
  ];
  if (isBrand) rows.push(['Products', state.brand.products, 'products']);

  await confirmationCard({
    title: isBrand ? 'How I read your brand' : 'How I read you',
    rows,
    onEditField: (key, val) => {
      if (key === 'audience') state.audience = val;
      else if (key === 'themes') state.brand.themes = (typeof val === 'string') ? val.split(/[·,]/).map(s => s.trim()).filter(Boolean) : val;
      else if (key === 'products') state.brand.products = val;
      else state.brand[key] = val;
    },
  });

  addKBFact('brand', 'Niche',    state.brand.niche);
  addKBFact('brand', 'Audience', state.audience);
  addKBFact('brand', 'Themes',   state.brand.themes.join(', '));
  if (isBrand) addKBFact('brand', 'Products', state.brand.products.join(', '));
}

// Tone/voice as its own beat: 3 editable cards, each a sample post in a
// different voice. User can rewrite the sample, then picks the one that
// sounds like them. Selected card sets state.tone (label) and state.toneSample
// (the chosen text).
async function step_tone_voice() {
  const directions = state.brand.toneDirections || [];
  if (!directions.length) return;

  await scoutMsg(
    "Three voices I could write you in. Edit any of them so it sounds like you, then pick one.",
    { typingFor: 1100, beat: 500 }
  );

  await new Promise((resolve) => {
    const list = el('div', { class: 'tone-list' });

    directions.forEach((d) => {
      const ta = el('textarea', { class: 'tone-card__text', rows: '3' }, d.sample);

      const pickBtn = el('button', { class: 'btn-primary tone-card__pick' }, 'Pick this voice');
      const card = el('div', { class: 'tone-card' }, [
        el('div', { class: 'tone-card__head' }, [
          el('span', { class: 'tone-card__label' }, d.label),
        ]),
        ta,
        el('div', { class: 'tone-card__actions' }, [pickBtn]),
      ]);

      pickBtn.addEventListener('click', () => {
        const text = ta.value.trim() || d.sample;
        state.tone = d.label;
        state.brand.tone = d.label;
        state.toneSample = text;
        // Freeze the chosen card in the chat; drop the others.
        Array.from(list.children).forEach((c) => {
          if (c !== card) c.remove();
        });
        ta.value = text;
        ta.readOnly = true;
        card.querySelector('.tone-card__actions')?.remove();
        card.classList.add('tone-card--chosen');
        list.classList.add('tone-list--chosen');
        addKBFact('brand', 'Tone', d.label);
        (async () => {
          await scoutMsg("Got it. Calibrating to that voice.", { typingFor: 700, beat: 400 });
          resolve();
        })();
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
    { icon: 'i-search', text: 'Searching design-craft and product-design conversations on X.' },
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
    addKBFact('trending', 'Peak window',   'Weekdays 1–4pm PKT');
  } else {
    addKBFact('trending', 'Top trend',     'AI design tooling debate');
    addKBFact('trending', 'Competitors',   '@brian_lovin · @mds · @rauchg');
    addKBFact('trending', 'Peak window',   'Weekday mornings PKT');
  }
  await sleep(1400);
}

// SECOND major proposal: three trend groups, each bundling theme + tone +
// format. User picks one to ride.
async function step_trend_groups() {
  const groups = (state.brand.trendGroups || []).slice(0, 3);
  if (!groups.length) {
    console.warn('No trendGroups defined for persona; skipping step_trend_groups.');
    return;
  }

  await scoutMsg(
    "Three angles standing out in your niche right now. Each one bundles a tone and a format I'd recommend. Pick the one you want to ride and I'll draft posts.",
    { typingFor: 1200, beat: 500 }
  );

  return new Promise((resolve) => {
    const list = el('div', { class: 'trend-group-list' });

    groups.forEach((g) => {
      const card = el('button', {
        class: 'trend-group-card',
        onclick: () => {
          state.selectedTrendGroupId = g.id;
          // Keep the picked card; drop the others.
          Array.from(list.children).forEach((c) => {
            if (c !== card) c.remove();
          });
          card.classList.add('trend-group-card--chosen');
          card.disabled = true;
          list.classList.add('trend-group-list--chosen');
          addKBFact('trending', 'Selected angle', g.theme);
          (async () => {
            await scoutMsg(`Good pick. Drafting three angles on ${g.theme}.`, { typingFor: 700, beat: 400 });
            resolve(g.id);
          })();
        },
      }, [
        el('div', { class: 'trend-group-card__head' }, [
          el('span', { class: 'trend-group-card__icon', html: icon('i-fire') }),
          el('span', { class: 'trend-group-card__theme' }, g.theme),
          el('span', { class: 'trend-group-card__signal' }, g.signal || ''),
        ]),
        g.summary ? el('div', { class: 'trend-group-card__summary' }, g.summary) : null,
        el('div', { class: 'trend-group-card__chips' }, [
          el('span', { class: 'trend-group-card__chip trend-group-card__chip--tone' }, [
            el('span', { class: 'trend-group-card__chip-label' }, 'Tone'),
            document.createTextNode(g.tone),
          ]),
          el('span', { class: 'trend-group-card__chip trend-group-card__chip--format' }, [
            el('span', { class: 'trend-group-card__chip-label' }, 'Format'),
            document.createTextNode(g.format),
          ]),
        ]),
      ]);
      list.appendChild(card);
    });

    append(list);
  });
}

// THIRD major proposal: three drafted posts on the selected trend group,
// same format, three different angles. User picks one to edit and publish.
async function step_post_iterations() {
  const groupId = state.selectedTrendGroupId;
  const iterations = (state.brand.postIterations && state.brand.postIterations[groupId]) || [];
  if (!iterations.length) {
    console.warn('No postIterations defined for selected trend group; skipping step_post_iterations.');
    return;
  }

  await narratedProcess('Drafting three angles', [
    { icon: 'i-quote',   text: 'Pulling from your voice and audience signals.' },
    { icon: 'i-sparkle', text: 'Writing angle one — personal story.' },
    { icon: 'i-sparkle', text: 'Writing angle two — hot take.' },
    { icon: 'i-sparkle', text: 'Writing angle three — data-driven.' },
  ], { lineBeat: 800 });

  await scoutMsg(
    "Three angles on the same idea. Pick the one that sounds like you — you can edit it next.",
    { typingFor: 900, beat: 400 }
  );

  return new Promise((resolve) => {
    const list = el('div', { class: 'iteration-list' });

    iterations.forEach((it) => {
      const card = el('button', {
        class: 'iteration-card',
        onclick: () => {
          state.selectedIterationId = it.id;
          state.draftPost = it.body;
          // Keep the chosen iteration; drop the rest.
          Array.from(list.children).forEach((c) => {
            if (c !== card) c.remove();
          });
          card.classList.add('iteration-card--chosen');
          card.disabled = true;
          list.classList.add('iteration-list--chosen');
          resolve(it.id);
        },
      }, [
        el('div', { class: 'iteration-card__head' }, [
          el('div', { class: 'iteration-card__avatar' }),
          el('div', { class: 'iteration-card__id' }, [
            el('div', { class: 'iteration-card__name-row' }, [
              el('span', { class: 'iteration-card__name' }, state.brand.displayName || state.brand.name),
              state.brand.verified ? el('span', { class: 'iteration-card__verified', html: icon('i-check') }) : null,
            ]),
            el('div', { class: 'iteration-card__handle' }, state.brand.handle || ''),
          ]),
          el('span', { class: 'iteration-card__angle' }, it.angle),
        ]),
        el('div', { class: 'iteration-card__body' }, it.body),
        el('div', { class: 'iteration-card__select' }, 'Pick this one →'),
      ]);
      list.appendChild(card);
    });

    append(list);
  });
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
  const card = el('div', { class: 'success-post success-post--published' }, [
    el('div', { class: 'success-post__head' }, [
      el('div', { class: 'success-post__avatar' }),
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

async function step13_handoff() {
  const lead = state.publishedPost
    ? `Your first post is live, ${state.user.name}. The dashboard tracks it from here — drafts, trends, and what's working all sit there.`
    : `Everything's set, ${state.user.name}. The dashboard is where you'll work from here.`;
  await scoutMsg(lead, { typingFor: 1200, beat: 700 });
  await sleep(1100);
  enterApp();
}

function enterApp() {
  document.body.classList.remove('mode-onboarding');
  document.body.classList.add('mode-app');
  setCrumbs(['Home']);

  // Reflect the captured name in the profile chip, no name = no chip name
  const chipName = $('.profile-chip__name');
  if (chipName) chipName.textContent = state.user.name || 'Guest';

  renderDashboard();
  showView('view-dash');
}

/* =========================================================================
   15. CONVERSATION ROUTER
   ========================================================================= */
async function runConversation() {
  if (stream.dataset.started === '1') return;
  stream.dataset.started = '1';

  // Act 1 — Greet and connect.
  await step1_opening();                                      // hero + accountType ack

  const xPath = await step5_x_connect();                      // connect → OAuth (or skip)
  if (xPath === 'connected-scan') {
    await step6_profile_scan();                               // narrate scan + show preview
  }

  // Act 2 — Materials and the FIRST major proposal.
  await stepMaterials();                                      // website / docs / verbal
  await step_knowledge_confirm();                             // identity confirm (sans tone)
  await step_tone_voice();                                    // tone-direction card pick

  // Act 3 — Topics/products + goals.
  if (state.accountType === 'brand') await step3_product_lines_brand_only();
  else                               await step_topics_individual();
  await step4_goals();

  // Act 4 — Market scan, SECOND proposal (trend groups), THIRD proposal (post iterations), publish.
  await step7_intel_scan();
  await step_trend_groups();
  await step_post_iterations();
  await step_edit_publish();

  // Act 5 — Hand off to dashboard.
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
   18. BOOT
   ========================================================================= */
function boot() {
  bindDemoControls();
  setCrumbs(['Home', 'Onboarding', 'Conversation']);
  setComposerEnabled(false);

  // The conversation view owns everything from the start hook through to
  // handoff. The hero opens with the start prompt; clicking Start advances
  // to the greeting + profile selection. KB blocks render only after the
  // user picks Individual / Brand, since they're persona-specific.
  showView('view-conv');
  setTimeout(() => runConversation(), 200);
}

document.addEventListener('DOMContentLoaded', boot);
})();
