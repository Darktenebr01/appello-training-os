/* Global SVG icon library. Icons are original and drawn specifically for this
   training workspace; original artwork and icons. */
(function () {
  'use strict';

  const G = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;

  const ICONS = {
    training: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-tr', '#4f7df3', '#7b4be0')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-tr)"/>
      <path d="M9 19.5 24 12l15 7.5L24 27 9 19.5Z" fill="#fff" opacity=".96"/>
      <path d="M14 24.2v7.2c0 1 4.5 4.2 10 4.2s10-3.2 10-4.2v-7.2L24 29.8 14 24.2Z" fill="#fff" opacity=".74"/>
      <path d="M38 20v9" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".92"/>
      <circle cx="38" cy="32" r="2" fill="#fff" opacity=".92"/>
      <path d="m10.5 13.5 1.1 2.3 2.4 1.1-2.4 1.1-1.1 2.3-1.1-2.3-2.4-1.1 2.4-1.1 1.1-2.3Z" fill="#ffe68a"/>
    </svg>`,
    mail: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-ma', '#2b9bf4', '#0d5cc4')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-ma)"/>
      <rect x="10" y="14" width="28" height="20" rx="3.2" fill="#fff"/>
      <path d="m11.5 17 12.5 9.2L36.5 17" fill="none" stroke="#2679cf" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="m11.3 31.6 8.4-7.4M36.7 31.6l-8.4-7.4" stroke="#bcdcf8" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="36.5" cy="12.7" r="5.3" fill="#f45b5b" stroke="#fff" stroke-width="1.8"/>
      <path d="M36.5 10v3.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`,
    teams: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-te', '#7a82dc', '#4c4a9d')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-te)"/>
      <circle cx="33.5" cy="16" r="5" fill="#c4c8ff"/>
      <path d="M25 21h13a2.5 2.5 0 0 1 2.5 2.5V29a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7v-5.5A2.5 2.5 0 0 1 25 21Z" fill="#e1e2ff" opacity=".96"/>
      <path d="M8 18h18v5H19v12.5h-4.5V23H8v-5Z" fill="#fff"/>
      <circle cx="16" cy="11" r="4.5" fill="#d8d9ff"/>
      <path d="M7 16.5h18a2 2 0 0 1 2 2v8A8.5 8.5 0 0 1 18.5 35h-3A8.5 8.5 0 0 1 7 26.5v-8a2 2 0 0 1 2-2Z" fill="#fff" opacity=".18"/>
    </svg>`,
    sheets: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-sh', '#2eae69', '#0c6b38')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-sh)"/>
      <rect x="9.5" y="10" width="29" height="28" rx="3" fill="#fff"/>
      <path d="M9.5 18h29M9.5 25.5h29M9.5 33h29M19 10v28M29 10v28" stroke="#9dd8b7" stroke-width="1.5"/>
      <path d="M9.5 10h29v8h-29z" fill="#137a42"/>
      <path d="M15.5 14h2.8v-2.5h2.2V14h2.8v2h-2.8v2.6h2.8v2h-2.8V23h-2.2v-2.4h-2.8v-2h2.8V16h-2.8v-2Z" fill="#fff" opacity=".94"/>
      <path d="m28.8 29.4 3.2 3.2 6-6" stroke="#14854a" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
    </svg>`,
    files: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-fi', '#ffd26e', '#e7a32d')}
      <path d="M6 14.5a4 4 0 0 1 4-4h9.2l3.8 4H38a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-23Z" fill="url(#g-fi)"/>
      <path d="M6 20h36v4.5H6z" fill="#fff" opacity=".42"/>
      <path d="M12 24h24v13H12z" fill="#fff" opacity=".3"/>
      <path d="M17 28h14M17 32h9" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>
    </svg>`,
    docs: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-do', '#75a5f7', '#2455ae')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-do)"/>
      <path d="M13 8h16l8 8v24H13V8Z" fill="#fff"/>
      <path d="M29 8v8h8" fill="#c9ddfb"/>
      <path d="M18 23h13M18 28h13M18 33h9" stroke="#4f7fcb" stroke-width="2" stroke-linecap="round"/>
      <path d="M17 16h7" stroke="#9ebce9" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    todo: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-to', '#4a92f2', '#2052b0')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-to)"/>
      <rect x="10" y="10" width="28" height="28" rx="5" fill="#fff"/>
      <path d="m15 19 2.4 2.4L22 16.8M15 29l2.4 2.4L22 26.8" stroke="#2e7be0" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M26 20h7M26 30h7" stroke="#7c9bc2" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    notes: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-no', '#f5cf5d', '#d3981f')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-no)"/>
      <path d="M12 10h24v28l-5-4-5 4-5-4-4 3-5-4V10Z" fill="#fffdf4"/>
      <path d="M18 19h12M18 24h12M18 29h8" stroke="#ba8b25" stroke-width="2" stroke-linecap="round"/>
      <path d="M30 32h6" stroke="#ddc58b" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    calculator: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-ca', '#66768f', '#34435b')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-ca)"/>
      <rect x="11" y="8" width="26" height="32" rx="4" fill="#edf3f9"/>
      <rect x="15" y="12" width="18" height="6" rx="1.5" fill="#8aa4bf"/>
      <rect x="15" y="22" width="5" height="5" rx="1.2" fill="#607d9d"/><rect x="22" y="22" width="5" height="5" rx="1.2" fill="#607d9d"/><rect x="29" y="22" width="5" height="5" rx="1.2" fill="#ea9b42"/>
      <rect x="15" y="29" width="5" height="5" rx="1.2" fill="#607d9d"/><rect x="22" y="29" width="5" height="5" rx="1.2" fill="#607d9d"/><rect x="29" y="29" width="5" height="5" rx="1.2" fill="#ea9b42"/>
      <rect x="15" y="36" width="12" height="4" rx="1.2" fill="#c1ccda"/>
    </svg>`,
    settingsApp: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-se', '#7d8ca3', '#46566c')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-se)"/>
      <g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="24" cy="24" r="5.3"/>
        <path d="M24 11.5v3.2M24 33.3v3.2M11.5 24h3.2M33.3 24h3.2M15.2 15.2l2.3 2.3M30.5 30.5l2.3 2.3M32.8 15.2l-2.3 2.3M17.5 30.5l-2.3 2.3"/>
      </g>
      <circle cx="24" cy="24" r="15" fill="none" stroke="#fff" stroke-width="1.4" opacity=".24"/>
    </svg>`,
    clock: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-cl', '#58b6ea', '#1b66b3')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-cl)"/>
      <circle cx="24" cy="24" r="15" fill="#f4fbff"/>
      <circle cx="24" cy="24" r="12" fill="none" stroke="#a5cced" stroke-width="1"/>
      <path d="M24 14v10l6 4" stroke="#1e69b2" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 9v2M24 37v2M9 24h2M37 24h2" stroke="#2d7cc4" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    recycle: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-re', '#e7edf6', '#aebdd0')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-re)"/>
      <path d="M15 16h18l-1.5 23h-15L15 16Z" fill="#eef4fb" stroke="#7d93ad" stroke-width="1.7"/>
      <path d="M20 16v-3h8v3M12 16h24" stroke="#607a97" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M20 23v10M24 23v10M28 23v10" stroke="#7e9bb7" stroke-width="1.8" stroke-linecap="round"/>
      <path d="m29 8 4 6-4 6-4-6 4-6Z" fill="#58a970" opacity=".85"/>
      <path d="m19 8 4 6-4 6-4-6 4-6Z" fill="#58a970" opacity=".55"/>
    </svg>`,
    settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.8 7.8 0 0 0 .05-1 7.8 7.8 0 0 0-.05-1l2.1-1.63a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.46.99a7.5 7.5 0 0 0-1.74-1L14.4 2.1A.5.5 0 0 0 13.9 2h-4a.5.5 0 0 0-.5.42l-.37 2.62a7.5 7.5 0 0 0-1.75 1l-2.45-1a.5.5 0 0 0-.61.23l-2 3.46a.5.5 0 0 0 .12.64L4.45 11a7.8 7.8 0 0 0 0 2l-2.1 1.63a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .6.22l2.46-.99a7.5 7.5 0 0 0 1.74 1l.37 2.62a.5.5 0 0 0 .5.42h4a.5.5 0 0 0 .5-.42l.37-2.62a7.5 7.5 0 0 0 1.75-1l2.45 1a.5.5 0 0 0 .61-.23l2-3.46a.5.5 0 0 0-.12-.64L19.4 13Zm-7.18 2.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg>`,
    calendar: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-cal', '#3178c6', '#123f86')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-cal)"/>
      <rect x="9" y="12" width="30" height="28" rx="4" fill="#f7fbff"/>
      <path d="M9 20h30v-5a3 3 0 0 0-3-3H12a3 3 0 0 0-3 3v5Z" fill="#1c5ca8"/>
      <path d="M15 9v6M33 9v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M16 26h4M23 26h4M30 26h3M16 32h4M23 32h4M30 32h3" stroke="#6e9ccb" stroke-width="2" stroke-linecap="round"/>
      <rect x="15" y="23" width="5" height="5" rx="1" fill="#2e79c7"/>
      <rect x="22" y="29" width="5" height="5" rx="1" fill="#2e79c7"/>
    </svg>`,
    onedrive: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-od', '#42a5f5', '#1265b8')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-od)"/>
      <path d="M16.8 33.5h18.4a5.7 5.7 0 0 0 .7-11.3 8.7 8.7 0 0 0-16.1-3.6 7.2 7.2 0 0 0-3 14.9Z" fill="#fff" opacity=".96"/>
      <path d="M15.2 27.8a5.3 5.3 0 0 1 5.2-6.6c.6 0 1.2.1 1.7.3A7.2 7.2 0 0 1 35.5 23" fill="none" stroke="#bfe4ff" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`,
    assistant: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-as', '#48c6ef', '#6d5bd0')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-as)"/>
      <path d="M24 9c1.7 7.8 5.2 11.3 13 13-7.8 1.7-11.3 5.2-13 13-1.7-7.8-5.2-11.3-13-13 7.8-1.7 11.3-5.2 13-13Z" fill="#fff"/>
      <path d="M35 11c.8 3.5 2.4 5.1 5.9 5.9-3.5.8-5.1 2.4-5.9 5.9-.8-3.5-2.4-5.1-5.9-5.9 3.5-.8 5.1-2.4 5.9-5.9Z" fill="#d9f5ff" opacity=".9"/>
      <circle cx="14" cy="35" r="2.2" fill="#fff" opacity=".7"/>
    </svg>`,
    browser: `<svg viewBox="0 0 48 48" class="icon-tile" aria-hidden="true">${G('g-br', '#132b4a', '#0a1626')}
      <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-br)"/>
      <rect x="8" y="9" width="32" height="28" rx="3.5" fill="#0b1220" stroke="#4ba7f0" stroke-width="1.7"/>
      <path d="M8 16h32" stroke="#4ba7f0" stroke-width="1.7"/>
      <circle cx="12" cy="12.5" r="1.3" fill="#f26d6d"/><circle cx="16.5" cy="12.5" r="1.3" fill="#f0c35b"/><circle cx="21" cy="12.5" r="1.3" fill="#5fd394"/>
      <circle cx="24" cy="26" r="7.5" fill="none" stroke="#58c8ff" stroke-width="1.6"/>
      <ellipse cx="24" cy="26" rx="3.2" ry="7.5" fill="none" stroke="#58c8ff" stroke-width="1.2"/>
      <path d="M16.8 24h14.4M17.4 29h13.2" stroke="#58c8ff" stroke-width="1.2"/>
    </svg>`,
    doom: `<img src="assets/doom.png" class="icon-tile app-img-icon" alt="" draggable="false">`,
    cyberpunk: `<img src="assets/cyberpunk.png" class="icon-tile app-img-icon" alt="" draggable="false">`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="m20 20-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/></svg>`,
    file: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#eaf1fb" stroke="#5e7fa9" stroke-width="1.2" d="M6 2h8l5 5v15H6V2Z"/><path fill="#c6d8ee" d="M14 2v5h5"/><path stroke="#7a98ba" stroke-width="1.4" stroke-linecap="round" d="M9 12h7M9 15h7M9 18h4"/></svg>`,
    folder: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#e9b949" d="M2 5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v3H2V5Z"/><path fill="#f7cd67" d="M2 8h20v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8Z"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="2" width="18" height="20" rx="2" fill="#f4f8ff"/><path fill="#2b579a" d="M3 4a2 2 0 0 1 2-2h8l8 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4Z"/><path fill="#8db4e2" d="M13 2v8h8"/><path stroke="#fff" stroke-width="1.5" stroke-linecap="round" d="M7 12h7M7 15h7M7 18h4"/></svg>`,
    sheet: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="18" rx="2" fill="#107c41"/><rect x="4.5" y="6" width="15" height="12" rx="1" fill="#e9f7ef"/><path stroke="#5aac7d" d="M4.5 10h15M4.5 14h15M9 6v12M15 6v12"/><rect x="4.5" y="6" width="15" height="4" fill="#0b6334"/></svg>`
  };

  const APP_NAMES = {
    training: 'Training Hub', mail: 'Mail', teams: 'Teamspace', sheets: 'Sheets',
    files: 'Files', docs: 'Docs', todo: 'Tasks', notes: 'Notes', calculator: 'Calculator',
    clock: 'Clock', recycle: 'Recycle Bin', settings: 'Settings', settingsApp: 'Settings',
    calendar: 'Calendar', onedrive: 'Cloud Drive', drive: 'Cloud Drive', assistant: 'Assist',
    browser: 'Chromium', doom: 'DOOM', cyberpunk: 'Cyberpunk'
  };

  function icon(name, extraClass) {
    const svg = ICONS[name] || ICONS.file;
    if (!extraClass) return svg;
    return svg.replace('class="icon-tile"', `class="icon-tile ${extraClass}"`);
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  function avatar(name, cls, tone) {
    let t = tone;
    if (!t) {
      let sum = 0;
      for (const ch of String(name || '')) sum += ch.charCodeAt(0);
      t = (sum % 8) + 1;
    }
    return `<span class="avatar ${cls || 'avatar-md'} tone-${t}" aria-hidden="true">${initials(name)}</span>`;
  }

  function appTitle(name) { return APP_NAMES[name] || name; }

  window.Icons = { icons: ICONS, icon, avatar, initials, appTitle };
})();
