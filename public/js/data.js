/**
 * ==========================================================================
 *  CẤU HÌNH DỮ LIỆU TRUNG TÂM — sửa file này để thêm/bớt danh mục & card.
 *  Không cần đụng vào index.html hay main.js.
 * ==========================================================================
 *
 *  1) THÊM DANH MỤC CON (ví dụ: "Alarm" cho TE, "Cost" cho IT)
 *  --------------------------------------------------------------------
 *  Tìm node cha trong CATEGORIES bên dưới, thêm 1 phần tử vào mảng "children":
 *
 *    {
 *      id: 'te',
 *      label: 'TE',
 *      icon: '🏭',
 *      children: [
 *        { id: 'te-camera', label: 'Camera', icon: '🎥' },
 *        { id: 'te-dashboard', label: 'Dashboard', icon: '📊' },
 *        { id: 'te-alarm', label: 'Alarm', icon: '⚠️' },   // <-- THÊM DÒNG NÀY
 *      ]
 *    }
 *
 *  Sau đó thêm card thuộc danh mục này bằng cách đặt menu: 'te-alarm'
 *  trong mảng CARDS (xem hướng dẫn #3). Sidebar + số đếm sẽ tự cập nhật,
 *  không cần sửa gì thêm.
 *
 *  2) THÊM DANH MỤC LỚN NHIỀU TẦNG (ví dụ: "MA" có nhiều danh mục con)
 *  --------------------------------------------------------------------
 *  Thêm 1 object cấp cao nhất vào mảng CATEGORIES, "children" có thể
 *  lồng bao nhiêu tầng cũng được (mỗi tầng lại có "children" riêng):
 *
 *    {
 *      id: 'ma',
 *      label: 'MA',
 *      icon: '🧮',
 *      children: [
 *        {
 *          id: 'ma-report',
 *          label: 'Report',
 *          icon: '📄',
 *          children: [                        // <-- lồng thêm 1 tầng nữa
 *            { id: 'ma-report-daily', label: 'Daily', icon: '📅' },
 *            { id: 'ma-report-monthly', label: 'Monthly', icon: '🗓️' },
 *          ]
 *        },
 *        { id: 'ma-cost', label: 'Cost', icon: '💰' },
 *      ]
 *    }
 *
 *  Quy tắc: node nào KHÔNG có "children" (hoặc children rỗng) sẽ là
 *  danh mục "lá" — tức là danh mục thật sự dùng để lọc card (menu id
 *  của card phải khớp đúng id của node lá đó). Node CÓ "children" chỉ
 *  đóng vai trò xổ/thu gọn nhóm, không dùng để lọc.
 *
 *  3) THÊM CARD MỚI
 *  --------------------------------------------------------------------
 *  Thêm 1 object vào mảng CARDS:
 *
 *    {
 *      menu: 'te-alarm',              // phải trùng id của 1 danh mục LÁ ở trên
 *      icon: '⚠️',
 *      title: 'Tên hiển thị',
 *      desc: 'Mô tả ngắn',
 *      url: 'http://...',             // địa chỉ sẽ mở khi click vào card
 *      camera: 'someCameraKey'        // CHỈ khai báo nếu card này là camera
 *    }                                //   cần kiểm tra trạng thái realtime
 *                                     //   (khớp với route /api/status/:key
 *                                     //   khai báo trong server.js)
 *
 *  Số thứ tự (01, 02, ...) hiển thị trên mỗi card được tính TỰ ĐỘNG theo
 *  vị trí của card trong mảng CARDS — không cần và không nên gõ tay.
 * ==========================================================================
 */

const CATEGORIES = [
    {
        id: 'safety',
        label: 'Safety Cross',
        icon: '👮',
        // children: [
        //     { id: 'it-dashboard', label: 'Dashboard', icon: '📊' },
        //     // Ví dụ thêm sau này:
        //     { id: 'it-safetycross', label: 'Safety Cross', icon: '👮' },
        //     // { id: 'it-data-kvh', label: 'Data KVH', icon: '📈' },
        // ]
    },
    {
        id: 'drawing',
        label: 'Drawing',
        icon: '🖼️',

    },

    {
        id: 'printer',
        label: 'Printer',
        icon: '🖨️',

    },
    {
        id: 'it',
        label: 'IOT',
        icon: '💻',
        // children: [
        //     { id: 'it-dashboard', label: 'Dashboard', icon: '📊' },
        //     // Ví dụ thêm sau này:
        //     { id: 'it-safetycross', label: 'Safety Cross', icon: '👮' },
        //     // { id: 'it-data-kvh', label: 'Data KVH', icon: '📈' },
        // ]
    },
    {
        id: 'te',
        label: 'Camera',
        icon: '🎥',

    },


    // {
    //     id: 'kvh',
    //     label: 'KVH',
    //     icon: '📋',
    //     children: [
    //         { id: 'kvh-dashboard', label: 'Dashboard', icon: '📊' }, 
    //         // Ví dụ thêm sau này:

    //     ]
    // },
    // Ví dụ thêm 1 danh mục lớn mới có nhiều tầng con — xem hướng dẫn #2 ở trên:
    // {
    //     id: 'other',
    //     label: 'Other',
    //     icon: '🗃️',
    //     children: [
    //         { id: 'other-misumi', label: 'Misumi Web', icon: '🌐' }
    //         // Ví dụ thêm sau này:
    //         // { id: 'it-cost', label: 'Cost', icon: '💰' },
    //     ]
    // }
];

