# TÀI LIỆU ĐỀ TÀI - SCHEDULE WITH AI

## Hệ Thống Lập Lịch Thông Minh Dựa Trên Trí Tuệ Nhân Tạo

---

## 1. TỔNG QUAN VỀ ĐỀ TÀI

### 1.1 Mô Tả Đề Tài

Đề tài **"Xây dựng hệ thống lập lịch thông minh với tích hợp AI để tối ưu hóa quản lý thời gian làm việc hàng ngày"** hướng đến việc phát triển một nền tảng quản lý công việc và lập lịch hiệu quả, đáp ứng nhu cầu tối ưu hóa thời gian làm việc và tăng năng suất cho các cá nhân và nhóm làm việc.

Hệ thống cung cấp các chức năng quản lý toàn diện bao gồm:

- **Quản lý công việc**: Tạo, chỉnh sửa, xóa, phân loại công việc theo danh mục
- **Quản lý lịch làm việc**: Xem lịch biểu hàng ngày, tuần, tháng với giao diện trực quan
- **Gợi ý lịch thông minh (AI-powered)**: Hệ thống tự động phân tích hình thức lặp lại (hàng ngày, hàng tuần) từ yêu cầu người dùng và gợi ý khung giờ tối ưu hoàn toàn tự động
- **Giám sát hiệu năng**: Dashboard thống kê, báo cáo hiệu suất làm việc, phân tích thông kê theo tuần/tháng
- **Quản lý tài chính**: Tính toán lương, cấp, phụ cấp dựa trên công việc

Điểm nhấn của đề tài là **mô-đun gợi ý lịch dựa trên Generative AI (Gemini 2.5 Flash)**:

- Phân tích thông tin văn bản (ví dụ: "công việc ABCD được làm vào 6h sáng hằng ngày trong tuần") để tự động phát hiện:
  - **Tần suất**: hàng ngày, hàng tuần, lặp lại
  - **Thời gian cụ thể**: giờ báo sáng, chiều, tối
  - **Các ngày trong tuần**: T2-CN hay ngày cụ thể nào
- Sinh quả lịch tối ưu dựa trên ưu tiên công việc, độ phức tạp, khối lượng công việc hàng ngày
- Tránh xung đột lịch và cân bằng công việc giữa các ngày

Hệ thống được thiết kế với kiến trúc **Client-Server** hiện đại:

- **Frontend**: JavaScript Vanilla + HTML5 + CSS3 với giao diện responsive (không framework)
- **Backend**: Node.js + Express.js
- **Database**: SQL Server
- **AI Engine**: Google Generative AI (Gemini 2.5 Flash)
- **Xác thực**: JWT Token
- **Bảo mật**: Mã hóa mật khẩu (bcrypt)

### 1.2 Lý Do Chọn Đề Tài

**Tính Thực Tiễn & Nhu Cầu Thị Trường:**

- Trong bối cảnh làm việc tại nhà (remote work) ngày càng phổ biến, nhu cầu quản lý thời gian và lập lịch hiệu quả là rất cao
- Nhiều nhân viên gặp khó khăn trong việc sắp xếp công việc hàng ngày, dẫn đến áp lực cao và tình trạng quá tải (burnout)
- Việc tích hợp AI để gợi ý lịch tự động giúp tiết kiệm thời gian quyết định (decision time) và tăng hiệu suất

**Tính Khả Thi Kỹ Thuật:**

- Sử dụng API Generative AI (Gemini) là giải pháp chi phí thấp, không cần huấn luyện mô hình riêng
- Stack công nghệ hiện đại (Node.js, Vue.js, SQL Server) có khả năng mở rộng tốt
- Khả năng xử lý realtime qua JavaScript event listeners để theo dõi thay đổi

**Áp Dụng Kiến Thức Đã Học:**

- Vận dụng các kỹ năng phát triển web full-stack (Frontend, Backend, Database)
- Thiết kế hệ thống với bảo mật (JWT, bcrypt)
- Tích hợp API bên thứ ba (Generative AI)
- Xử lý dữ liệu và phân tích hình thức từ văn bản tự nhiên
- Thiết kế database quan hệ (SQL Server) với các bảng liên kết

---

## 2. CÁC CHỨC NĂNG CỦA HỆ THỐNG

