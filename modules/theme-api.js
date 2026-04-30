/**
 * ThemeAPI — Adattamento dinamico al tema di Firefox
 * Legge browser.theme.getCurrent() e applica i colori come variabili CSS
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
    if (!color) return 0.5;
    let r, g, b;
    if (Array.isArray(color)) {
      [r, g, b] = color;
    } else if (typeof color === 'string' && color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
    } else {
      return 0.5;
    }
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function applyTheme(theme) {
    const c = theme.colors || {};
    const root = document.documentElement;

    const map = {
      '--t-popup':         c.popup,
      '--t-popup-text':    c.popup_text,
      '--t-popup-border':  c.popup_border,
      '--t-popup-hl':      c.popup_highlight,
      '--t-popup-hl-txt':  c.popup_highlight_text,
      '--t-toolbar':       c.toolbar,
      '--t-toolbar-txt':   c.toolbar_text,
      '--t-frame':         c.frame,
      '--t-sidebar':       c.sidebar,
      '--t-sidebar-txt':   c.sidebar_text,
      '--t-sidebar-brd':   c.sidebar_border,
      '--t-icons':         c.icons,
      '--t-btn-hover':     c.button_background_hover,
      '--t-btn-active':    c.button_background_active,
      '--t-tab-line':      c.tab_line,
      '--t-ntp-bg':        c.ntp_background,
    };

    for (const [prop, val] of Object.entries(map)) {
      const str = colorToString(val);
      if (str) root.style.setProperty(prop, str);
    }

    // Rileva dark/light in base al colore di sfondo popup o toolbar
    const bgColor = c.popup || c.toolbar || c.frame;
    const isDark = luminance(bgColor) < 0.5;
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
      // Fallback: usa prefers-color-scheme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      });
    }
  }

  return { init, applyTheme };
})();