const CARDS = [

    // ----------------  Other (có kiểm tra trạng thái realtime) ----------------

    // { menu: 'other-misumi', icon: '🌐', title: 'Misumi Web', desc: 'Tập đoàn Misumi', url: 'https://vn.misumi-ec.com/' },


    // ---------------- IT · Dashboard ----------------

    { menu: 'it', icon: '🌡️', title: 'Dashboard Heat Guide', desc: 'Theo dõi và quản lý nhiệt độ', url: 'http://192.168.122.15:5000' },
    { menu: 'it', icon: '📊', title: 'Dashboard HeatPress', desc: 'Theo dõi và quản lý HeatPress', url: 'http://192.168.122.16:4999/' },
    { menu: 'it', icon: '📊', title: 'Dashboard FacUtility', desc: 'Theo dõi và quản lý FacUtility', url: 'http://192.168.122.16:5003/' },
    { menu: 'it', icon: '📊', title: 'Dashboard Molybden', desc: 'Theo dõi và quản lý Molybden', url: 'http://192.168.122.15:5004/' },
    // { menu: 'it', icon: '🖥️', title: 'Dashboard IT PRO', desc: 'Theo dõi và quản lý IT PRO', url: 'http://192.168.122.16:2222/' },


    // ---------------- IT · Safety Cross ----------------

    { menu: 'safety', icon: '👮', title: 'Safety Cross Patrol', desc: 'Tuần tra an toàn chéo nhà máy', url: 'http://192.168.122.16:5002/' },

    // ---------------- IT · Data KVH ----------------
    // { menu: 'it-data-kvh', icon: '💰', title: 'Cost Monitoring', desc: 'Giám sát chi phí vận hành', url: 'http://192.168.122.15:5001' },
    // { menu: 'it-data-kvh', icon: '🗃️', title: 'Data Of Press KVH', desc: 'Trang quản lý dữ liệu của KVH', url: 'http://10.4.19.40:82/SaleReport.php?fac=Press_KVH' },
    // { menu: 'it-data-kvh', icon: '📦', title: 'Dashboard Packing PO Monitoring', desc: 'Theo dõi và quản lý Packing PO', url: 'http://192.168.122.16:5004/' },



    // ---------------- TE · Dashboard ----------------

    // { menu: 'te-dashboard', icon: '📊', title: 'Dashboard Monitoring SmallForging', desc: 'Theo dõi và quản lý SmallForging', url: 'http://192.168.122.10:3122' },
    // { menu: 'te-dashboard', icon: '🧹', title: 'Dashboard 5S TERoom', desc: 'Theo dõi và quản lý 5S', url: 'http://192.168.122.10:3123/' },
    // { menu: 'te-dashboard', icon: '🔌', title: 'Dashboard IOT Factory (Fx3U/Fx5U)', desc: 'Theo dõi và quản lý (Fx3U/Fx5U)', url: 'http://192.168.122.10:3124/' },
    // { menu: 'te-dashboard', icon: '📊', title: 'Dashboard Simulator PressAMR', desc: 'Mô phỏng chuyển động PressAMR', url: 'http://192.168.122.10:3125' },
    // { menu: 'te-dashboard', icon: '📊', title: 'Dashboard Monitor TAPCHECK', desc: 'Giám sát và phân tích lỗi máy Tapcheck', url: 'http://192.168.122.10:3126' },



    // ---------------- TE · Alarm ----------------


    // { menu: 'te-dashboard', icon: '⚠️', title: 'Dashboard Monitor GuideKC1 and GuideKC2', desc: 'Hệ thống giám sát lỗi GuideKC', url: 'http://192.168.122.10:3101' },

    // ---------------- TE · Printer ----------------
    { menu: 'printer', icon: '🖨️', title: 'F2-TE-3D Printer', desc: 'Chợ KVH', url: 'http://192.168.122.10:5003/' },
    { menu: 'printer', icon: '🖨️', title: 'F2-TE-Color Printer', desc: 'Chợ máy in TE', url: 'http://192.168.122.10:5007/' },


    // ---------------- TE · Camera (có kiểm tra trạng thái realtime) ----------------
    { menu: 'te', icon: '🎥', title: 'Stream Video GuideKC (A-2108)', desc: 'Giám sát quản lý GuideKC (A-2108)', url: 'http://10.4.5.207:5000/', camera: 'guidekc' },
    { menu: 'te', icon: '🎥', title: 'Stream Video Forging3', desc: 'Giám sát quản lý Forging3', url: 'http://10.4.6.93:5000/', camera: 'forging3' },
    { menu: 'te', icon: '🎥', title: 'Stream Video SGDT56', desc: 'Giám sát quản lý Cobot', url: 'http://10.4.5.205:5000/', camera: 'sgdt56' },
    { menu: 'te', icon: '🎥', title: 'Stream Video MTSEntou', desc: 'Giám sát quản lý MTSEntou', url: 'http://10.4.4.33:5000/', camera: 'mtsentou' },
    { menu: 'te', icon: '🎥', title: 'Stream Video SmallForging A-2894 (Cam 1)', desc: 'Giám sát quản lý SmallForging', url: 'http://10.4.5.203:5000/', camera: 'smallforging' },
    { menu: 'te', icon: '🎥', title: 'Stream Video SmallForging A-2894 (Cam 2)', desc: 'Giám sát quản lý SmallForging', url: 'http://10.4.5.203:5001/', camera: 'smallforging1' },
    { menu: 'te', icon: '🎥', title: 'Stream Video Tapcheck (Cam 1)', desc: 'Giám sát máy Tapcheck (Cam 1)', url: 'http://10.4.5.206:5000/', camera: 'tapcheck1' },
    { menu: 'te', icon: '🎥', title: 'Stream Video Tapcheck (Cam 2)', desc: 'Giám sát máy Tapcheck (Cam 2)', url: 'http://10.4.5.206:5001/', camera: 'tapcheck2' },
    { menu: 'te', icon: '🎥', title: 'Stream Video BackStopperJSH', desc: 'Giám sát BackStopperJSH', url: 'http://10.4.6.162:5000/', camera: 'backstopperjsh' },
    { menu: 'te', icon: '🎥', title: 'Stream Video UpdateLine10 ( CAM 1 )', desc: 'Giám sát UpdateLine10', url: 'http://10.4.4.210:5000/', camera: 'updateline10' },
    { menu: 'te', icon: '🎥', title: 'Stream Video UpdateLine10 ( CAM 2 )', desc: 'Giám sát UpdateLine10', url: 'http://10.4.4.210:5001/', camera: 'updateline10_2' },
    { menu: 'te', icon: '🎥', title: 'Stream Video AutoBlade', desc: 'Giám sát AutoBlade', url: 'http://10.4.5.117:5000/', camera: 'autoblade' },
    { menu: 'te', icon: '🎥', title: 'Stream Video CLGSGP', desc: 'Giám sát CLGSGP', url: 'http://10.4.4.121:5000/', camera: 'clgsgp' },
    { menu: 'te', icon: '🎥', title: 'Stream Video EntouSB A-1456', desc: 'Giám sát EntouSB A-1456', url: 'http://10.4.5.131:8080/' },


    { menu: 'drawing', icon: '🖼️', title: ' Find & Print Drawing', desc: 'tìm kiếm và in bản vẽ', url: 'http://192.168.122.10:5050/' },



    // // ----------------  MA Dashboard (có kiểm tra trạng thái realtime) ----------------

    // { menu: 'ma-dashboard', icon: '📈', title: 'MA Dashboard', desc: 'Phân tích và báo cáo tổng hợp', url: 'http://192.168.122.15:5002' },
    // { menu: 'ma-dashboard', icon: '📈', title: 'Dashboard Stopping Time - Line 8-10', desc: 'Phân tích dữ liệu Line 8-10', url: 'http://192.168.122.10:3061' },

    // { menu: 'kvh-dashboard', icon: '📊', title: 'F2-Fixed Asset Controlling Map', desc: 'Dashboard Tài sản cố định', url: 'http://192.168.122.10:3070/' },
    // { menu: 'kvh-dashboard', icon: '📊', title: 'F2-OT Monitoring', desc: 'Giám sát và phân tích OT', url: 'http://192.168.122.10:3080/' },
    // { menu: 'kvh-dashboard', icon: '📊', title: 'F2-Electricity Monitoring', desc: 'Giám sát và phân tích điện', url: 'http://192.168.122.10:3090/' },


];

// Expose ra ngoài cho main.js dùng (không dùng module import/export để giữ
// cú pháp đơn giản, chỉ cần <script> tag như các file js khác trong dự án)
window.APP_DATA = { categories: CATEGORIES, cards: CARDS };