### 2.1 Chức Năng Chính

#### **2.1.1 Quản Lý Tài Khoản & Xác Thực**

- Đăng ký tài khoản mới (email, mật khẩu, thông tin cơ bản)
- Đăng nhập với email/mật khẩu, hỗ trợ JWT token có thời hạn
- Quản lý hồ sơ cá nhân (avatar, tên, email, số điện thoại, chức vụ)
- Phân quyền theo vai trò (User, Manager, Admin)
- Đổi mật khẩu với xác thực mật khẩu cũ

#### **2.1.2 Quản Lý Công Việc**

- **Tạo công việc**: Tiêu đề, mô tả, ưu tiên (1-4), độ phức tạp (1-5), thời gian ước tính
- **Phân loại**: Theo danh mục (công việc, học tập, sinh hoạt, etc.)
- **Chỉnh sửa & Xóa**: Cập nhật thông tin, đánh dấu hoàn thành hoặc xóa công việc
- **Tìm kiếm & Lọc**: Theo trạng thái, ưu tiên, danh mục, ngày tạo

#### **2.1.3 Quản Lý Lịch Làm Việc**

- **Xem lịch**: Hiển thị công việc sắp xếp theo ngày/tuần/tháng
- **Lịch trình**: Dòng thời gian (timeline) hàng ngày với các khung giờ công việc
- **Kéo thả (Drag-Drop)**: Điều chỉnh thời gian làm công việc trên lịch
- **Thông báo**: Nhắc nhở trước 15 phút khi công việc sắp bắt đầu

#### **2.1.4 Gợi Ý Lịch Thông Minh (AI-Powered)**

- **Nhập hướng dẫn**: Người dùng nhập yêu cầu dạng văn bản tự nhiên
  - Ví dụ: "công việc ABCD được làm vào 6h sáng hằng ngày trong tuần"
  - Ví dụ: "lịch dạy môn A từ 6h-9h tối T2 và T7 hàng tuần"
- **Phân tích AI**: Gemini AI tự động phát hiện
  - Tần suất (daily/weekly)
  - Thời gian cụ thể (hour:minute)
  - Ngày trong tuần (T2-CN)
  - Xung đột lịch
- **Sinh gợi ý**: Tạo danh sách công việc + khung giờ tối ưu
  - Ưu tiên công việc quan trọng
  - Cân bằng công việc giữa các ngày (8h/ngày max)
  - Tránh xung đột với lịch hiện tại
- **Lưu lựa chọn**: Chấp nhận/từ chối gợi ý, lưu vào lịch chính thức

#### **2.1.5 Dashboard & Thống Kê**

- **Tổng quan hôm nay**: Công việc hôm nay, số giờ làm, tiến độ hoàn thành
- **Thống kê tuần/tháng**: Số giờ làm, số công việc hoàn thành, tỉ lệ hoàn thành
- **Phân tích thống kê**:
  - Top danh mục công việc
  - Phân bố công việc theo ưu tiên
  - Hiệu suất làm việc qua thời gian
- **Báo cáo PDF**: Xuất báo cáo thống kê theo kỳ

#### **2.1.6 Quản Lý Danh Mục**

- Tạo danh mục công việc tùy chỉnh
- Gán màu sắc và biểu tượng cho mỗi danh mục
- Sửa/Xóa danh mục

#### **2.1.7 Quản Lý Lương & Phụ Cấp**

- Tính toán lương cơ bản theo các công việc
- Quản lý các khoản phụ cấp, thưởng
- Báo cáo bảng lương hàng tháng

### 2.2 Chức Năng Phi Chức Năng

- **Bảo Mật**:
  - Xác thực JWT với token có thời hạn (24h)
  - Mã hóa mật khẩu bcrypt
  - Phân quyền API theo role
  - CORS policy cho frontend
- **Hiệu Năng**:
  - Thời gian response < 500ms cho các API chính
  - Load dữ liệu lịch tối ưu (pagination)
  - Cache dữ liệu người dùng trên client
- **Khả Năng Mở Rộng**:
  - Cấu trúc modular (routes, middleware, services)
  - Database indexing trên các trường hay tìm kiếm
  - Sẵn sàng thêm service mới (Redis, WebSocket)
