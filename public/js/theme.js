/**
 * ==========================================================================
 *  MÀU CHỦ ĐẠO (THEME) — chọn, xem trước, khóa & lưu màu cho từng người dùng
 * ==========================================================================
 *  Cách hoạt động:
 *  - Người dùng chọn 1 màu (gợi ý sẵn / thanh trượt / mã HEX / bảng màu đầy đủ).
 *  - Từ 1 màu đó, buildPalette() tự sinh cả bộ màu (đậm, nhạt, nền, chữ,
 *    sidebar...) rồi ghi đè các biến CSS --brand-*, --ink-*, --sidebar-*...
 *    lên thẻ <html> -> toàn bộ giao diện đổi màu theo, không cần sửa CSS.
 *  - Bấm "Áp dụng & khóa" -> lưu vào localStorage của trình duyệt đó.
 *    Lần sau mở trang sẽ tự áp lại màu đã khóa. Mỗi máy/người dùng
 *    có thể chọn màu riêng, không ảnh hưởng người khác.
 *  - Màu trạng thái (Online/Offline/Cam Error) giữ nguyên để luôn dễ nhận biết.
 *
 *  File này được nạp trong <head> để áp màu đã lưu TRƯỚC khi trang hiển thị.
 *  Khi màu đổi sẽ phát sự kiện window "fac:themechange" (background.js lắng nghe).
 * ==========================================================================
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'fac-server-theme';
  const DEFAULT_COLOR = '#17a05a';

  // Màu gợi ý — thêm/bớt tùy ý
  const PRESETS = [
    { name: 'Xanh lá (mặc định)', hex: '#17a05a' },
    { name: 'Xanh ngọc',          hex: '#0d9488' },
    { name: 'Xanh dương',         hex: '#2563eb' },
    { name: 'Chàm',               hex: '#4f46e5' },
    { name: 'Tím',                hex: '#7c3aed' },
    { name: 'Hồng',               hex: '#db2777' },
    { name: 'Đỏ',                 hex: '#dc2626' },
    { name: 'Cam',                hex: '#ea580c' },
    { name: 'Vàng đồng',          hex: '#b7791f' },
    { name: 'Xám than',           hex: '#475569' },
  ];

  // Giới hạn độ sáng của màu chính để chữ trắng trên nút vẫn đọc được
  const LIGHT_MIN = 28;
  const LIGHT_MAX = 56;

  const root = document.documentElement;

  /* ============ Tiện ích chuyển đổi màu ============ */

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function normalizeHex(input) {
    if (typeof input !== 'string') return null;
    let v = input.trim().toLowerCase();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-f]{3}$/.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    return /^#[0-9a-f]{6}$/.test(v) ? v : null;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }

  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 100) / 100;
    l = clamp(l, 0, 100) / 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
  }

  const hslToHex = (h, s, l) => rgbToHex(hslToRgb(h, s, l));

  function rgbString(hex) {
    const { r, g, b } = hexToRgb(hex);
    return `${r}, ${g}, ${b}`;
  }

  // Độ tương phản giữa màu và chữ trắng (chuẩn WCAG)
  function contrastWithWhite(hex) {
    const lin = c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const { r, g, b } = hexToRgb(hex);
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    return 1.05 / (L + 0.05);
  }

  /* ============ Sinh cả bộ màu từ 1 màu gốc ============ */

  function buildPalette(hex) {
    const { h, s, l } = rgbToHsl(hexToRgb(hex));
    const L = clamp(l, LIGHT_MIN, LIGHT_MAX);
    const S = (factor, cap = 100) => clamp(Math.min(s, cap) * factor, 0, 100);
    const c = (sat, light) => hslToHex(h, sat, light);

    const p = {
      '--brand-900': c(S(0.70), 15),
      '--brand-700': c(S(0.80), 24),
      '--brand-600': c(S(0.90), 31),
      '--brand-500': c(s, L),
      '--brand-400': c(S(0.85), clamp(L + 12, 40, 66)),
      '--brand-300': c(S(0.85), 66),
      '--brand-100': c(S(0.85, 75), 92),
      '--brand-50':  c(S(0.75, 60), 96.5),

      '--ink-900': c(S(0.35), 12),
      '--ink-700': c(S(0.20), 29),
      '--ink-500': c(S(0.14), 46),
      '--ink-300': c(S(0.18), 73),

      '--bg-page': c(S(0.80, 40), 95),

      '--sidebar-glow':   c(S(0.55), 19),
      '--sidebar-top':    c(S(0.75), 14),
      '--sidebar-bottom': c(S(0.75), 8),
      '--sidebar-text':   c(S(0.50), 93),
      '--sidebar-sub':    c(S(0.40), 76),
      '--sidebar-muted':  c(S(0.28), 63),
    };

    // Bản "r, g, b" để CSS dùng trong rgba(var(--x-rgb), alpha)
    ['900', '700', '600', '500', '400', '300'].forEach(k => {
      p[`--brand-${k}-rgb`] = rgbString(p[`--brand-${k}`]);
    });
    p['--bg-page-rgb'] = rgbString(p['--bg-page']);

    return p;
  }

  const MANAGED_VARS = Object.keys(buildPalette(DEFAULT_COLOR));

  /* ============ Áp màu lên trang ============ */

  let animTimer = null;

  function applyColor(hex, opts = {}) {
    const color = normalizeHex(hex) || DEFAULT_COLOR;

    if (opts.animate) {
      root.classList.add('theme-animating');
      clearTimeout(animTimer);
      animTimer = setTimeout(() => root.classList.remove('theme-animating'), 450);
    }

    if (color === DEFAULT_COLOR) {
      // Màu mặc định -> xóa ghi đè, dùng đúng bộ màu gốc trong style.css
      MANAGED_VARS.forEach(v => root.style.removeProperty(v));
    } else {
      const palette = buildPalette(color);
      Object.entries(palette).forEach(([k, v]) => root.style.setProperty(k, v));
    }

    window.dispatchEvent(new CustomEvent('fac:themechange', { detail: { color } }));
    return color;
  }

  /* ============ Lưu / đọc lựa chọn ============ */

  function readSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      const color = normalizeHex(data && data.color);
      return color ? { color, locked: !!data.locked } : null;
    } catch (e) {
      return null; // trình duyệt chặn localStorage -> dùng mặc định
    }
  }

  function writeSaved(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* bỏ qua */ }
  }

  // Áp ngay màu đã lưu (chạy trong <head>, trước khi trang hiển thị)
  const initial = readSaved();
  if (initial) applyColor(initial.color);

  /* ============ Bảng chọn màu ============ */

  function initPicker() {
    const picker = document.getElementById('themePicker');
    if (!picker) return;

    const $ = id => document.getElementById(id);
    const btn = $('themeBtn');
    const panel = $('themePanel');
    const lockIcon = $('themeLockIcon');
    const lockedBox = $('themeLocked');
    const swatchWrap = $('themeSwatches');
    const chip = $('themeChip');
    const hexInput = $('themeHex');
    const nativeInput = $('themeNative');
    const hueInput = $('themeHue');
    const satInput = $('themeSat');
    const lightInput = $('themeLight');
    const hueVal = $('themeHueVal');
    const satVal = $('themeSatVal');
    const lightVal = $('themeLightVal');
    const warning = $('themeWarning');

    let saved = readSaved() || { color: DEFAULT_COLOR, locked: false };
    let draft = saved.color;
    let isOpen = false;
    let previewRaf = null;

    // ---- Render ô màu gợi ý ----
    PRESETS.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-swatch';
      b.style.background = p.hex;
      b.dataset.hex = p.hex;
      b.title = p.name;
      b.setAttribute('aria-label', p.name);
      b.addEventListener('click', () => setDraft(p.hex, 'swatch', true));
      swatchWrap.appendChild(b);
    });

    function updateLockUI() {
      const locked = !!saved.locked;
      panel.classList.toggle('is-locked', locked);
      lockedBox.hidden = !locked;
      lockIcon.hidden = !locked;
      btn.title = locked ? 'Màu chủ đạo đang được khóa' : 'Đổi màu chủ đạo';
    }

    // Đồng bộ các ô điều khiển theo màu nháp hiện tại
    function syncControls(from) {
      const palette = buildPalette(draft);
      const effective = palette['--brand-500'];
      const { h, s, l } = rgbToHsl(hexToRgb(draft));
      const L = clamp(l, LIGHT_MIN, LIGHT_MAX);

      chip.style.background = effective;
      if (from !== 'hex') {
        hexInput.value = draft.toUpperCase();
        hexInput.classList.remove('invalid');
      }
      if (from !== 'native') nativeInput.value = draft;

      // Không ghi đè thanh trượt khi người dùng đang kéo, tránh thanh bị giật do làm tròn
      if (from !== 'slider') {
        hueInput.value = Math.round(h);
        satInput.value = Math.round(s);
        lightInput.value = Math.round(L);
      }

      const hv = +hueInput.value;
      const sv = +satInput.value;
      const lv = +lightInput.value;
      hueVal.textContent = `${hv}°`;
      satVal.textContent = `${sv}%`;
      lightVal.textContent = `${lv}%`;

      satInput.style.setProperty('--track', `linear-gradient(90deg, hsl(${hv},0%,${lv}%), hsl(${hv},100%,${lv}%))`);
      lightInput.style.setProperty('--track', `linear-gradient(90deg, hsl(${hv},${sv}%,${LIGHT_MIN}%), hsl(${hv},${sv}%,${LIGHT_MAX}%))`);

      swatchWrap.querySelectorAll('.theme-swatch').forEach(sw => {
        sw.classList.toggle('selected', sw.dataset.hex === draft);
      });

      warning.hidden = contrastWithWhite(effective) >= 3;
    }

    // Đặt màu nháp + xem trước ngay trên toàn trang
    function setDraft(hex, from, animate = false) {
      const color = normalizeHex(hex);
      if (!color) return;
      draft = color;
      syncControls(from);

      // Gom các lần đổi liên tục (kéo thanh trượt) vào 1 lần vẽ mỗi khung hình
      if (animate) {
        applyColor(draft, { animate: true });
      } else {
        cancelAnimationFrame(previewRaf);
        previewRaf = requestAnimationFrame(() => applyColor(draft));
      }
    }

    function open() {
      saved = readSaved() || saved;
      draft = saved.color;
      isOpen = true;
      panel.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      updateLockUI();
      syncControls();
      setTimeout(() => {
        const first = saved.locked ? $('themeUnlock') : swatchWrap.querySelector('.selected') || swatchWrap.firstChild;
        if (first) first.focus({ preventScroll: true });
      }, 50);
    }

    // commit = false -> hủy, trả lại màu đã lưu trước đó
    function close(commit) {
      if (!isOpen) return;
      isOpen = false;
      cancelAnimationFrame(previewRaf);
      if (!commit && draft !== saved.color) {
        draft = saved.color;
        applyColor(saved.color, { animate: true });
      }
      panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    function applyAndLock() {
      saved = { color: draft, locked: true };
      writeSaved(saved);
      applyColor(draft, { animate: true });
      updateLockUI();
      close(true);
      btn.focus({ preventScroll: true });
    }

    // ---- Sự kiện ----
    btn.addEventListener('click', () => (isOpen ? close(false) : open()));
    $('themeClose').addEventListener('click', () => { close(false); btn.focus({ preventScroll: true }); });
    $('themeCancel').addEventListener('click', () => { close(false); btn.focus({ preventScroll: true }); });
    $('themeApply').addEventListener('click', applyAndLock);
    $('themeReset').addEventListener('click', () => setDraft(DEFAULT_COLOR, 'reset', true));

    $('themeUnlock').addEventListener('click', () => {
      saved = { color: saved.color, locked: false };
      writeSaved(saved);
      updateLockUI();
      const first = swatchWrap.querySelector('.selected') || swatchWrap.firstChild;
      if (first) first.focus({ preventScroll: true });
    });

    [hueInput, satInput, lightInput].forEach(input => {
      input.addEventListener('input', () => {
        setDraft(hslToHex(+hueInput.value, +satInput.value, +lightInput.value), 'slider');
      });
    });

    hexInput.addEventListener('input', () => {
      const color = normalizeHex(hexInput.value);
      hexInput.classList.toggle('invalid', !color);
      if (color) setDraft(color, 'hex');
    });
    hexInput.addEventListener('blur', () => {
      hexInput.value = draft.toUpperCase();
      hexInput.classList.remove('invalid');
    });
    hexInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); hexInput.blur(); }
    });

    nativeInput.addEventListener('input', () => setDraft(nativeInput.value, 'native'));

    // Click ra ngoài -> hủy & đóng
    document.addEventListener('mousedown', e => {
      if (isOpen && !picker.contains(e.target)) close(false);
    });

    // Esc -> hủy & đóng
    document.addEventListener('keydown', e => {
      if (isOpen && e.key === 'Escape') {
        e.stopPropagation();
        close(false);
        btn.focus({ preventScroll: true });
      }
    });

    // Đồng bộ giữa nhiều tab đang mở cùng lúc
    window.addEventListener('storage', e => {
      if (e.key !== STORAGE_KEY) return;
      saved = readSaved() || { color: DEFAULT_COLOR, locked: false };
      if (!isOpen) {
        draft = saved.color;
        applyColor(saved.color, { animate: true });
      }
      updateLockUI();
    });

    updateLockUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPicker);
  } else {
    initPicker();
  }

  // API dùng chung (vd: gọi từ console hoặc tính năng khác)
  window.FacTheme = {
    DEFAULT_COLOR,
    PRESETS,
    buildPalette,
    applyColor,
    getSaved: readSaved,
    reset() {
      writeSaved({ color: DEFAULT_COLOR, locked: false });
      applyColor(DEFAULT_COLOR, { animate: true });
    },
  };
})();