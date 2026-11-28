// "Install on your phone" guide: shows the steps for the visitor's device, and a one-tap
// install button where the browser supports it (Chrome / Edge "beforeinstallprompt").
import { esc } from './ui.js';

let deferredPrompt = null;
let onChange = () => {};

/** Call once at start-up; `rerender` redraws the current page when install availability changes. */
export function initInstall(rerender) {
  onChange = rerender;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // show our own button instead of the browser's mini-bar
    deferredPrompt = e;
    onChange();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; onChange(); });
}

export function isInstalled() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch (e) { return false; }
}

export function platform() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

const SHARE_ICON = '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v11M6 6l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9H4v9h12V9h-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const DOTS_ICON = '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="4" r="1.8" fill="currentColor"/><circle cx="10" cy="10" r="1.8" fill="currentColor"/><circle cx="10" cy="16" r="1.8" fill="currentColor"/></svg>';
const INSTALL_ICON = '<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="3" width="16" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 6v5M7.5 8.5 10 11l2.5-2.5M6 17h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

export const STEPS = {
  ios: {
    name: 'iPhone or iPad',
    steps: [
      `Open this page in <b>Safari</b> (or any browser with a Share button).`,
      `Tap the <b>Share</b> button ${SHARE_ICON}: at the bottom of the screen on iPhone, at the top on iPad.`,
      'Scroll down and tap <b>Add to Home Screen</b>.',
      'Tap <b>Add</b>. TT Umpire Study now has its own icon.'
    ]
  },
  android: {
    name: 'Android',
    steps: [
      'Open this page in <b>Chrome</b>.',
      `Tap the menu ${DOTS_ICON} at the top right.`,
      'Tap <b>Install app</b> (or <b>Add to Home screen</b>).',
      'Tap <b>Install</b>. The app appears on your home screen and in your app list.'
    ]
  },
  desktop: {
    name: 'Computer',
    steps: [
      `<b>Chrome or Edge:</b> click the install icon ${INSTALL_ICON} at the right of the address bar, or open the menu ${DOTS_ICON} and choose <b>Install TT Umpire Study</b> (in Edge: <b>Apps → Install this site as an app</b>).`,
      '<b>Safari on Mac:</b> choose <b>File → Add to Dock</b>.',
      'It opens in its own window, like any other program.'
    ]
  }
};

const PHONE_ART = `<svg class="install-art" viewBox="0 0 64 64" aria-hidden="true">
  <rect x="16" y="4" width="32" height="56" rx="7" fill="var(--table)"/>
  <rect x="20" y="11" width="24" height="40" rx="2" fill="var(--surface)"/>
  <rect x="25" y="17" width="14" height="14" rx="4" fill="var(--table)"/>
  <circle cx="35" cy="22" r="2.6" fill="var(--ball-bar)"/>
  <line x1="32" y1="17" x2="32" y2="31" stroke="#fff" stroke-width="1.4"/>
  <rect x="24" y="36" width="16" height="3" rx="1.5" fill="var(--line)"/>
  <rect x="27" y="42" width="10" height="3" rx="1.5" fill="var(--line)"/>
  <rect x="28" y="54" width="8" height="2" rx="1" fill="#fff" opacity=".7"/>
</svg>`;

function stepsHTML(key) {
  return `<ol class="install-steps">${STEPS[key].steps.map((s) => `<li>${s}</li>`).join('')}</ol>`;
}

/**
 * The install card.
 *  context "home": compact card with the steps for this device and a "Not now" button (hidden once installed or dismissed).
 *  context "help": full guide with all devices (always shown; says so if already installed).
 */
export function installCardHTML(context, { dismissed = false } = {}) {
  const installed = isInstalled();
  if (context === 'home' && (installed || dismissed)) return '';
  const here = platform();
  const others = Object.keys(STEPS).filter((k) => k !== here);
  const button = deferredPrompt ? '<button class="btn install-btn" data-act="install-now">Install app</button>' : '';
  if (context === 'help') {
    return `
      ${installed ? '<p class="install-done">✓ TT Umpire Study is already installed on this device.</p>' : ''}
      <p>Install TT Umpire Study to open it from your home screen like an app. It's <b>free</b>, needs <b>no app store</b>, takes up very little space and <b>works offline</b> at venues with poor signal.</p>
      ${button}
      ${Object.keys(STEPS).map((k) => `
        <details class="install-device" ${k === here ? 'open' : ''}>
          <summary><b>${esc(STEPS[k].name)}</b>${k === here ? ' <span class="tag rec">This device</span>' : ''}</summary>
          ${stepsHTML(k)}
        </details>`).join('')}
      <p class="small">Your progress stays the same: the installed app and the website on this device share it. To move progress to another device, use <a href="#more">More → Back up your progress</a>.</p>`;
  }
  return `<div class="panel install-card">
    ${PHONE_ART}
    <div class="install-body">
      <h2 class="h">Install TT Umpire Study on your ${here === 'desktop' ? 'computer' : 'phone'}</h2>
      <p class="note">Open it from your home screen like an app. It's free, needs no app store and works offline at venues.</p>
      ${button}
      ${deferredPrompt ? '' : `<p class="small install-for">On ${esc(STEPS[here].name)}:</p>${stepsHTML(here)}`}
      <details class="install-other"><summary>Steps for ${others.map((k) => STEPS[k].name).join(' or ')}</summary>
        ${others.map((k) => `<p class="small install-for">${esc(STEPS[k].name)}:</p>${stepsHTML(k)}`).join('')}
      </details>
      <div class="row install-actions"><a class="linkbtn" href="#help" data-jump-install>Full guide</a><button class="linkbtn" data-act="install-later">Not now</button></div>
    </div>
  </div>`;
}

/** Wire the buttons inside `root`. `onDismiss` hides the Home card for good. */
export function wireInstall(root, { onDismiss } = {}) {
  root.querySelectorAll('[data-act="install-now"]').forEach((b) => b.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) { /* ignore */ }
    deferredPrompt = null;
    onChange();
  }));
  root.querySelector('[data-act="install-later"]')?.addEventListener('click', () => onDismiss?.());
}