- **Giao Diện**:
  - Responsive trên desktop, tablet, mobile
  - Tương thích trình duyệt hiện đại (Chrome, Firefox, Safari, Edge)
  - Dark mode hỗ trợ (tùy chọn)
  - Accessibility: WCAG 2.1 Level AA

---

## 3. LỘ TRÌNH THỰC HIỆN

### Timeline Chi Tiết Theo Thực Tế Dự Án

| Giai Đoạn                               | Thời Gian   | Số Ngày | Công Việc Chính                                                                                  | Chi Tiết                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------- | ----------- | ------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Hoàn Thiện Phân Tích & Thiết Kế**  | 19/03-26/03 | 7 ngày  | Hoàn thiện ERD CSDL, thiết kế API endpoints, UI mockup, xác định AI patterns                     | <ul><li>Refine SQL Server schema (Users, **Tasks/CongViec**, **Calendar/LichTrinh**, Categories, Salary)</li><li>Thiết kế ERD: relationship 1-N giữa User-Task-Calendar</li><li>Xác định 15-20 API endpoints (GET/POST/PUT/DELETE)</li><li>Mockup: Login, Dashboard, Calendar grid, AI modal</li><li>Phân tích text patterns cho Gemini (hàng ngày, T2-CN, 6h sáng, etc.)</li></ul>                                                                                                                                                                           |
| **2. Phát Triển Backend & CSDL**        | 26/03-08/04 | 14 ngày | Xây dựng API Node.js + Express, tạo CSDL SQL Server, tích hợp Gemini AI, xác thực JWT + Telegram | <ul><li>**26/03-29/03 (4 ngày):** Setup project, DB connection, schema creation</li><li>**30/03-02/04 (4 ngày):** Auth APIs (register, login, JWT), User management</li><li>**03/04-05/04 (3 ngày):** Task CRUD APIs, Calendar APIs, Categories APIs</li><li>**06/04-08/04 (3 ngày):** Gemini AI integration (analyzeRecurringPatterns), Telegram Bot notifications, error handling</li></ul>                                                                                                                                                                 |
| **3. Phát Triển Frontend & Giao Diện**  | 08/04-21/04 | 13 ngày | Xây dựng UI với JavaScript Vanilla + HTML5 + CSS3, kết nối API, xử lý realtime                   | <ul><li>**08/04-10/04 (3 ngày):** Login/Register pages, Auth flow, JWT token management (localStorage)</li><li>**11/04-13/04 (3 ngày):** Main dashboard, sidebar navigation, task list view (DOM manipulation)</li><li>**14/04-16/04 (3 ngày):** Calendar view (month/week/day), task form modal, drag-drop scheduling (Event listeners)</li><li>**17/04-19/04 (3 ngày):** AI suggestion modal, statistics dashboard, category management</li><li>**20/04-21/04 (2 ngày):** Salary page, settings, responsive design, dark mode (CSS media queries)</li></ul> |
| **4. Tích Hợp Realtime & Testing Unit** | 21/04-26/04 | 6 ngày  | Thêm WebSocket (Socket.IO) + Telegram, unit tests, API testing                                   | <ul><li>**21/04-22/04 (2 ngày):** WebSocket setup, notification events, client-server handshake</li><li>**23/04 (1 ngày):** Telegram Bot notifications, offline message queue</li><li>**24/04 (1 ngày):** Unit tests for APIs (auth, task CRUD), integration tests</li><li>**25/04-26/04 (2 ngày):** Postman/Jest testing, Gemini AI prompt testing, error scenarios</li></ul>                                                                                                                                                                                |
| **5. Kiểm Thử Toàn Bộ & Tối Ưu**        | 27/04-02/05 | 6 ngày  | Testing end-to-end, tương thích trình duyệt, performance optimization, bug fixes                 | <ul><li>**27/04-28/04 (2 ngày):** E2E testing (login → create task → AI suggestion → view calendar)</li><li>**29/04 (1 ngày):** Cross-browser testing (Chrome, Firefox, Safari, Edge)</li><li>**30/04-01/05 (2 ngày):** Performance tuning (DB indexes, API caching, frontend optimization)</li><li>**02/05 (1 ngày):** Security audit (SQL injection, XSS, CORS, JWT expiry)</li></ul>                                                                                                                                                                       |
| **6. Triển Khai & Hoàn Thiện Tài Liệu** | 03/05-10/05 | 7 ngày  | Deploy lên Heroku/Vercel, viết tài liệu người dùng, hoàn thiện tiểu luận, demo                   | <ul><li>**03/05-04/05 (2 ngày):** Build optimization, environment setup (dev/prod), SQL Server connection string</li><li>**05/05 (1 ngày):** Deploy backend (Heroku), deploy frontend (Vercel)</li><li>**06/05-07/05 (2 ngày):** User manual (installation, API docs), developer guide, DB schema docs</li><li>**08/05-09/05 (2 ngày):** Viết chapters tiểu luận (kiến trúc, công nghệ, kết quả), tạo test data</li><li>**10/05 (1 ngày):** Final demo, bug fixes, submission prep</li></ul>                                                                  |

