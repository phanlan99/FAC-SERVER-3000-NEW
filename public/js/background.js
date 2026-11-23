/**
 * ==========================================================================
 *  NỀN ĐỘNG VÙNG MAIN — mạng lưới IoT trên canvas
 * ==========================================================================
 *  - Các "node" (thiết bị) trôi chậm, nối với nhau khi ở gần.
 *  - Thỉnh thoảng có "gói dữ liệu" (chấm sáng) chạy dọc theo đường nối.
 *  - Rê chuột tới đâu, các node gần đó tự nối dây về con trỏ.
 *
 *  Tối ưu cho máy văn phòng / máy nhà máy:
 *  - Giới hạn 30 FPS, giới hạn số node theo diện tích màn hình.
 *  - Tự dừng khi chuyển tab / thu nhỏ trình duyệt.
 *  - Tự giảm số node nếu máy chậm; chậm hơn nữa thì tắt hẳn canvas.
 *  - Máy tắt hiệu ứng động (prefers-reduced-motion) -> chỉ vẽ 1 khung tĩnh.
 *
 *  Muốn chỉnh mật độ / tốc độ / màu: sửa CONFIG và COLORS bên dưới.
 * ==========================================================================
 */
(() => {
  'use strict';

  const canvas = document.getElementById('bgCanvas');
  const host = document.getElementById('mainBg');
  if (!canvas || !host) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const CONFIG = {
    density: 16000,       // px² cho mỗi node — số càng nhỏ càng nhiều node
    minNodes: 18,
    maxNodes: 70,
    linkDist: 150,        // khoảng cách tối đa để 2 node nối dây (px)
    mouseDist: 190,       // bán kính nối dây về con trỏ chuột (px)
    speed: 0.28,          // tốc độ trôi (px mỗi khung 60fps)
    fps: 30,
    pulseEvery: 650,      // ms giữa 2 lần phát gói dữ liệu
    maxPulses: 10,
    pulseDuration: 1500,  // ms để gói dữ liệu chạy hết 1 đường nối
  };

  // Màu theo palette xanh của trang (định dạng "r,g,b" để ghép alpha)
  const COLORS = {
    node:  '23,160,90',
    hub:   '16,107,65',
    link:  '20,138,79',
    pulse: '52,193,122',
    mouse: '23,160,90',
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lowPower =
    (navigator.hardwareConcurrency || 8) <= 4 ||
    (navigator.deviceMemory && navigator.deviceMemory <= 4);

  let width = 0;
  let height = 0;
  let nodes = [];
  let links = [];
  let pulses = [];

  let rafId = null;
  let lastFrame = 0;
  let lastPulse = 0;
  let degraded = false;     // đã giảm số node vì máy chậm
  let disabled = false;     // đã tắt hẳn canvas
  let perfSamples = [];

  const mouse = { x: -9999, y: -9999, active: false };

  /* ============ Kích thước & khởi tạo node ============ */

  function targetCount() {
    let n = Math.round((width * height) / CONFIG.density);
    if (lowPower || degraded) n = Math.round(n * 0.55);
    return Math.max(CONFIG.minNodes, Math.min(CONFIG.maxNodes, n));
  }

  function makeNode() {
    const angle = Math.random() * Math.PI * 2;
    const sp = CONFIG.speed * (0.4 + Math.random() * 0.8);
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      r: 1.4 + Math.random() * 1.6,
      hub: Math.random() < 0.12,          // ~12% là node "trạm" to hơn, có vòng nhấp nháy
      phase: Math.random() * Math.PI * 2, // lệch pha để các trạm nhấp nháy không đồng loạt
    };
  }

  function seedNodes() {
    const n = targetCount();
    while (nodes.length < n) nodes.push(makeNode());
    if (nodes.length > n) nodes.length = n;

    // Node nằm ngoài khung sau khi resize -> đưa về lại trong khung
    nodes.forEach(p => {
      if (p.x > width) p.x = Math.random() * width;
      if (p.y > height) p.y = Math.random() * height;
    });
    pulses = [];
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);

    // Giới hạn DPR 1.5 để màn hình 4K không phải vẽ quá nhiều pixel
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    seedNodes();
    if (!rafId) drawFrame(performance.now()); // vẽ lại ngay khi đang dừng (vd: chế độ tĩnh)
  }

  /* ============ Cập nhật vị trí ============ */

  function step(dt) {
    for (const p of nodes) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Chạm mép thì bật lại
      if (p.x < 0)      { p.x = 0;      p.vx = Math.abs(p.vx); }
      if (p.x > width)  { p.x = width;  p.vx = -Math.abs(p.vx); }
      if (p.y < 0)      { p.y = 0;      p.vy = Math.abs(p.vy); }
      if (p.y > height) { p.y = height; p.vy = -Math.abs(p.vy); }

      // Node gần chuột bị hút nhẹ về phía con trỏ
      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < CONFIG.mouseDist * CONFIG.mouseDist && d2 > 400) {
          p.x += dx * 0.0025 * dt;
          p.y += dy * 0.0025 * dt;
        }
      }
    }
  }

  /* ============ Vẽ ============ */

  function drawLinks() {
    links = [];
    const maxD2 = CONFIG.linkDist * CONFIG.linkDist;
    ctx.lineWidth = 1;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > maxD2) continue;

        const alpha = (1 - Math.sqrt(d2) / CONFIG.linkDist) * 0.22;
        ctx.strokeStyle = `rgba(${COLORS.link},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        links.push([i, j]);
      }
    }
  }

  function drawMouseLinks() {
    if (!mouse.active) return;
    const maxD = CONFIG.mouseDist;

    for (const p of nodes) {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > maxD) continue;

      const alpha = (1 - d / maxD) * 0.45;
      ctx.strokeStyle = `rgba(${COLORS.mouse},${alpha.toFixed(3)})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(mouse.x, mouse.y);
      ctx.stroke();
    }

    // Quầng sáng nhỏ tại con trỏ
    const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 60);
    g.addColorStop(0, `rgba(${COLORS.pulse},0.18)`);
    g.addColorStop(1, `rgba(${COLORS.pulse},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 60, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawNodes(now) {
    for (const p of nodes) {
      if (p.hub) {
        // Vòng tròn "phát sóng" quanh node trạm
        const t = (Math.sin(now / 900 + p.phase) + 1) / 2; // 0..1
        ctx.strokeStyle = `rgba(${COLORS.hub},${(0.25 * (1 - t)).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 3 + t * 9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(${COLORS.hub},0.75)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${COLORS.node},0.5)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function spawnPulse(now) {
    if (now - lastPulse < CONFIG.pulseEvery) return;
    if (pulses.length >= CONFIG.maxPulses || links.length === 0) return;
    lastPulse = now;

    const [i, j] = links[Math.floor(Math.random() * links.length)];
    // Chiều chạy ngẫu nhiên
    pulses.push(Math.random() < 0.5 ? { a: i, b: j, t0: now } : { a: j, b: i, t0: now });
  }

  function drawPulses(now) {
    const maxD2 = CONFIG.linkDist * CONFIG.linkDist;

    pulses = pulses.filter(pl => {
      const a = nodes[pl.a];
      const b = nodes[pl.b];
      if (!a || !b) return false;

      const progress = (now - pl.t0) / CONFIG.pulseDuration;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      // Hết đường hoặc 2 node đã trôi xa nhau (đứt dây) -> bỏ gói này
      if (progress >= 1 || dx * dx + dy * dy > maxD2) return false;

      // Ease in-out cho chuyển động mềm
      const e = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const x = a.x + dx * e;
      const y = a.y + dy * e;
      const fade = Math.sin(progress * Math.PI); // hiện dần rồi mờ dần

      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, `rgba(${COLORS.pulse},${(0.9 * fade).toFixed(3)})`);
      g.addColorStop(1, `rgba(${COLORS.pulse},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${(0.95 * fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
      return true;
    });
  }

  function drawFrame(now) {
    ctx.clearRect(0, 0, width, height);
    drawLinks();
    drawMouseLinks();
    drawNodes(now);
    if (rafId) {
      spawnPulse(now);
      drawPulses(now);
    }
    canvas.classList.add('is-ready');
  }

  /* ============ Theo dõi hiệu năng — tự giảm tải nếu máy chậm ============ */

  function trackPerf(cost) {
    perfSamples.push(cost);
    if (perfSamples.length < 60) return;

    const avg = perfSamples.reduce((s, v) => s + v, 0) / perfSamples.length;
    perfSamples = [];

    if (!degraded && avg > 10) {
      degraded = true;
      seedNodes();
      console.info('[background] Máy hơi chậm -> giảm số node hiệu ứng nền.');
    } else if (degraded && avg > 18) {
      disabled = true;
      stop();
      host.classList.add('bg-lite');
      console.info('[background] Máy chậm -> tắt hiệu ứng canvas nền để ưu tiên hiệu năng.');
    }
  }

  /* ============ Vòng lặp ============ */

  function loop(now) {
    rafId = requestAnimationFrame(loop);

    const interval = 1000 / CONFIG.fps;
    const elapsed = now - lastFrame;
    if (elapsed < interval - 1) return;

    // dt quy về đơn vị "khung 60fps"; chặn trên để tránh node nhảy cóc khi tab vừa quay lại
    const dt = Math.min(elapsed, 100) / (1000 / 60);
    lastFrame = now;

    const t0 = performance.now();
    step(dt);
    drawFrame(now);
    trackPerf(performance.now() - t0);
  }

  function start() {
    if (rafId || disabled || reduceMotion.matches || document.hidden) return;
    lastFrame = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* ============ Sự kiện ============ */

  // Chuột: canvas không nhận click (pointer-events: none) nên lắng nghe trên window
  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= rect.width && mouse.y <= rect.height;
  }, { passive: true });

  document.addEventListener('mouseleave', () => { mouse.active = false; });
  window.addEventListener('blur', () => { mouse.active = false; });

  // Chuyển tab / thu nhỏ -> dừng hẳn để không tốn CPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  // Kích thước vùng main đổi (resize cửa sổ, qua breakpoint mobile...)
  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  };
  if ('ResizeObserver' in window) {
    new ResizeObserver(onResize).observe(host);
  } else {
    window.addEventListener('resize', onResize);
  }

  // Người dùng bật/tắt hiệu ứng động của hệ điều hành khi đang mở trang
  const onMotionChange = () => {
    if (reduceMotion.matches) {
      stop();
      pulses = [];
      drawFrame(performance.now()); // giữ 1 khung tĩnh
    } else {
      start();
    }
  };
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionChange);
  else if (reduceMotion.addListener) reduceMotion.addListener(onMotionChange);

  /* ============ Khởi động ============ */
  resize();
  start();

  // API nhỏ để bật/tắt từ console hoặc tính năng khác sau này:
  //   FacBackground.pause()  /  FacBackground.resume()
  window.FacBackground = {
    pause: stop,
    resume: () => { disabled = false; host.classList.remove('bg-lite'); start(); },
  };
})();