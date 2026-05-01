/**
 * ThemeAPI — Adattamento dinamico al tema di Firefox
 *
 * Strategia a 3 livelli:
 * 1. browser.theme.getCurrent() → colori espliciti del tema
 * 2. prefers-color-scheme       → preferenza OS/Firefox
 * 3. color-scheme: light dark   → system colors CSS (Field, Canvas, ecc.)
 */

const ThemeAPI = (() => {

  function colorToString(val) {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (Array.isArray(val)) {
      return val.length === 4
        ? `rgba(${val[0]},${val[1]},${val[2]},${val[3] / 255})`
        : `rgb(${val[0]},${val[1]},${val[2]})`;
    }
    return null;
  }

  function luminance(color) {
    if (!color) return null; // null = non disponibile
    let r, g, b;
    if (Array.isArray(color)) {
      [r, g, b] = color;
    } else if (typeof color === 'string' && color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else {
      return null;
    }
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function applyTheme(theme) {
    const c = theme.colors || {};
    const root = document.documentElement;

    // Applica le variabili CSS del tema
    const map = {
      '--t-popup':        c.popup,
      '--t-popup-text':   c.popup_text,
      '--t-popup-border': c.popup_border,
      '--t-popup-hl':     c.popup_highlight,
      '--t-popup-hl-txt': c.popup_highlight_text,
      '--t-toolbar':      c.toolbar,
      '--t-toolbar-txt':  c.toolbar_text,
      '--t-frame':        c.frame,
      '--t-sidebar':      c.sidebar,
      '--t-sidebar-txt':  c.sidebar_text,
      '--t-sidebar-brd':  c.sidebar_border,
      '--t-icons':        c.icons,
      '--t-btn-hover':    c.button_background_hover,
      '--t-btn-active':   c.button_background_active,
      '--t-tab-line':     c.tab_line,
      '--t-ntp-bg':       c.ntp_background,
    };

    for (const [prop, val] of Object.entries(map)) {
      const str = colorToString(val);
      if (str) root.style.setProperty(prop, str);
    }

    // Rileva dark/light:
    // Usa i colori del tema se disponibili, altrimenti prefers-color-scheme
    const bgColor = c.popup || c.toolbar || c.frame;
    const lum = luminance(bgColor);

    let isDark;
    if (lum !== null) {
      // Il tema fornisce un colore: usalo per decidere
      isDark = lum < 0.5;
    } else {
      // Il tema non fornisce colori (es. temi built-in di Firefox che
      // delegano tutto a prefers-color-scheme): usa la preferenza OS
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  async function init() {
    try {
      const theme = await browser.theme.getCurrent();
      applyTheme(theme);

      browser.theme.onUpdated.addListener(({ theme: updated }) => {
        applyTheme(updated);
      });
    } catch (e) {
      // Fallback completo: solo prefers-color-scheme
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
      mq.addEventListener('change', ev => {
        document.documentElement.setAttribute('data-theme', ev.matches ? 'dark' : 'light');
      });
    }
  }

  return { init, applyTheme };
})();