### Ghi Chú Chi Tiết Theo Công Nghệ Dự Án

#### **Backend Specifics (Node.js + Express):**

```
/routes
  ├─ auth.js           → JWT login/register, bcrypt password
  ├─ tasks.js          → CRUD CongViec, filter by category/priority
  ├─ calendar.js       → LichTrinh CRUD, date range queries
  ├─ ai.js             → Gemini API, analyzeRecurringPatterns(), schedule optimization
  ├─ categories.js     → Danh mục management
  ├─ statistics.js     → thống kê giờ làm, công việc hoàn thành
  ├─ salary.js         → Tính lương, phụ cấp
  └─ notification.js   → Telegram Bot, WebSocket emit

/middleware
  └─ auth.js           → verifyToken(), role-based access control

/config
  └─ database.js       → SQL Server pool connection
```

#### **Database (SQL Server) Tables:**

```sql
Users (ID, Email, Password[bcrypt], Name, PhoneNumber, TelegramUserID, Role, CreatedAt)
CongViec (MaCongViec, UserID, TieuDe, MoTa, SoGioUocTinh, MucDoUuTien, MucDoPhucTap, MauSac, CreatedAt)
LichTrinh (MaLichTrinh, MaCongViec, GioBatDau, GioKetThuc, AI_DeXuat, CreatedAt)
DanhMuc (MaDanhMuc, UserID, TenDanhMuc, MauSac, IconClass)
Luong (MaLuong, UserID, ThangNam, TongGioLam, LuongCoBan, PhuCap, Thuong, TongLuong)
NotificationLog (ID, UserID, Type, Title, Message, IsRead, CreatedAt)
```

#### **Frontend (JavaScript Vanilla + HTML5 + CSS3):**

```
/pages
  ├─ login.html          → HTML form, xác thực với API
  ├─ register.html       → HTML form, gọi API register
  └─ index.html          → Main app, load components dynamically

/components
  ├─ calendar-sidebar.html   → HTML template, render task list
  ├─ sidebar.html            → HTML navigation menu
  └─ modals/
      ├─ ai-suggestion-modal.html    → HTML modal, hiển thị AI suggestions
      ├─ create-task-modal.html      → HTML form modal, create/edit task
      ├─ notification-modal.html     → HTML notification display
      └─ profile-modal.html          → HTML user profile form

/assets/js
  ├─ app.js                   → main application logic, DOM initialization
  ├─ aiModule.js              → gọi POST /api/ai/suggest-schedule, process JSON
  ├─ calendarModule.js        → render calendar grid, manage dates
  ├─ AppNavigation.js         → handle navigation, page switching
  ├─ auth.js                  → JWT token management (localStorage), login flow
  ├─ workManager.js           → Task CRUD operations, DOM updates
  ├─ notificationManager.js   → Telegram + WebSocket listeners, show alerts
  ├─ statsManager.js          → fetch statistics API, render charts
  ├─ modalManager.js          → show/hide modals, form handling
  ├─ componentLoader.js       → dynamically load HTML components
  └─ utils.js                 → helper functions, date formatting
```

#### **AI Integration (Gemini 2.5 Flash):**

- **Input:** "công việc ABCD được làm vào 6h sáng hằng ngày trong tuần"
- **Processing:** analyzeRecurringPatterns() phân tích text → tần suất, giờ, ngày
- **Output:** JSON suggestions with scheduledTime, durationMinutes, reason (Tiếng Việt)
- **Fallback:** Simulation mode nếu API key missing

