const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ Middleware ============
app.use(express.json());

// Static assets
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/img', express.static(path.join(__dirname, 'public/img')));

// ============ API kiểm tra trạng thái Camera ============
// Toàn bộ camera được khai báo tập trung tại đây thay vì lặp lại code cho từng route.
const cameras = [
  { key: 'line810',        url: 'http://10.4.4.107:5000/api/status',   label: 'Line 8-10' },
  { key: 'mtsentou',       url: 'http://10.4.4.33:5000/api/status',    label: 'MTSentou' },
  { key: 'roomte',         url: 'http://10.4.7.6:5000/api/status',     label: 'Room TE (cũ)' },
  { key: 'forging32',      url: 'http://10.4.4.120:5001/api/status',   label: 'Forging3 Cam2' },
  { key: 'forging3',       url: 'http://10.4.6.93:5000/api/status',    label: 'Forging3' },
  { key: 'forging2',       url: 'http://10.4.5.42:5001/api/status',    label: 'Forging2' },
  { key: 'forging2screen', url: 'http://10.4.4.17:5002/api/status',    label: 'Forging2 Screen' },
  { key: 'guidekc',        url: 'http://10.4.5.207:5000/api/status',   label: 'GuideKC (A-2108)' },
  { key: 'guidekc2',       url: 'http://10.4.4.120:5000/api/status',   label: 'GuideKC (A-2375)' },
  { key: 'tapcheck1',      url: 'http://10.4.5.206:5000/api/status',   label: 'Tapcheck Cam1' },
  { key: 'tapcheck2',      url: 'http://10.4.5.206:5001/api/status',   label: 'Tapcheck Cam2' },
  { key: 'sgdt56',         url: 'http://10.4.5.205:5000/api/status',   label: 'SGDT56' },
  { key: 'smallforging',   url: 'http://10.4.5.203:5000/api/status',   label: 'SmallForging Cam1' },
  { key: 'smallforging1',  url: 'http://10.4.5.203:5001/api/status',   label: 'SmallForging Cam2' },
  { key: 'test',           url: 'http://10.4.4.44:5000/api/status',    label: 'Test' },
  { key: 'roomte1',        url: 'http://10.4.5.202:5000/api/status',   label: 'Room TE 1' },
  { key: 'roomte2',        url: 'http://10.4.5.202:5001/api/status',   label: 'Room TE 2' },
  { key: 'presskc',        url: 'http://10.4.4.131:5000/api/status',   label: 'PressKC' },
  { key: 'roomte3',        url: 'http://10.4.5.212:5000/api/status',   label: 'Room TE 3' },
  { key: 'tapcheck3',      url: 'http://10.4.6.179:5000/api/status',   label: 'Tapcheck 3' },
  { key: 'updateline10',   url: 'http://10.4.4.210:5000/api/status',   label: 'UpdateLine10 Cam1' },
  { key: 'updateline10_2', url: 'http://10.4.4.210:5001/api/status',   label: 'UpdateLine10 Cam2' },
  { key: 'backstopperjsh', url: 'http://10.4.6.162:5000/api/status',   label: 'BackStopperJSH' },
  { key: 'autoblade',      url: 'http://10.4.5.117:5000/api/status',   label: 'AutoBlade' },
  { key: 'clgsgp',         url: 'http://10.4.4.121:5000/api/status',   label: 'CLGSGP' },
  // { key: 'entousb',        url: 'http://10.4.5.131:5000/api/status',   label: 'EntouSB A-1456' },

];

cameras.forEach(({ key, url, label }) => {
  app.get(`/api/status/${key}`, async (req, res) => {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      res.json({
        online: true,
        is_ok: response.data.is_ok,
        message: response.data.status
      });
    } catch (error) {
      console.error(`Lỗi kết nối Camera ${label} (${key}):`, error.message);
      res.json({
        online: false,
        is_ok: false,
        message: 'Mất kết nối đến Server Camera'
      });
    }
  });
});

// ============ API kiểm tra "sống/chết" cho các trang không phải Camera ============
// Dùng chung cho mọi Dashboard/Printer/Alarm/... thay vì phải khai báo route
// riêng cho từng cái. Front-end (public/js/statuslink.js) gọi:
//   GET /api/ping?url=<encodeURIComponent(url)>
// và nhận về { online: true|false }.
//
// Vì endpoint này nhận URL tuỳ ý từ trình duyệt rồi để server gọi hộ, cần
// chặn để nó không bị lợi dụng dò quét ra ngoài Internet (SSRF) — chỉ cho
// phép các host nội bộ nhà máy + một số domain ngoài đã biết trước.
const ALLOWED_EXTERNAL_HOSTS = ['vn.misumi-ec.com'];

function isPrivateHost(hostname) {
  return (
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1'
  );
}

app.get('/api/ping', async (req, res) => {
  const target = req.query.url;
  if (!target) {
    return res.status(400).json({ online: false, message: 'Thiếu tham số url' });
  }

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ online: false, message: 'URL không hợp lệ' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ online: false, message: 'Giao thức không được hỗ trợ' });
  }

  if (!isPrivateHost(parsed.hostname) && !ALLOWED_EXTERNAL_HOSTS.includes(parsed.hostname)) {
    return res.status(403).json({ online: false, message: 'Host không nằm trong danh sách cho phép' });
  }

  try {
    // validateStatus: true -> chỉ cần server phản hồi (kể cả 404/500) đã tính là "online",
    // vì mục tiêu là kiểm tra máy/server đó còn sống hay không, không phải kiểm tra nội dung trang.
    await axios.get(target, { timeout: 4000, maxRedirects: 3, validateStatus: () => true });
    res.json({ online: true });
  } catch (error) {
    res.json({ online: false });
  }
});

// ============ Trang chủ ============
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`TE-NAS Web Server đang chạy tại http://localhost:${PORT}`);
});