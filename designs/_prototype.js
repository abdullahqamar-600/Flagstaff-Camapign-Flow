/* =========================================================================
   Prototype-mode wiring — loaded alongside every design page.
   - Injects the floating "Scout flow" mini-menu
   - Turns the icon-only sidebar into working navigation
   - Enables generic click-to-navigate via any [data-goto] attribute
   - Enables generic "go back" via any [data-back] attribute
   - Adds a small "Prototype" pill so the demo state is legible
   ========================================================================= */

(function () {
  'use strict';

  // ---- 1. Routing table ---------------------------------------------------
  // Sidebar buttons carry a `title` attribute. Map those titles to a design.
  // Only Campaigns is live — everything else is parked (null = no nav).
  var SIDEBAR_MAP = {
    'Home':      null,
    'Scout':     null,
    'Campaigns': './index.html',
    'Scheduler': null,
    'Analytics': null,
    'Search':    null,
    'Settings':  null
  };

  // The active flow — dashboard + campaign creation.
  var FLOW = [
    { code: 'P0', label: 'Campaigns dashboard', file: 'index.html' },
    { code: 'P1', label: 'Create campaign',     file: 'create-campaign.html' }
  ];
  var CROSS = [];

  var currentFile = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // ---- 2. Sidebar wiring --------------------------------------------------
  // Skip buttons that carry `data-nav` — those are self-managed by the page
  // (e.g. create-campaign.html routes them back into ../poc/index.html).
  // If we bound our own handler on top, both would fire and the last
  // location.href assignment would win — landing users on the old
  // designs/index.html dashboard instead of the POC one.
  Array.prototype.forEach.call(document.querySelectorAll('.sidebar__btn'), function (btn) {
    if (btn.hasAttribute('data-nav')) return;
    var title = btn.getAttribute('title');
    var href = SIDEBAR_MAP[title];
    if (!href) return;
    btn.addEventListener('click', function () { window.location.href = href; });
  });

  // ---- 3. Mini-menu injection --------------------------------------------
  function icon(pathHtml) {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + pathHtml + '</svg>';
  }
  var arrowSvg = icon('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>');
  var gridSvg  = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';

  function renderLinks(list) {
    return list.map(function (item) {
      var isCurrent = item.file.toLowerCase() === currentFile;
      return '<a class="flow-menu__link' + (isCurrent ? ' is-current' : '') + '" href="./' + item.file + '">' +
                '<span class="num">' + item.code + '</span>' +
                '<span class="name">' + item.label + '</span>' +
                '<span class="arrow">' + arrowSvg + '</span>' +
             '</a>';
    }).join('');
  }

  if (!document.getElementById('flow-menu')) {
    var menu = document.createElement('div');
    menu.className = 'flow-menu';
    menu.id = 'flow-menu';
    menu.innerHTML =
      '<button class="flow-menu__trigger" id="flow-menu-trigger" aria-expanded="false" aria-controls="flow-menu-panel" type="button">' +
        gridSvg +
        '<span>Scout flow</span>' +
        '<span class="flow-menu__badge">' + (FLOW.length + CROSS.length) + '</span>' +
      '</button>' +
      '<div class="flow-menu__panel" id="flow-menu-panel" role="menu" aria-label="Scout flow designs">' +
        '<div class="flow-menu__header">' +
          '<span class="flow-menu__title">Scout Campaign AI</span>' +
          '<span class="flow-menu__sub">hi-fi flow · prototype</span>' +
        '</div>' +
        '<div class="flow-menu__group-label">FLOW</div>' +
        renderLinks(FLOW) +
        (CROSS.length
          ? '<div class="flow-menu__group-label">CROSS-CUTTING</div>' + renderLinks(CROSS)
          : '') +
      '</div>';
    document.body.appendChild(menu);

    var trigger = menu.querySelector('#flow-menu-trigger');
    function setOpen(open) {
      menu.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    }
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!menu.classList.contains('is-open'));
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  // ---- 4. Prototype pill --------------------------------------------------
  if (!document.querySelector('.proto-pill')) {
    var pill = document.createElement('div');
    pill.className = 'proto-pill';
    pill.innerHTML = '<span class="dot"></span> Prototype';
    document.body.appendChild(pill);
  }

  // ---- 5. Generic click-to-navigate --------------------------------------
  document.addEventListener('click', function (e) {
    // data-goto="./file.html"
    var goto = e.target.closest && e.target.closest('[data-goto]');
    if (goto) {
      // Do not hijack clicks that land on a real anchor inside a data-goto container
      var innerLink = e.target.closest('a');
      if (innerLink && innerLink !== goto && goto.contains(innerLink)) return;
      var href = goto.getAttribute('data-goto');
      if (href) {
        e.preventDefault();
        window.location.href = href;
        return;
      }
    }
    // data-back — go to previous page (or a fallback file if no history)
    var back = e.target.closest && e.target.closest('[data-back]');
    if (back) {
      var fallback = back.getAttribute('data-back');
      e.preventDefault();
      if (history.length > 1) history.back();
      else if (fallback) window.location.href = fallback;
    }
  });
})();