#### **Notification Strategy:**

- **Phase 1 (Priority):** Telegram Bot notifications (POST /api/notification/send-telegram)
- **Phase 2 (If time):** WebSocket realtime (Socket.IO) + Browser Notification API
- **Trigger:** Task starting soon (15 min before), schedule updated, AI suggestions ready

---

## 4. PHẠM VI VÀ GIỚI HẠN

### 4.1 Phạm Vi

- Hệ thống lập lịch cá nhân cho một hoặc nhiều người dùng độc lập
- Gợi ý lịch dựa trên phân tích văn bản tự nhiên (Natural Language Processing)
- Quản lý công việc cấp độ cá nhân/nhóm nhỏ (team < 100 người)
- Triển khai trên nền tảng web (responsive, tương thích desktop/mobile)
- Xác thực cơ bản (email/password + JWT)
- Tích hợp AI thông qua API bên thứ ba (Google Generative AI)

### 4.2 Giới Hạn

- **Chưa hỗ trợ**: Nhận dạng danh tính/biometric, quét giọng nói để tạo công việc
- **Chưa triển khai**: Hệ thống phân tán quy mô lớn (Kubernetes, message queue), caching layer (Redis)
- **Chưa tích hợp**: Tính năng cộng tác thời gian thực (Collaborative editing), video conference
- **Giới hạn AI**: Chỉ hỗ trợ tiếng Việt và tiếng Anh, không tối ưu cho các ngôn ngữ khác
- **Giới hạn Database**: Chưa triển khai sharding, replication cho quy mô rất lớn (millions of users)

---

## 5. KẾT QUẢ ĐẦU RA

### 5.1 Mô Tả Sản Phẩm

**Schedule-With-AI** là một **hệ thống web lập lịch thông minh hoàn chỉnh** cho phép người dùng:

1. **Quản lý công việc**: Tạo, sửa, xóa, phân loại công việc theo danh mục
2. **Xem lịch trực quan**: Hiển thị lịch theo ngày/tuần/tháng, timeline hàng ngày
3. **Nhận gợi ý AI**: Nhập yêu cầu bằng text tự nhiên (ví dụ: "6h sáng hằng ngày"), hệ thống tự động gợi ý khung giờ tối ưu
4. **Theo dõi hiệu suất**: Dashboard thống kê giờ làm, công việc hoàn thành, báo cáo hàng tháng
5. **Quản lý tài chính**: Tính lương, phụ cấp, báo cáo bảng lương

**Giao Diện Thân Thiện:**

- Menu sidebar dễ điều hướng
- Modal form để tạo/sửa công việc
- Calendar widget hiển thị trực quan
- AI suggestion panel đề xuất tối ưu
- Dashboard analytics với biểu đồ, thống kê

**Tương Thích:**

- Hoạt động ổn định trên Web: Chrome, Firefox, Safari, Edge
- Responsive: Hiển thị tốt trên desktop (1920px), tablet (768px), mobile (375px)

### 5.2 Giải Pháp Kỹ Thuật

#### **Kiến Trúc Tổng Thể**

```
┌─────────────────────────────────────┐
│        Frontend (Vue.js)            │
│  Calendar | Tasks | Dashboard | AI  │
└─────────────────────────────────────┘
              ↓ HTTP/REST API
┌─────────────────────────────────────┐
│     Backend (Node.js + Express)     │
│  Auth | Tasks | Calendar | AI       │
│     JWT / Role-Based Access         │
└─────────────────────────────────────┘
              ↓ SQL Queries
┌─────────────────────────────────────┐
│   Database (SQL Server)             │
│  Users | Tasks | Calendar | Category│
└─────────────────────────────────────┘
              ↓ LLM API Call
┌─────────────────────────────────────┐
│   Google Generative AI (Gemini)     │
│    Natural Language Processing      │
└─────────────────────────────────────┘
```

#### **Công Nghệ Stack**

**Frontend:**

- HTML5, CSS3, JavaScript ES6+ (Vanilla)
- Custom DOM manipulation (addEventListener, querySelector, innerHTML)
- Custom Calendar rendering (no library, pure JavaScript)
- Responsive design (CSS media queries, flexbox, grid)

**Backend:**

