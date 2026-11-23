document.addEventListener('DOMContentLoaded', () => {

  /* ============ Đồng hồ ============ */
  function updateDateTime() {
    const now = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('vi-VN', dateOptions);

    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('currentTime').textContent = `${h}:${m}:${s}`;
  }
  updateDateTime();
  setInterval(updateDateTime, 1000);

  /* ============ Dữ liệu (xem public/js/data.js để thêm danh mục / card) ============ */
  const { categories, cards } = window.APP_DATA;

  const sidebarNav = document.getElementById('sidebarNav');
  const grid = document.getElementById('dashboardGrid');
  const emptyState = document.getElementById('emptyState');
  const pageTitle = document.getElementById('pageTitle');
  const pageSub = document.getElementById('pageSub');
  const resultCount = document.getElementById('resultCount');
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const viewToggle = document.getElementById('viewToggle');
  const viewHighlight = document.getElementById('viewToggleHighlight');
  const viewButtons = Array.from(viewToggle.querySelectorAll('.view-btn'));
  const stickyHead = document.getElementById('stickyHead');

  let activeNavEl = null; // nút danh mục đang chọn, dùng để khôi phục khi xoá ô tìm kiếm
  const VIEW_STORAGE_KEY = 'fac-server-view';

  /* ============ Tiện ích: bỏ dấu tiếng Việt để tìm kiếm không cần gõ dấu ============ */
  function normalize(str) {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  function countFor(menuId) {
    return menuId === 'all' ? cards.length : cards.filter(c => c.menu === menuId).length;
  }

  /**
   * Nếu người dùng đã cuộn quá đầu danh sách card (card đầu bị header che),
   * cuộn về đầu trang để thấy kết quả lọc/tìm kiếm mới ngay từ đầu.
   */
  function scrollToGridTopIfNeeded() {
    const headBottom = stickyHead ? stickyHead.getBoundingClientRect().bottom : 0;
    if (grid.getBoundingClientRect().top < headBottom) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ============ Dựng sidebar đệ quy — hỗ trợ lồng bao nhiêu tầng cũng được ============ */
  function buildNavNode(node) {
    const isParent = Array.isArray(node.children) && node.children.length > 0;

    if (!isParent) {
      // Danh mục lá -> nút lọc
      const btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.dataset.menu = node.id;
      btn.dataset.label = node.fullLabel || node.label;
      btn.dataset.sub = node.sub || '';
      btn.innerHTML = `
        <span class="nav-icon">${node.icon || '📄'}</span>
        <span>${node.label}</span>
        <span class="nav-count" id="count-${node.id}"></span>
      `;
      return btn;
    }

    // Danh mục cha -> nhóm xổ/thu gọn, chứa các node con (đệ quy)
    const group = document.createElement('div');
    group.className = 'nav-group expanded';
    group.dataset.group = node.id;

    const parentBtn = document.createElement('button');
    parentBtn.className = 'nav-parent';
    parentBtn.dataset.groupToggle = node.id;
    parentBtn.innerHTML = `
      <span class="nav-icon">${node.icon || '📁'}</span>
      <span>${node.label}</span>
      <span class="chevron">▾</span>
    `;

    const childrenWrap = document.createElement('div');
    childrenWrap.className = 'nav-children';
    childrenWrap.dataset.children = node.id;

    const childrenInner = document.createElement('div');
    childrenInner.className = 'nav-children-inner';

    node.children.forEach(child => {
      childrenInner.appendChild(buildNavNode(child));
    });

    childrenWrap.appendChild(childrenInner);
    group.appendChild(parentBtn);
    group.appendChild(childrenWrap);
    return group;
  }

  function renderSidebar() {
    sidebarNav.innerHTML = '';

    sidebarNav.insertAdjacentHTML('beforeend', `<div class="nav-eyebrow">Tổng quan</div>`);
    const allBtn = document.createElement('button');
    allBtn.className = 'nav-item active';
    allBtn.dataset.menu = 'all';
    allBtn.dataset.label = 'Tất cả hệ thống';
    allBtn.dataset.sub = 'Toàn bộ dashboard, camera & công cụ giám sát';
    allBtn.innerHTML = `
      <span class="nav-icon">💠</span>
      <span>Tất cả</span>
      <span class="nav-count" id="count-all"></span>
    `;
    sidebarNav.appendChild(allBtn);
    activeNavEl = allBtn;

    sidebarNav.insertAdjacentHTML('beforeend', `<div class="nav-eyebrow">Khu vực</div>`);
    categories.forEach(cat => sidebarNav.appendChild(buildNavNode(cat)));

    // Đổ số đếm cho từng nút (lá + tất cả)
    document.getElementById('count-all').textContent = countFor('all');
    sidebarNav.querySelectorAll('.nav-item[data-menu]:not([data-menu="all"])').forEach(item => {
      const countEl = item.querySelector('.nav-count');
      if (countEl) countEl.textContent = countFor(item.dataset.menu);
    });
  }

  /* ============ Dựng grid card từ CARDS, đánh số thứ tự tự động ============ */
  function renderCards() {
    grid.innerHTML = '';
    const pad = Math.max(2, String(cards.length).length);

    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'dashboard-card';
      el.dataset.menu = card.menu;
      el.dataset.url = card.url;
      if (card.camera) el.dataset.camera = card.camera;
      // Chuỗi tìm kiếm đã chuẩn hoá (không dấu, viết thường), tính sẵn 1 lần
      // để lúc gõ tìm kiếm không phải normalize() lại nhiều lần.
      el.dataset.search = normalize(`${card.title} ${card.desc || ''}`);

      const number = String(i + 1).padStart(pad, '0');

      el.innerHTML = `
        <div class="card-top">
          <div class="card-icon">${card.icon || '🔗'}</div>
          <span class="card-index">${number}</span>
        </div>
        <div class="card-title">${card.title}</div>
        <div class="card-desc">${card.desc || ''}</div>
        <div class="card-footer">
          <span class="status-badge checking">Đang kiểm tra…</span>
          <span class="card-open">Mở →</span>
        </div>
      `;

      el.addEventListener('click', () => {
        el.style.transform = 'scale(0.96)';
        setTimeout(() => { el.style.transform = ''; }, 150);
        setTimeout(() => window.open(card.url, '_blank'), 160);
      });

      grid.appendChild(el);
    });
  }

  /* ============ Chạy lại animation fade/so le cho 1 danh sách card ============ */
  function animateIn(cardEls) {
    cardEls.forEach((card, i) => {
      card.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      card.offsetHeight; // reflow để chạy lại animation
      card.style.animation = '';
      card.style.animationDelay = `${Math.min(i, 20) * 45}ms`;
    });
  }

  /* ============ Hiển thị 1 tập card khớp điều kiện, có animation so le ============ */
  function showMatching(matchFn) {
    const cardEls = Array.from(grid.querySelectorAll('.dashboard-card'));
    const visible = [];

    cardEls.forEach(card => {
      if (matchFn(card)) {
        card.style.display = '';
        visible.push(card);
      } else {
        card.style.display = 'none';
      }
    });

    animateIn(visible);

    resultCount.textContent = `${visible.length} mục`;
    emptyState.style.display = visible.length === 0 ? 'block' : 'none';
    grid.style.display = visible.length === 0 ? 'none' : '';
    return visible.length;
  }

  /* ============ Lọc theo danh mục đang chọn ở sidebar ============ */
  function applyFilter(menuId) {
    showMatching(card => menuId === 'all' || card.dataset.menu === menuId);
  }

  function setActiveNav(target) {
    sidebarNav.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    target.classList.add('active');
    activeNavEl = target;

    const parentGroup = target.closest('.nav-group');
    if (parentGroup) parentGroup.classList.add('expanded');

    renderHeaderFromNav(target);
    applyFilter(target.dataset.menu);
    scrollToGridTopIfNeeded();
  }

  function renderHeaderFromNav(target) {
    const icon = target.querySelector('.nav-icon').textContent;
    pageTitle.textContent = `${icon} ${target.dataset.label}`;
    pageSub.textContent = target.dataset.sub || '';
  }

  /* ============ Tìm kiếm — lọc theo tiêu đề & mô tả trên MỌI card ============ */
  function applySearch(rawQuery) {
    const query = normalize(rawQuery);

    if (!query) {
      searchClear.classList.remove('show');
      renderHeaderFromNav(activeNavEl);
      applyFilter(activeNavEl.dataset.menu);
      return;
    }

    searchClear.classList.add('show');
    const count = showMatching(card => card.dataset.search.includes(query));

    pageTitle.textContent = `🔍 Kết quả cho "${rawQuery.trim()}"`;
    pageSub.textContent = count > 0
      ? `Tìm thấy ${count} mục khớp với từ khoá`
      : 'Không có mục nào khớp với từ khoá bạn nhập';

    scrollToGridTopIfNeeded();
  }

  let searchDebounce = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => applySearch(searchInput.value), 120);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      applySearch('');
      searchInput.blur();
    }
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    applySearch('');
    searchInput.focus();
  });

  // Phím tắt "/" để nhảy vào ô tìm kiếm từ bất kỳ đâu trên trang
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ============ Chuyển đổi Grid / List ============ */
  function moveHighlight(btn, instant) {
    if (instant) viewHighlight.style.transition = 'none';
    viewHighlight.style.width = `${btn.offsetWidth}px`;
    viewHighlight.style.transform = `translateX(${btn.offsetLeft - 4}px)`;
    if (instant) {
      // ép reflow rồi mới bật lại transition, tránh hiệu ứng trượt từ 0 lúc mới tải trang
      // eslint-disable-next-line no-unused-expressions
      viewHighlight.offsetHeight;
      viewHighlight.style.transition = '';
    }
  }

  function setView(mode, opts = {}) {
    const { instant = false, persist = true } = opts;

    grid.classList.toggle('list-view', mode === 'list');

    viewButtons.forEach(btn => {
      const isActive = btn.dataset.view === mode;
      btn.classList.toggle('active', isActive);
      if (isActive) moveHighlight(btn, instant);
    });

    if (persist) {
      try { localStorage.setItem(VIEW_STORAGE_KEY, mode); } catch (e) { /* Safari private mode, v.v. — bỏ qua */ }
    }

    // Đổi bố cục xong thì chạy lại animation cho các card đang hiển thị
    // để cảm giác chuyển view mượt như đang lọc lại danh mục.
    const visibleCards = Array.from(grid.querySelectorAll('.dashboard-card')).filter(c => c.style.display !== 'none');
    animateIn(visibleCards);
  }

  viewButtons.forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  window.addEventListener('resize', () => {
    const activeBtn = viewButtons.find(b => b.classList.contains('active'));
    if (activeBtn) moveHighlight(activeBtn, true);
  });

  /* ============ Gắn sự kiện cho sidebar (event delegation — hoạt động cả với node lồng sâu) ============ */
  function wireSidebarEvents() {
    sidebarNav.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem) {
        // Chọn danh mục mới thì reset ô tìm kiếm để tránh gây nhầm lẫn kết quả
        searchInput.value = '';
        searchClear.classList.remove('show');
        setActiveNav(navItem);
        closeSidebarMobile();
        return;
      }
      const groupToggle = e.target.closest('[data-group-toggle]');
      if (groupToggle) {
        groupToggle.closest('.nav-group').classList.toggle('expanded');
      }
    });
  }

  /* ============ Sidebar trên mobile ============ */
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarScrim = document.getElementById('sidebarScrim');

  function closeSidebarMobile() {
    sidebar.classList.remove('open');
    sidebarScrim.classList.remove('open');
  }
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    sidebarScrim.classList.toggle('open');
  });
  sidebarScrim.addEventListener('click', closeSidebarMobile);

  /* ============ Banner chữ chạy — tốc độ cố định trên mọi màn hình ============ */
  // Trước đây dùng duration cố định 18s + padding-left: 100% nên màn hình càng
  // rộng chữ chạy càng nhanh. Giờ tính duration theo quãng đường thực tế (px)
  // để mọi máy đều chạy cùng 1 tốc độ.
  function setupMarquee() {
    const banner = document.getElementById('hnyBanner');
    if (!banner) return;
    const track = banner.querySelector('.hny-track');
    const firstItem = track.querySelector('.hny-item');
    if (!firstItem) return;

    const template = firstItem.cloneNode(true);
    const SPEED = 60; // px/giây — tăng để chữ chạy nhanh hơn, giảm để chậm hơn
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function build() {
      banner.classList.remove('is-running', 'is-static');
      track.innerHTML = '';

      // Máy tắt hiệu ứng động -> hiển thị tĩnh, không chạy
      if (reduceMotion.matches) {
        track.appendChild(template.cloneNode(true));
        banner.classList.add('is-static');
        return;
      }

      // Nhóm 1: nhân bản nội dung cho đủ phủ kín chiều ngang banner
      const group = document.createElement('div');
      group.className = 'hny-group';
      track.appendChild(group);
      do {
        group.appendChild(template.cloneNode(true));
      } while (group.getBoundingClientRect().width < banner.clientWidth && group.children.length < 20);

      // Nhóm 2: bản sao y hệt -> dịch -50% là quay vòng liền mạch, không có khoảng trống
      const clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);

      const distance = group.getBoundingClientRect().width;
      if (!distance) return; // banner đang bị ẩn, chưa đo được

      track.style.setProperty('--marquee-duration', `${(distance / SPEED).toFixed(2)}s`);
      void track.offsetWidth; // reflow để animation chạy lại từ đầu
      banner.classList.add('is-running');
    }

    build();

    // Font Google tải xong sẽ làm thay đổi độ rộng chữ -> đo lại
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build).catch(() => { /* bỏ qua */ });
    }

    let resizeTimer = null;
    let lastWidth = banner.clientWidth;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (banner.clientWidth !== lastWidth) {
          lastWidth = banner.clientWidth;
          build();
        }
      }, 200);
    });

    // Người dùng bật/tắt hiệu ứng động của hệ điều hành khi trang đang mở
    if (reduceMotion.addEventListener) {
      reduceMotion.addEventListener('change', build);
    } else if (reduceMotion.addListener) {
      reduceMotion.addListener(build); // Safari/Edge cũ
    }
  }

  /* ============ Header cố định: thu gọn khi cuộn xuống ============ */
  function setupStickyHeader() {
    if (!stickyHead) return;

    // Ngưỡng vào/ra khác nhau (hysteresis) để header không nhấp nháy
    // khi đứng ngay ranh giới cuộn.
    const ENTER = 80;
    const EXIT = 8;
    let stuck = false;
    let ticking = false;

    function update() {
      ticking = false;
      const y = window.scrollY;

      if (!stuck && y > ENTER) {
        // Chỉ thu gọn khi trang đủ dài, tránh trường hợp header co lại
        // làm hết chỗ cuộn rồi bung ra liên tục.
        const room = document.documentElement.scrollHeight - window.innerHeight;
        if (room > ENTER + 160) {
          stuck = true;
          stickyHead.classList.add('is-stuck');
        }
      } else if (stuck && y < EXIT) {
        stuck = false;
        stickyHead.classList.remove('is-stuck');
      }
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    update();
  }

  /* ============ Khởi tạo ============ */
  renderSidebar();
  renderCards();
  wireSidebarEvents();
  applyFilter('all');
  setupMarquee();
  setupStickyHeader();

  let savedView = 'grid';
  try { savedView = localStorage.getItem(VIEW_STORAGE_KEY) || 'grid'; } catch (e) { /* bỏ qua nếu trình duyệt chặn localStorage */ }
  setView(savedView, { instant: true, persist: false });
});