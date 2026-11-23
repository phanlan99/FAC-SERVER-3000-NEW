/**
 * ==========================================================================
 *  HƯỚNG DẪN SỬ DỤNG (TOUR) — chỉ dẫn từng bước cách đổi & khóa màu chủ đạo
 * ==========================================================================
 *  - Tự hiện 1 lần cho người dùng MỚI (chưa xem hướng dẫn & chưa từng khóa màu).
 *  - Làm tối trang, chừa "vùng sáng" quanh phần đang hướng dẫn. Người dùng
 *    có thể bấm thử ngay vào vùng sáng (vd: bấm 1 ô màu để xem trước).
 *  - Một số bước tự chuyển tiếp khi người dùng làm đúng thao tác
 *    (bấm nút Màu, bấm Mở khóa, bấm Áp dụng & khóa).
 *  - Phím tắt: → / Enter = Tiếp, ← = Quay lại, Esc = Bỏ qua.
 *  - Xem lại bất cứ lúc nào: nút ❔ trong bảng màu, hoặc gọi FacTour.start().
 *
 *  Cần có: theme.js (window.FacTheme.picker) đã được nạp trước.
 * ==========================================================================
 */
(() => {
  'use strict';

  const SEEN_KEY = 'fac-server-tour-theme';
  const AUTO_START_DELAY = 1500; // ms — đợi card hiện xong rồi mới mở hướng dẫn
  const SPOT_PAD = 8;            // khoảng hở quanh phần được làm sáng (px)
  const EDGE = 12;               // khoảng cách tối thiểu tới mép màn hình (px)
  const GAP = 14;                // khoảng cách giữa vùng sáng và hộp hướng dẫn (px)

  const root = document.documentElement;

  /* ============ Lưu trạng thái đã xem ============ */

  function hasSeen() {
    try { return localStorage.getItem(SEEN_KEY) === 'done'; } catch (e) { return true; }
  }
  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, 'done'); } catch (e) { /* bỏ qua */ }
  }

  const picker = () => (window.FacTheme && window.FacTheme.picker) || null;

  /* ============ Nội dung các bước ============ */
  // target:  selector (hoặc mảng selector -> vùng sáng bao trọn tất cả); bỏ trống = hộp ở giữa màn hình
  // panel:   'open' / 'closed' — trạng thái bảng màu khi tới bước này
  // advanceOn: sự kiện người dùng làm đúng -> tự sang bước tiếp
  function buildSteps() {
    const locked = picker() ? picker().isLocked() : false;

    const steps = [
      {
        panel: 'closed',
        title: '👋 Chào mừng bạn đến với FAC SERVER',
        text: 'Bạn có thể đổi <b>màu chủ đạo</b> của trang theo phong cách riêng. Xem hướng dẫn nhanh khoảng 30 giây nhé.',
        nextLabel: 'Bắt đầu',
      },
      {
        target: '#themeBtn',
        panel: 'closed',
        title: 'Mở bảng chọn màu',
        text: 'Bấm nút <b>🎨 Màu</b> để mở bảng chọn màu. Khi màu đã được khóa, nút sẽ có thêm dấu 🔒.',
        hint: '👉 Bấm thử vào nút Màu',
        advanceOn: 'panel-open',
      },
    ];

    if (locked) {
      steps.push({
        target: '#themeLocked',
        panel: 'open',
        title: 'Màu đang được khóa',
        text: 'Để tránh đổi nhầm, bảng màu đang bị khóa. Bấm <b>Mở khóa để chỉnh</b> thì mới chọn được màu khác.',
        hint: '👉 Bấm "Mở khóa để chỉnh"',
        advanceOn: 'unlocked',
      });
    }

    steps.push(
      {
        target: '#themeSwatches',
        panel: 'open',
        title: 'Chọn nhanh màu gợi ý',
        text: 'Bấm vào một ô màu, <b>toàn bộ trang đổi màu ngay</b> để bạn xem trước. Lúc này màu chưa được lưu.',
        hint: '👉 Bấm thử một màu bất kỳ',
      },
      {
        target: ['.theme-preview', '#themeLight'],
        panel: 'open',
        title: 'Tự pha màu riêng',
        text: 'Kéo 3 thanh <b>Sắc màu</b>, <b>Độ đậm</b>, <b>Độ sáng</b>; hoặc nhập mã màu (vd: <b>#2563EB</b>); hoặc bấm <b>🎯</b> để mở bảng màu đầy đủ. Nếu màu quá sáng, bảng sẽ cảnh báo để bạn chỉnh cho chữ dễ đọc.',
      },
      {
        target: '.theme-actions',
        panel: 'open',
        title: 'Lưu & khóa màu',
        text: 'Ưng ý rồi thì bấm <b>🔒 Áp dụng &amp; khóa</b>: màu được giữ cho những lần mở trang sau. <b>Hủy</b> (hoặc Esc, bấm ra ngoài) sẽ trả lại màu cũ. <b>Mặc định</b> quay về màu xanh lá.',
        hint: '👉 Chọn xong thì bấm "Áp dụng & khóa"',
        advanceOn: 'panel-close',
      },
      {
        target: '#themeBtn',
        panel: 'closed',
        title: '🎉 Xong rồi!',
        text: 'Màu được lưu riêng trên trình duyệt của bạn, không ảnh hưởng người khác. Muốn xem lại hướng dẫn: mở bảng màu và bấm <b>❔</b>.',
        nextLabel: 'Hoàn tất',
      }
    );

    return steps;
  }

  /* ============ Dựng giao diện tour ============ */

  let layer, spot, tip, blocks, els;
  let steps = [];
  let idx = 0;
  let active = false;
  let rafId = null;
  let lastKey = '';
  let changeTimer = null;

  function buildDom() {
    layer = document.createElement('div');
    layer.className = 'tour-layer';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-labelledby', 'tourTitle');
    layer.innerHTML = `
      <div class="tour-block" data-side="top"></div>
      <div class="tour-block" data-side="bottom"></div>
      <div class="tour-block" data-side="left"></div>
      <div class="tour-block" data-side="right"></div>
      <div class="tour-spot"></div>
      <div class="tour-tip" data-place="center">
        <span class="tour-arrow"></span>
        <div class="tour-step"></div>
        <div class="tour-title" id="tourTitle"></div>
        <div class="tour-text"></div>
        <div class="tour-hint" hidden></div>
        <div class="tour-foot">
          <div class="tour-dots"></div>
          <div class="tour-btns">
            <button type="button" class="tour-btn-skip">Bỏ qua</button>
            <button type="button" class="tour-btn-back">Quay lại</button>
            <button type="button" class="tour-btn-next">Tiếp</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(layer);

    spot = layer.querySelector('.tour-spot');
    tip = layer.querySelector('.tour-tip');
    blocks = {};
    layer.querySelectorAll('.tour-block').forEach(b => { blocks[b.dataset.side] = b; });
    els = {
      step: tip.querySelector('.tour-step'),
      title: tip.querySelector('.tour-title'),
      text: tip.querySelector('.tour-text'),
      hint: tip.querySelector('.tour-hint'),
      dots: tip.querySelector('.tour-dots'),
      skip: tip.querySelector('.tour-btn-skip'),
      back: tip.querySelector('.tour-btn-back'),
      next: tip.querySelector('.tour-btn-next'),
    };

    els.skip.addEventListener('click', () => end(false));
    els.back.addEventListener('click', () => go(idx - 1));
    els.next.addEventListener('click', () => go(idx + 1));

    // Bấm vào vùng tối -> rung nhẹ hộp hướng dẫn để người dùng chú ý
    Object.values(blocks).forEach(b => {
      b.addEventListener('click', () => {
        tip.classList.remove('shake');
        void tip.offsetWidth;
        tip.classList.add('shake');
      });
    });
  }

  function setBox(el, x, y, w, h) {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${Math.max(0, w)}px`;
    el.style.height = `${Math.max(0, h)}px`;
  }

  /* ============ Tính vị trí vùng sáng & hộp hướng dẫn ============ */

  function targetRect(step) {
    if (!step.target) return null;
    const selectors = Array.isArray(step.target) ? step.target : [step.target];
    let rect = null;

    selectors.forEach(sel => {
      const el = document.querySelector(sel);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return; // đang bị ẩn
      rect = rect
        ? {
            left: Math.min(rect.left, r.left),
            top: Math.min(rect.top, r.top),
            right: Math.max(rect.right, r.right),
            bottom: Math.max(rect.bottom, r.bottom),
          }
        : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
    return rect;
  }

  function layout() {
    const step = steps[idx];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = targetRect(step);
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;

    // Chỉ cập nhật DOM khi có thay đổi
    const key = rect
      ? `${idx}|${Math.round(rect.left)}|${Math.round(rect.top)}|${Math.round(rect.right)}|${Math.round(rect.bottom)}|${vw}|${vh}|${tw}|${th}`
      : `${idx}|c|${vw}|${vh}|${tw}|${th}`;
    if (key === lastKey) return;
    lastKey = key;

    // Không có mục tiêu -> hộp ở giữa, chặn toàn màn hình
    if (!rect) {
      spot.classList.add('is-center');
      setBox(spot, vw / 2, vh / 2, 0, 0);
      setBox(blocks.top, 0, 0, vw, vh);
      setBox(blocks.bottom, 0, 0, 0, 0);
      setBox(blocks.left, 0, 0, 0, 0);
      setBox(blocks.right, 0, 0, 0, 0);
      tip.dataset.place = 'center';
      tip.style.left = `${Math.max(EDGE, (vw - tw) / 2)}px`;
      tip.style.top = `${Math.max(EDGE, (vh - th) / 2)}px`;
      return;
    }

    spot.classList.remove('is-center');
    const x = Math.max(4, rect.left - SPOT_PAD);
    const y = Math.max(4, rect.top - SPOT_PAD);
    const w = Math.min(vw - 4, rect.right + SPOT_PAD) - x;
    const h = Math.min(vh - 4, rect.bottom + SPOT_PAD) - y;

    setBox(spot, x, y, w, h);
    setBox(blocks.top, 0, 0, vw, y);
    setBox(blocks.bottom, 0, y + h, vw, vh - (y + h));
    setBox(blocks.left, 0, y, x, h);
    setBox(blocks.right, x + w, y, vw - (x + w), h);

    // Ưu tiên đặt hộp bên dưới, không đủ chỗ thì bên trên, cuối cùng là bên cạnh
    let place;
    let left;
    let top;
    const spaceBelow = vh - (y + h);
    const spaceAbove = y;

    if (spaceBelow >= th + GAP + EDGE) {
      place = 'bottom';
      top = y + h + GAP;
    } else if (spaceAbove >= th + GAP + EDGE) {
      place = 'top';
      top = y - GAP - th;
    } else {
      place = 'side';
      top = Math.min(Math.max(EDGE, y), vh - th - EDGE);
      left = (vw - (x + w) >= tw + GAP + EDGE) ? x + w + GAP : Math.max(EDGE, x - GAP - tw);
    }

    if (place !== 'side') {
      left = Math.min(Math.max(EDGE, x + w / 2 - tw / 2), vw - tw - EDGE);
      const arrowX = Math.min(Math.max(20, x + w / 2 - left), tw - 20);
      tip.style.setProperty('--arrow-x', `${arrowX}px`);
    }

    tip.dataset.place = place;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  // Header dính (sticky) có thể co giãn khi cuộn, bảng màu có hiệu ứng mở ->
  // cập nhật vị trí liên tục mỗi khung hình khi tour đang chạy (chỉ ghi DOM khi có thay đổi).
  function tick() {
    if (!active) return;
    layout();
    rafId = requestAnimationFrame(tick);
  }

  /* ============ Điều hướng các bước ============ */

  function renderDots() {
    els.dots.innerHTML = steps
      .map((_, i) => `<span class="${i === idx ? 'active' : i < idx ? 'done' : ''}"></span>`)
      .join('');
  }

  function go(next) {
    if (!active) return;
    if (next < 0) return;
    if (next >= steps.length) { end(true); return; }

    idx = next;
    const step = steps[idx];
    const p = picker();

    // Đưa bảng màu về đúng trạng thái của bước này
    let needWait = false;
    if (p) {
      if (step.panel === 'open' && !p.isOpen()) { p.open(); needWait = true; }
      if (step.panel === 'closed' && p.isOpen()) { p.close(false); needWait = true; }
    }

    // Ẩn hộp trong lúc đổi nội dung / chờ bảng màu mở xong
    tip.classList.add('is-changing');
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      const total = steps.length;
      els.step.textContent = idx === 0 ? 'Hướng dẫn nhanh' : `Bước ${idx}/${total - 1}`;
      els.title.textContent = step.title;
      els.text.innerHTML = step.text;
      els.hint.hidden = !step.hint;
      els.hint.textContent = step.hint || '';
      els.back.hidden = idx === 0;
      els.skip.hidden = idx === total - 1;
      els.next.textContent = step.nextLabel || 'Tiếp';
      renderDots();

      lastKey = '';
      layout();
      tip.classList.remove('is-changing');
      els.next.focus({ preventScroll: true });
    }, needWait ? 260 : 140);
  }

  function start() {
    if (active) return;
    if (!picker()) {
      console.warn('[tour] Chưa có bộ chọn màu (theme.js) — bỏ qua hướng dẫn.');
      return;
    }
    if (!layer) buildDom();

    steps = buildSteps();
    idx = 0;
    active = true;
    lastKey = '';
    root.classList.add('tour-active');
    layer.hidden = false;
    requestAnimationFrame(() => layer.classList.add('show'));

    go(0);
    rafId = requestAnimationFrame(tick);
  }

  function end(completed) {
    if (!active) return;
    active = false;
    markSeen();
    cancelAnimationFrame(rafId);
    clearTimeout(changeTimer);
    root.classList.remove('tour-active');

    // Bỏ qua giữa chừng khi bảng đang mở -> đóng lại, trả về màu đã lưu
    const p = picker();
    if (!completed && p && p.isOpen()) p.close(false);

    layer.classList.remove('show');
    setTimeout(() => { if (!active) layer.hidden = true; }, 300);

    const btn = document.getElementById('themeBtn');
    if (btn) btn.focus({ preventScroll: true });
  }

  /* ============ Tự chuyển bước khi người dùng làm đúng thao tác ============ */

  function advanceIf(trigger) {
    if (!active) return;
    const step = steps[idx];
    if (step && step.advanceOn === trigger) go(idx + 1);
  }

  window.addEventListener('fac:themepanel', e => {
    advanceIf(e.detail && e.detail.open ? 'panel-open' : 'panel-close');
  });
  window.addEventListener('fac:themeunlocked', () => advanceIf('unlocked'));

  /* ============ Bàn phím ============ */

  document.addEventListener('keydown', e => {
    if (!active) return;
    const el = document.activeElement;
    const typing = el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);

    if (e.key === 'Escape') {
      e.preventDefault();
      end(false);
    } else if (!typing && e.key === 'ArrowRight') {
      e.preventDefault();
      go(idx + 1);
    } else if (!typing && e.key === 'ArrowLeft') {
      e.preventDefault();
      go(idx - 1);
    }
  });

  /* ============ Tự hiện cho người dùng mới ============ */

  function maybeAutoStart() {
    const savedTheme = window.FacTheme && window.FacTheme.getSaved && window.FacTheme.getSaved();
    // Đã xem hướng dẫn, hoặc đã từng tự chọn & lưu màu -> không phải người mới
    if (hasSeen() || savedTheme) return;
    setTimeout(() => {
      // Người dùng đang gõ tìm kiếm thì không làm phiền
      const el = document.activeElement;
      if (el && el.tagName === 'INPUT') return;
      start();
    }, AUTO_START_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeAutoStart);
  } else {
    maybeAutoStart();
  }

  // API: FacTour.start() xem lại, FacTour.reset() để lần tải trang sau tự hiện lại
  window.FacTour = {
    start,
    stop: () => end(false),
    reset() {
      try { localStorage.removeItem(SEEN_KEY); } catch (e) { /* bỏ qua */ }
    },
  };
})();