- Node.js + Express.js
- JWT (jsonwebtoken) để xác thực
- bcrypt để mã hóa mật khẩu
- Google Generative AI SDK

**Database:**

- SQL Server 2019+
- Schema: Users, Tasks, Calendar, Categories, Salary
- Indexing trên các trường hay tìm kiếm (UserID, TaskID, CreatedDate)

**Bảo Mật:**

- CORS policy cho frontend
- SQL injection prevention (parameterized queries)
- XSS protection (input validation, output encoding)
- HTTPS khi deploy (SSL certificate)

#### **Thuật Toán Chính**

1. **Phân Tích Yêu Cầu Văn Bản**:
   - Input: "công việc ABCD được làm vào 6h sáng hằng ngày trong tuần"
   - Phát hiện: Tần suất (hàng ngày) → Ngày (T2-CN) → Giờ (06:00)
   - Output: Recurring pattern {frequency: "daily", days: [2,3,4,5,6], time: "06:00"}

2. **Tối Ưu Lịch**:
   - Sắp xếp công việc theo ưu tiên (priority)
   - Phân bố giờ làm (max 8h/ngày)
   - Kiểm tra xung đột với lịch hiện tại
   - Gợi ý khung giờ tối ưu (morning/afternoon/evening)

3. **Tính Điểm Hiệu Suất**:
   - Số giờ làm / số giờ dự kiến → % hoàn thành
   - Số công việc hoàn thành / tổng số → % tiến độ
   - Thời gian trễ = 0 → Bonus point

---

## 6. CÔNG NGHỆ VÀ DEPENDENCIES

| Công Nghệ             | Phiên Bản | Mục Đích                      |
| --------------------- | --------- | ----------------------------- |
| Node.js               | >= 14.0.0 | Runtime JavaScript Backend    |
| Express               | ^4.18.2   | Web Framework                 |
| SQL Server            | 2019+     | Database Relational           |
| jsonwebtoken          | ^9.0.2    | JWT Authentication            |
| bcrypt                | ^5.1.1    | Password Encryption           |
| @google/generative-ai | ^0.24.1   | Gemini API Integration        |
| CORS                  | ^2.8.5    | Cross-Origin Resource Sharing |
| dotenv                | ^16.3.1   | Environment Variables         |
| mssql                 | ^10.0.1   | SQL Server Driver             |
| openai (optional)     | ^6.9.1    | Alternative AI Provider       |

---

## 7. NGÔN NGỮ & ĐỊNH DẠNG

- **Ngôn Ngữ Backend**: JavaScript / Node.js (ES6+)
- **Ngôn Ngữ Frontend**: JavaScript Vanilla (HTML5 + CSS3, không dùng framework)
- **Ngôn Ngữ Database**: T-SQL (SQL Server)
- **Ngôn Ngữ Giao Tiếp**: Tiếng Việt + Tiếng Anh
- **Format Data**: JSON (REST API), ISO 8601 (DateTime)

---

## 8. CÁC TỆGHI CHỨA MÃ NGUỒN

