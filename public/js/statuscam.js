document.addEventListener('DOMContentLoaded', () => {

  /**
   * Cập nhật badge trạng thái cho MỘT camera dựa trên kết quả trả về từ Node API.
   */
  function applyStatus(card, data) {
    const badge = card.querySelector('.status-badge');
    if (!badge) return;

    badge.className = 'status-badge';

    if (data.online && data.is_ok) {
      badge.classList.add('online');
      badge.textContent = 'Online';
    } else if (data.online && !data.is_ok) {
      badge.classList.add('warning');
      badge.textContent = 'Cam Error';
    } else {
      badge.classList.add('offline');
      badge.textContent = 'Offline';
    }
  }

  /**
   * Gọi API Node.js tương ứng cho MỘT camera và cập nhật badge của nó.
   * @param {HTMLElement} card - thẻ .dashboard-card có thuộc tính data-camera
   */
  async function checkCameraStatus(card) {
    const cameraKey = card.getAttribute('data-camera');
    if (!cameraKey) return;

    try {
      const response = await fetch(`/api/status/${cameraKey}`);
      const data = await response.json();
      applyStatus(card, data);
    } catch (error) {
      console.error(`Lỗi check status camera "${cameraKey}":`, error);
      applyStatus(card, { online: false, is_ok: false });
    }
  }

  function runAllChecks() {
    document.querySelectorAll('[data-camera]').forEach(checkCameraStatus);
  }

  // Gọi ngay khi trang tải xong, sau đó lặp lại mỗi 5 giây
  runAllChecks();
  setInterval(runAllChecks, 5000);
});
