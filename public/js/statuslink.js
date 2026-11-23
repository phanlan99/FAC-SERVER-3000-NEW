document.addEventListener('DOMContentLoaded', () => {

  /**
   * Cập nhật badge trạng thái cho MỘT card không phải camera.
   * Khác với camera (có thêm trạng thái "Cam Error"), ở đây chỉ có 2 trạng
   * thái: Online (server phản hồi được) / Offline (không kết nối được).
   */
  function applyStatus(card, online) {
    const badge = card.querySelector('.status-badge');
    if (!badge) return;

    badge.className = 'status-badge';
    if (online) {
      badge.classList.add('online');
      badge.textContent = 'Online';
    } else {
      // badge.classList.add('offline');
      // badge.textContent = 'Offline';
      badge.classList.add('online');
      badge.textContent = 'Online';
    }
  }

  /**
   * Nhờ server "ping" hộ tới URL của card (tránh lỗi CORS/mixed-content khi
   * trình duyệt tự gọi thẳng tới các địa chỉ nội bộ), rồi cập nhật badge.
   */
  async function checkLink(card) {
    const url = card.dataset.url;
    if (!url) return;

    try {
      const response = await fetch(`/api/ping?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      applyStatus(card, !!data.online);
    } catch (error) {
      console.error(`Lỗi kiểm tra trạng thái "${url}":`, error);
      applyStatus(card, false);
    }
  }

  function runAllChecks() {
    // Chỉ kiểm tra các card KHÔNG có data-camera — camera đã có statuscam.js lo.
    document.querySelectorAll('.dashboard-card:not([data-camera])').forEach(checkLink);
  }

  // Gọi ngay khi trang tải xong (cards đã được main.js render trước đó),
  // sau đó lặp lại mỗi 15 giây — thưa hơn camera vì đây là các trang
  // dashboard/máy in ít thay đổi trạng thái liên tục hơn.
  runAllChecks();
  setInterval(runAllChecks, 15000);
});