```
Schedule-With-AI/
├── backend/
│   ├── server.js                 # Main server entry, Express setup
│   ├── config/
│   │   └── database.js           # SQL Server connection pool (mssql)
│   ├── middleware/
│   │   └── auth.js               # verifyToken() JWT authentication
│   └── routes/
│       ├── auth.js               # register, login, JWT handling
│       ├── tasks.js              # GET/POST/PUT/DELETE CongViec API
│       ├── calendar.js           # GET/POST/PUT LichTrinh API
│       ├── ai.js                 # POST /api/ai/suggest-schedule (Gemini)
│       ├── categories.js         # DanhMuc CRUD
│       ├── salary.js             # GET /api/salary (Luong calculation)
│       ├── statistics.js         # GET /api/statistics (thống kê)
│       └── users.js              # GET/PUT user profile
├── frontend/ (No framework - Pure JavaScript)
│   ├── index.html                # Main SPA entry point
│   ├── login.html                # Login form page
│   ├── register.html             # Register form page
│   ├── assets/
│   │   ├── css/
│   │   │   ├── calendar.css      # Calendar styling
│   │   │   ├── main.css          # Global styles
│   │   │   ├── login.css         # Auth pages styles
│   │   │   ├── salary.css        # Salary page styles
│   │   │   ├── work.css          # Task page styles
│   │   │   ├── ai-modal-fix.css  # AI modal fixes
│   │   │   ├── sidebar-force.css # Sidebar layout
│   │   │   └── ai-calendar.css   # AI calendar styling
│   │   └── js/
│   │       ├── app.js            # Main app logic, DOM initialization
│   │       ├── auth.js           # login, register, JWT token (localStorage)
│   │       ├── AppNavigation.js   # Page routing, navigation
│   │       ├── workManager.js    # Task CRUD, DOM updates
│   │       ├── calendarModule.js # Calendar rendering, date logic
│   │       ├── aiModule.js       # AI API calls, suggestion display
│   │       ├── ai-suggestion-handler.js # AI suggestion processing
│   │       ├── notificationManager.js   # Telegram/WebSocket notifications
│   │       ├── statsManager.js         # Statistics rendering
│   │       ├── salaryManager.js        # Salary calculations
│   │       ├── category-manager.js     # Category management
│   │       ├── modalManager.js         # Modal show/hide logic
│   │       ├── componentLoader.js      # Load HTML components dynamically
│   │       ├── profile.js              # User profile management
│   │       ├── notification.js         # Notification display
│   │       ├── tabManager.js           # Tab switching logic
│   │       ├── ui.js                   # UI helpers
│   │       ├── utils.js                # Utility functions (date, format)
│   │       └── installHook.js          # Service worker or similar
│   ├── components/
│   │   ├── calendar-sidebar.html       # Task list sidebar template
│   │   ├── sidebar.html                # Main navigation sidebar
│   │   ├── debug-tasks-api.html        # Debug page for testing
│   │   └── modals/
│   │       ├── ai-suggestion-modal.html    # AI suggestions display
│   │       ├── create-task-modal.html      # Create/edit task form
│   │       ├── create-category-modal.html  # Category management
│   │       ├── notification-modal.html     # Notification display
│   │       ├── profile-modal.html          # User profile form
│   │       └── settings-modal.html         # Settings form
│   ├── pages/
│   │   ├── calendar.html          # Calendar view page
│   │   ├── calendar-content.html  # Calendar content template
│   │   ├── ai-content.html        # AI suggestion section
│   │   ├── work.html              # Work/task management page
│   │   ├── profile.html           # User profile page
│   │   └── salary.html            # Salary management page
│   ├── debug/ (Debug pages)
│   │   ├── debug.html
│   │   ├── debug-modal.html
│   │   └── debug-ai-modal-css.html
│   └── public/
│       ├── app.js                 # Public-facing app logic
│       └── testapp.js             # Test application
├── package.json                   # Dependencies (Express, JWT, bcrypt, Gemini API)
├── .env                           # Environment config (GEMINI_API_KEY, DB_*, JWT_*)
├── git.readme                     # Git documentation
├── FIX_SUMMARY.md                 # Fix notes
└── DAM_TIEU_LUAN.md              # This project documentation
```

---

## 9. HƯỚNG DẪN CÁCH CHẠY HỆ THỐNG

### Cài Đặt & Khởi Chạy

```bash
# 1. Clone/Download project
cd Schedule-With-AI

# 2. Cài dependencies
npm install

# 3. Cấu hình environment
# Tạo file .env với nội dung:
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_api_key_here
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret

# 4. Khởi chạy server
npm run dev

# 5. Truy cập ứng dụng
# Mở browser: http://localhost:3000
```

### Các Endpoint API Chính

```
POST   /api/auth/register              - Đăng ký
POST   /api/auth/login                 - Đăng nhập
GET    /api/tasks                      - Lấy danh sách công việc
POST   /api/tasks                      - Tạo công việc
PUT    /api/tasks/:id                  - Cập nhật công việc
DELETE /api/tasks/:id                  - Xóa công việc
GET    /api/calendar                   - Lấy lịch theo khoảng ngày
POST   /api/ai/suggest-schedule        - Gợi ý lịch từ AI
GET    /api/statistics                 - Lấy thống kê
GET    /api/salary                     - Tính lương
```

---

**Ngày tạo**: 19/03/2026  
**Phiên bản**: 1.0.0  
**Tác giả**: Schedule-With-AI Development Team
