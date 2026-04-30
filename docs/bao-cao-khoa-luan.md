# BÁO CÁO KHÓA LUẬN TỐT NGHIỆP

## ĐỀ TÀI: XÂY DỰNG ỨNG DỤNG WEB QUẢN LÝ LỊCH TRÌNH VÀ CÔNG VIỆC TÍCH HỢP TRÍ TUỆ NHÂN TẠO

---

## LỜI CẢM ƠN

Em xin chân thành cảm ơn Khoa Công Nghệ Thông Tin, trường Đại học Duy Tân đã tạo điều kiện tốt cho em thực hiện đề tài này.

Em xin chân thành cảm ơn Thầy *(tên GVHD)*, là người đã định hướng và giúp đỡ em trong suốt thời gian thực hiện đề tài. Trong quá trình thực hiện đề tài thầy đã tận tình chỉ dẫn, trao đổi giúp em giải quyết các vấn đề để hoàn thiện đề tài. Em cũng xin gửi lời cảm ơn sâu sắc đến quý thầy cô trong khoa đã tận tình giảng dạy và trang bị cho em vốn kiến thức vô cùng quý báu trong những năm học vừa qua. Cha, Mẹ, anh chị đã quan tâm, chăm sóc, động viên. Bạn bè đã ủng hộ, giúp đỡ em trong những lúc khó khăn cũng như trong suốt thời gian học tập và nghiên cứu. Mặc dù em đã cố gắng hoàn thành luận văn trong phạm vi và khả năng cho phép, nhưng chắc chắn sẽ không tránh khỏi những thiếu sót, kính mong sự cảm thông và chỉ bảo của quý thầy cô và các bạn.

Đà Nẵng, ngày ... tháng ... năm 2026.

Sinh viên thực hiện

**Trần Quang Quốc**

---

## LỜI CAM ĐOAN

Tôi xin cam đoan:

a. Những nội dung trong luận văn này là do tôi thực hiện dưới sự hướng dẫn trực tiếp của thầy *(tên GVHD)*.

b. Mọi tham khảo dùng trong luận văn đều được trích dẫn rõ ràng và trung thực tên tác giả, tên công trình, thời gian, địa điểm công bố.

c. Mọi sao chép không hợp lệ, vi phạm quy chế đào tạo, hay gian trá, tôi xin chịu hoàn toàn trách nhiệm.

Đà Nẵng, ngày ... tháng ... năm 2026.

Sinh viên thực hiện

**Trần Quang Quốc**

---

## MỤC LỤC

- [MỞ ĐẦU](#mở-đầu)
- [CHƯƠNG I: TỔNG QUAN VỀ CÔNG CỤ VÀ MÔI TRƯỜNG PHÁT TRIỂN](#chương-i--tổng-quan-về-công-cụ-và-môi-trường-phát-triển)
  - [1.1. Giới thiệu Node.js](#11-giới-thiệu-nodejs)
  - [1.2. Giới thiệu Express.js Framework](#12-giới-thiệu-expressjs-framework)
  - [1.3. Giới thiệu Supabase (PostgreSQL)](#13-giới-thiệu-supabase-postgresql)
  - [1.4. Giới thiệu Vanilla JavaScript và FullCalendar](#14-giới-thiệu-vanilla-javascript-và-fullcalendar)
  - [1.5. Giới thiệu Tailwind CSS](#15-giới-thiệu-tailwind-css)
  - [1.6. Giới thiệu Google Gemini AI API](#16-giới-thiệu-google-gemini-ai-api)
  - [1.7. Giới thiệu các dịch vụ tích hợp](#17-giới-thiệu-các-dịch-vụ-tích-hợp)
- [CHƯƠNG II: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG](#chương-ii--phân-tích-và-thiết-kế-hệ-thống)
  - [2.1. Khảo sát thực trạng](#21-khảo-sát-thực-trạng)
  - [2.2. Một số ứng dụng quản lý lịch trình tương tự](#22-một-số-ứng-dụng-quản-lý-lịch-trình-tương-tự)
  - [2.3. Các đối tượng tương tác với hệ thống](#23-các-đối-tượng-tương-tác-với-hệ-thống)
  - [2.4. Sơ đồ Use Case](#24-sơ-đồ-use-case)
  - [2.5. Sơ đồ tuần tự (Sequence Diagram)](#25-sơ-đồ-tuần-tự-sequence-diagram)
  - [2.6. Sơ đồ hoạt động (Activity Diagram)](#26-sơ-đồ-hoạt-động-activity-diagram)
  - [2.7. Kiến trúc hệ thống](#27-kiến-trúc-hệ-thống)
  - [2.8. Thiết kế cơ sở dữ liệu](#28-thiết-kế-cơ-sở-dữ-liệu)
- [CHƯƠNG III: TRIỂN KHAI HỆ THỐNG](#chương-iii--triển-khai-hệ-thống)
  - [3.1. Kết quả thực hiện](#31-kết-quả-thực-hiện)
- [KẾT LUẬN](#kết-luận)
- [TÀI LIỆU THAM KHẢO](#tài-liệu-tham-khảo)

---

## DANH MỤC CÁC HÌNH ẢNH

| STT | Hình | Mô tả |
|-----|------|-------|
| 1 | Hình 1.1 | Kiến trúc Node.js Event Loop |
| 2 | Hình 1.2 | Mô hình Client-Server với Express.js |
| 3 | Hình 1.3 | Kiến trúc Supabase |
| 4 | Hình 1.4 | Giao diện FullCalendar |
| 5 | Hình 2.1 | Use case tổng quát — Khách (chưa đăng nhập) |
| 6 | Hình 2.2 | Use case tổng quát — Người dùng đã đăng nhập |
| 7 | Hình 2.3 | Use case chi tiết — Đăng ký tài khoản |
| 8 | Hình 2.4 | Use case chi tiết — Đăng nhập |
| 9 | Hình 2.5 | Use case chi tiết — Quản lý công việc |
| 10 | Hình 2.6 | Use case chi tiết — Quản lý lịch (Calendar) |
| 11 | Hình 2.7 | Use case chi tiết — Tương tác AI |
| 12 | Hình 2.8 | Use case chi tiết — Quản lý lương |
| 13 | Hình 2.9 | Use case chi tiết — Liên kết dịch vụ |
| 14 | Hình 2.10 | Use case chi tiết — Habit Tracker |
| 15 | Hình 2.11 | Use case chi tiết — Pomodoro Timer |
| 16 | Hình 2.12 | Use case chi tiết — Chia sẻ lịch |
| 17 | Hình 2.13 | Sơ đồ kiến trúc hệ thống tổng quát |
| 18 | Hình 2.14 | Mô hình quan hệ cơ sở dữ liệu |
| 19 | Hình 3.1 | Giao diện Sidebar và trang Lịch (Calendar) |
| 20 | Hình 3.2 | Giao diện trang Công việc (Work) |
| 21 | Hình 3.3 | Giao diện Modal đăng nhập / đăng ký |
| 22 | Hình 3.4 | Giao diện tạo công việc mới |
| 23 | Hình 3.5 | Giao diện chi tiết sự kiện |
| 24 | Hình 3.6 | Giao diện AI Gợi ý lịch trình |
| 25 | Hình 3.7 | Giao diện Quản lý lương |
| 26 | Hình 3.8 | Giao diện Trang Liên kết (Connections) |
| 27 | Hình 3.9 | Giao diện Habit Tracker với Heatmap |
| 28 | Hình 3.10 | Giao diện Pomodoro Timer |
| 29 | Hình 3.11 | Giao diện Chia sẻ lịch cộng tác |
| 30 | Hình 3.12 | Giao diện Chat Advisor (AI tư vấn) |
| 31 | Hình 3.13 | Giao diện Trang Hồ sơ cá nhân |
| 32 | Hình 3.14 | Giao diện Cài đặt — Tuỳ chỉnh màu sắc |

---

## DANH MỤC CÁC BẢNG BIỂU

| STT | Bảng | Mô tả |
|-----|------|-------|
| 1 | Bảng 2.1 | Các tác nhân của hệ thống |
| 2 | Bảng 2.2 | Luồng sự kiện chính use case đăng ký tài khoản |
| 3 | Bảng 2.3 | Luồng sự kiện chính use case đăng nhập |
| 4 | Bảng 2.4 | Luồng sự kiện chính use case quản lý công việc |
| 5 | Bảng 2.5 | Luồng sự kiện chính use case quản lý lịch |
| 6 | Bảng 2.6 | Luồng sự kiện chính use case tương tác AI |
| 7 | Bảng 2.7 | Luồng sự kiện chính use case quản lý lương |
| 8 | Bảng 2.8 | Luồng sự kiện chính use case liên kết Telegram |
| 9 | Bảng 2.9 | Luồng sự kiện chính use case liên kết Google Calendar |
| 10 | Bảng 2.10 | Luồng sự kiện chính use case Habit Tracker |
| 11 | Bảng 2.11 | Luồng sự kiện chính use case Pomodoro Timer |
| 12 | Bảng 2.12 | Luồng sự kiện chính use case chia sẻ lịch |
| 13 | Bảng 2.13 | Bảng Users |
| 14 | Bảng 2.14 | Bảng Tasks |
| 15 | Bảng 2.15 | Bảng TaskInstances |
| 16 | Bảng 2.16 | Bảng Categories |
| 17 | Bảng 2.17 | Bảng EventSubtasks |
| 18 | Bảng 2.18 | Bảng SalaryRecords |
| 19 | Bảng 2.19 | Bảng TelegramConnections |
| 20 | Bảng 2.20 | Bảng ChatAdvisorMessages |
| 21 | Bảng 2.21 | Bảng GoogleCalendarConnections |
| 22 | Bảng 2.22 | Bảng Tags / TaskTags |
| 23 | Bảng 2.23 | Bảng PomodoroSessions |
| 24 | Bảng 2.24 | Bảng Habits / HabitLogs |
| 25 | Bảng 2.25 | Bảng CalendarShares |
| 26 | Bảng 3.1 – 3.14 | Nội dung các giao diện hệ thống |

---

## MỞ ĐẦU

### 1. Lý do chọn đề tài

Ngày nay, trong bối cảnh xã hội phát triển nhanh chóng, mỗi cá nhân phải đối mặt với lượng công việc ngày càng lớn — từ học tập, làm việc đến các hoạt động cá nhân. Việc quản lý thời gian và lịch trình hiệu quả trở thành yếu tố then chốt quyết định năng suất và chất lượng cuộc sống. Tuy nhiên, các phương pháp truyền thống như ghi sổ tay, sử dụng bảng tính hay các ứng dụng đơn giản thường không đáp ứng được nhu cầu quản lý phức tạp.

Sự phát triển của Trí tuệ nhân tạo (AI), đặc biệt là các mô hình ngôn ngữ lớn (Large Language Models - LLM) như Google Gemini, mở ra cơ hội tích hợp khả năng gợi ý thông minh vào các ứng dụng quản lý. AI có thể phân tích lịch trình hiện tại, đề xuất cách sắp xếp công việc tối ưu, và thậm chí tư vấn chiến lược quản lý thời gian phù hợp với từng cá nhân.

Đứng trước nhu cầu thực tiễn về quản lý thời gian thông minh cũng như đam mê lập trình ứng dụng web, em đã chọn đề tài: **"Xây dựng ứng dụng web quản lý lịch trình và công việc tích hợp Trí tuệ nhân tạo"** làm đề tài khóa luận.

### 2. Mục đích và ý nghĩa của đề tài

**a. Mục đích**
- Nghiên cứu và tìm hiểu về kiến trúc, hệ thống và các vấn đề liên quan đến quá trình xây dựng ứng dụng web Single Page Application (SPA).
- Ứng dụng Node.js, Express.js và Supabase (PostgreSQL) vào xây dựng hệ thống quản lý lịch trình tích hợp AI.
- Tích hợp Google Gemini AI để hỗ trợ gợi ý và tối ưu lịch trình cho người dùng.

**b. Ý nghĩa**
- Về mặt lý thuyết, đề tài tiếp cận nghiên cứu kiến trúc RESTful API, mô hình Controller-Service, và cách tích hợp AI vào ứng dụng web.
- Về mặt thực tiễn, ứng dụng có thể đáp ứng nhu cầu quản lý lịch trình, theo dõi thói quen, và nhận gợi ý thông minh cho sinh viên và người đi làm.

### 3. Đối tượng và phạm vi nghiên cứu

**a. Đối tượng**
Sinh viên, người đi làm, freelancer và những người có nhu cầu quản lý thời gian, lịch trình công việc hiệu quả.

**b. Phạm vi**
- Xác định yêu cầu của người dùng.
- Phân tích, đặc tả yêu cầu chức năng của hệ thống.
- Thiết kế giao diện và cơ sở dữ liệu cho hệ thống.
- Phát triển hệ thống bằng Node.js/Express.js (Backend) và Vanilla JavaScript/FullCalendar (Frontend).
- Tích hợp Google Gemini AI, Telegram Bot, Google Calendar API.
- Kiểm thử một số chức năng chính của hệ thống.

### 4. Phương pháp nghiên cứu

- Tổng hợp các kết quả nghiên cứu từ tài liệu kỹ thuật và các dự án mã nguồn mở.
- Sử dụng kiến thức lập trình web fullstack để thiết kế và triển khai ứng dụng.
- Quan sát hoạt động và quy trình các ứng dụng tương tự (Google Calendar, Todoist, Notion).
- Áp dụng phương pháp phát triển phần mềm Agile.

### 5. Kết quả dự kiến

Ứng dụng hoàn thành đầy đủ các chức năng: quản lý công việc, lịch trình, gợi ý AI, quản lý lương, liên kết Telegram/Google Calendar, habit tracker, pomodoro timer, chia sẻ lịch cộng tác, và chat tư vấn AI.

### 6. Bố cục đề tài

- **Phần 1**: Giới thiệu tổng quan về đề tài và các công nghệ liên quan.
- **Phần 2**: Phân tích và thiết kế hệ thống "Ứng dụng quản lý lịch trình tích hợp AI".
- **Phần 3**: Cài đặt, triển khai và kiểm thử hệ thống.

---

## CHƯƠNG I: TỔNG QUAN VỀ CÔNG CỤ VÀ MÔI TRƯỜNG PHÁT TRIỂN

### 1.1. Giới thiệu Node.js

#### 1.1.1. Lịch sử phát triển của Node.js

Node.js được tạo ra bởi Ryan Dahl vào năm 2009 và ra mắt lần đầu cho Linux. Ý tưởng ban đầu xuất phát từ nhu cầu xây dựng các ứng dụng web có khả năng xử lý đồng thời cao mà không cần tạo thread mới cho mỗi kết nối. Ryan Dahl đã sử dụng JavaScript engine V8 của Google Chrome làm nền tảng, mở ra khả năng chạy JavaScript bên ngoài trình duyệt web. Năm 2015, Node.js Foundation được thành lập dưới sự quản lý của Linux Foundation, đánh dấu sự trưởng thành của hệ sinh thái.

#### 1.1.2. Node.js là gì?

Node.js là một môi trường runtime JavaScript mã nguồn mở, đa nền tảng, cho phép thực thi mã JavaScript phía server. Node.js sử dụng mô hình I/O không đồng bộ (non-blocking I/O) dựa trên sự kiện (event-driven), giúp xử lý hàng nghìn kết nối đồng thời một cách hiệu quả.

#### 1.1.3. Một số đặc điểm nổi bật của Node.js

**Mô hình Event-Driven, Non-blocking I/O**
Node.js sử dụng một thread duy nhất với event loop để xử lý tất cả các yêu cầu. Thay vì chờ đợi các thao tác I/O (đọc file, truy vấn database) hoàn thành, Node.js sẽ tiếp tục xử lý các yêu cầu khác và quay lại khi I/O hoàn tất thông qua callback hoặc Promise. Điều này giúp tiết kiệm tài nguyên và tăng hiệu suất so với mô hình multi-thread truyền thống.

**JavaScript ở cả hai phía (Client & Server)**
Với Node.js, lập trình viên có thể sử dụng cùng một ngôn ngữ JavaScript cho cả frontend và backend, giảm chi phí học tập và tăng hiệu quả phát triển. Đây là ưu điểm lớn cho việc xây dựng ứng dụng fullstack.

**NPM (Node Package Manager)**
NPM là hệ thống quản lý gói lớn nhất thế giới với hơn 2 triệu package, cung cấp sẵn các thư viện cho hầu hết mọi nhu cầu phát triển: web framework, database driver, authentication, AI integration, v.v.

**Hiệu suất cao**
Nhờ V8 engine của Google biên dịch JavaScript trực tiếp sang mã máy (machine code), Node.js có tốc độ thực thi rất nhanh, phù hợp cho các ứng dụng real-time, API server, và microservices.

**Đa nền tảng**
Node.js chạy trên Windows, macOS, Linux và nhiều nền tảng khác, đảm bảo tính khả chuyển cho ứng dụng.

#### 1.1.4. Các ứng dụng của Node.js

- **RESTful API Server**: Xây dựng backend API cho các ứng dụng web và mobile.
- **Real-time Application**: Chat, notification, collaboration tool nhờ WebSocket.
- **Microservices**: Kiến trúc vi dịch vụ cho hệ thống lớn.
- **Bot & Automation**: Telegram bot, Discord bot, các công cụ tự động hóa.
- **Server-Side Rendering**: Kết hợp với React, Vue.js để render HTML phía server.

### 1.2. Giới thiệu Express.js Framework

#### 1.2.1. Express.js là gì?

Express.js là một web application framework nhẹ, linh hoạt cho Node.js. Express.js cung cấp bộ công cụ mạnh mẽ để xây dựng ứng dụng web và API. Đây là framework phổ biến nhất trong hệ sinh thái Node.js, được sử dụng rộng rãi bởi các công ty lớn như Uber, IBM, và Netflix.

#### 1.2.2. Đặc điểm của Express.js

- **Routing linh hoạt**: Hệ thống routing mạnh mẽ hỗ trợ HTTP methods (GET, POST, PUT, DELETE), parameter, query string.
- **Middleware architecture**: Cơ chế middleware cho phép xử lý request/response theo chuỗi — xác thực, logging, CORS, parsing body.
- **Template engine**: Hỗ trợ nhiều template engine (EJS, Pug, Handlebars) hoặc phục vụ static files.
- **Nhẹ và không áp đặt**: Express.js không ép buộc cấu trúc thư mục hay design pattern cụ thể, cho phép tự do tổ chức code.

#### 1.2.3. Mô hình MVC với Express.js

Trong đề tài này, Express.js được tổ chức theo mô hình **Controller-Service-Route**:
- **Routes**: Định nghĩa các endpoint API và ánh xạ đến controller tương ứng.
- **Controllers**: Xử lý request/response, gọi service để thực hiện logic nghiệp vụ.
- **Services**: Chứa business logic, tương tác với database thông qua Supabase client.
- **Middleware**: Xác thực JWT token, CORS, rate limiting.

### 1.3. Giới thiệu Supabase (PostgreSQL)

#### 1.3.1. Supabase là gì?

Supabase là nền tảng Backend-as-a-Service (BaaS) mã nguồn mở, được xây dựng trên PostgreSQL. Supabase cung cấp database, authentication, realtime subscriptions, storage, và edge functions trong một hệ sinh thái thống nhất. Đây được coi là giải pháp thay thế mã nguồn mở cho Firebase của Google.

#### 1.3.2. PostgreSQL làm nền tảng

PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ mã nguồn mở mạnh mẽ nhất thế giới, hỗ trợ:
- **ACID transactions**: Đảm bảo tính toàn vẹn dữ liệu.
- **JSON/JSONB**: Lưu trữ dữ liệu phi cấu trúc linh hoạt.
- **Row Level Security (RLS)**: Kiểm soát truy cập dữ liệu ở cấp hàng.
- **Full-text search**: Tìm kiếm toàn văn hiệu quả.
- **Foreign keys & Constraints**: Ràng buộc tham chiếu đảm bảo tính nhất quán.

#### 1.3.3. Supabase JavaScript Client

Trong đề tài, tương tác database được thực hiện thông qua `@supabase/supabase-js`:

```javascript
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Truy vấn dữ liệu
const { data, error } = await supabase
  .from("Tasks")
  .select("*")
  .eq("UserID", userId);
```

### 1.4. Giới thiệu Vanilla JavaScript và FullCalendar

#### 1.4.1. Vanilla JavaScript

Vanilla JavaScript là thuật ngữ chỉ JavaScript thuần túy, không sử dụng framework hay thư viện bổ sung (không React, Vue, Angular). Ưu điểm:
- **Không phụ thuộc**: Không cần build tool, bundler hay transpiler.
- **Hiệu suất**: Không có overhead từ virtual DOM hay framework runtime.
- **Học tập**: Hiểu sâu về cách JavaScript và DOM hoạt động.
- **Nhẹ**: Không tải thêm thư viện nặng.

Trong đề tài, frontend được tổ chức dưới dạng SPA sử dụng pattern **Component Loader** — mỗi module được đăng ký trên `window` object và nạp qua thẻ `<script>`.

#### 1.4.2. FullCalendar 6.x

FullCalendar là thư viện JavaScript mã nguồn mở cung cấp giao diện lịch tương tác. Phiên bản 6.x hỗ trợ:
- **Nhiều chế độ hiển thị**: Tháng, tuần, ngày, danh sách.
- **Drag & Drop**: Kéo thả sự kiện để thay đổi thời gian.
- **Event resize**: Kéo mép sự kiện để thay đổi thời lượng.
- **Event rendering**: Tuỳ chỉnh giao diện từng sự kiện.
- **Responsive**: Tự động thích ứng kích thước màn hình.

### 1.5. Giới thiệu Tailwind CSS

Tailwind CSS là CSS framework theo hướng utility-first, cho phép xây dựng giao diện bằng cách kết hợp các class nhỏ trực tiếp trong HTML. Trong đề tài, Tailwind CSS được sử dụng qua CDN kết hợp với custom CSS files cho các component phức tạp.

Ưu điểm:
- Phát triển nhanh, không cần đặt tên class.
- Responsive dễ dàng với các breakpoint prefix (sm:, md:, lg:).
- Kích thước bundle nhỏ nhờ purge CSS.

### 1.6. Giới thiệu Google Gemini AI API

#### 1.6.1. Google Gemini là gì?

Google Gemini là mô hình ngôn ngữ lớn (LLM) đa phương thức do Google DeepMind phát triển. Gemini có khả năng hiểu và tạo văn bản, mã lập trình, hình ảnh, âm thanh.

#### 1.6.2. Ứng dụng trong đề tài

Google Gemini AI được tích hợp vào ứng dụng thông qua `@google/generative-ai` SDK để cung cấp:
- **Gợi ý lịch trình tự động**: Phân tích công việc hiện tại và đề xuất cách sắp xếp tối ưu.
- **Import lịch từ ảnh**: Nhận diện lịch trình từ hình ảnh (thời khoá biểu, screenshot) và chuyển đổi thành sự kiện.
- **Gợi ý tag/nhãn**: Tự động đề xuất nhãn phân loại cho công việc.
- **Chat tư vấn (Chat Advisor)**: Chatbot AI tư vấn quản lý thời gian, phân tích lịch trình.

### 1.7. Giới thiệu các dịch vụ tích hợp

#### 1.7.1. Telegram Bot API

Telegram Bot API cho phép xây dựng bot tự động trên nền tảng Telegram. Trong đề tài, Telegram Bot được sử dụng để:
- Gửi thông báo nhắc nhở công việc.
- Gửi báo cáo lương hàng tháng.
- Nhắc nhở lịch trình hàng tuần.
- Gợi ý AI vào cuối tuần.

#### 1.7.2. Google Calendar API (OAuth2)

Google Calendar API cho phép đồng bộ lịch trình hai chiều giữa ứng dụng và Google Calendar của người dùng thông qua giao thức OAuth2. Token được mã hoá bằng AES-256-GCM trước khi lưu vào database.

#### 1.7.3. JSON Web Token (JWT)

JWT được sử dụng cho xác thực người dùng. Sau khi đăng nhập thành công, server trả về JWT token có thời hạn 7 ngày, được lưu trữ trong localStorage của trình duyệt và gửi kèm mỗi request qua header `Authorization: Bearer <token>`.

---

## CHƯƠNG II: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG

### 2.1. Khảo sát thực trạng

Trong môi trường làm việc và học tập hiện đại, việc quản lý thời gian hiệu quả đóng vai trò quyết định. Theo nghiên cứu, hơn 80% sinh viên và nhân viên văn phòng gặp khó khăn trong việc sắp xếp lịch trình hợp lý. Các vấn đề thường gặp:

- **Quá nhiều công cụ riêng lẻ**: Lịch trên Google Calendar, công việc trên Todoist, nhắc nhở trên Telegram — thiếu tích hợp.
- **Thiếu gợi ý thông minh**: Các ứng dụng truyền thống chỉ lưu trữ, không phân tích và đề xuất.
- **Quản lý lương part-time phức tạp**: Sinh viên làm thêm cần tính lương theo giờ, ca, loại công việc.
- **Không theo dõi được thói quen**: Thiếu công cụ trực quan để theo dõi tính nhất quán.

### 2.2. Một số ứng dụng quản lý lịch trình tương tự

**Google Calendar**
- Ưu điểm: Đồng bộ đa thiết bị, tích hợp sâu với Google Workspace, giao diện trực quan.
- Nhược điểm: Không có AI gợi ý lịch trình, không quản lý lương, không có habit tracker.

**Todoist**
- Ưu điểm: Quản lý task mạnh mẽ, có AI hỗ trợ, đa nền tảng.
- Nhược điểm: Giao diện lịch hạn chế, không tích hợp tính lương, bản miễn phí bị giới hạn.

**Notion**
- Ưu điểm: Linh hoạt, tuỳ chỉnh cao, hỗ trợ AI.
- Nhược điểm: Phức tạp cho người mới, không có lịch trực quan native, hiệu suất chậm.

Sau khi phân tích, ứng dụng "Schedule With AI" được thiết kế để kết hợp ưu điểm: lịch trình trực quan (như Google Calendar) + quản lý task (như Todoist) + AI thông minh + quản lý lương + habit tracker, tất cả trong một ứng dụng duy nhất.

### 2.3. Các đối tượng tương tác với hệ thống

| STT | Tên tác nhân | Mô tả |
|-----|-------------|-------|
| 1 | **Khách (chưa đăng nhập)** | Xem giao diện ứng dụng với dữ liệu trống, xem trang lịch/công việc/lương ở dạng demo. Khi tương tác (tạo công việc, kéo thả, v.v.) sẽ hiển thị modal yêu cầu đăng nhập. |
| 2 | **Người dùng đã đăng nhập** | Có đầy đủ quyền: quản lý công việc, lịch trình, sử dụng AI, quản lý lương, liên kết dịch vụ ngoài, theo dõi thói quen, sử dụng Pomodoro, chia sẻ lịch, chat AI tư vấn, tuỳ chỉnh cài đặt. |

### 2.4. Sơ đồ Use Case

#### 2.4.1. Use case tổng quát — Khách (chưa đăng nhập)

Khách có thể:
- Xem giao diện Calendar, Work, Salary (dữ liệu trống)
- Đăng ký tài khoản
- Đăng nhập
- Khi tương tác bất kỳ chức năng → hiển thị modal đăng nhập

#### 2.4.2. Use case tổng quát — Người dùng đã đăng nhập

Người dùng đã đăng nhập có thể:
- Quản lý công việc (CRUD task)
- Quản lý lịch trình (Calendar view, drag & drop, resize)
- Sử dụng AI gợi ý lịch trình
- Import lịch từ ảnh bằng AI
- Quản lý lương (part-time, full-time, ca làm)
- Liên kết Telegram Bot
- Liên kết Google Calendar (OAuth2)
- Sử dụng Habit Tracker
- Sử dụng Pomodoro Timer
- Chia sẻ lịch cộng tác
- Chat AI tư vấn
- Quản lý tags/nhãn
- Tuỳ chỉnh cài đặt (theme, màu accent)
- Cập nhật hồ sơ cá nhân
- Đăng xuất

#### 2.4.3. Use case chi tiết — Đăng ký tài khoản

**Mục đích**: Người dùng đăng ký tài khoản để sử dụng đầy đủ chức năng.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Người dùng click nút "Đăng nhập" trên sidebar | 2. Hiển thị modal đăng nhập/đăng ký (tab Đăng ký) |
| 3. Nhập Username, Email, Mật khẩu, Họ tên | |
| 4. Click nút "Đăng ký" | 5. Validate dữ liệu, kiểm tra trùng username/email |
| | 6. Nếu hợp lệ: tạo tài khoản, hash mật khẩu (bcrypt), trả về JWT token |
| | 7. Nếu không hợp lệ: hiển thị lỗi |
| 8. Đăng nhập tự động sau đăng ký thành công | |

**Điều kiện trước**: Không có.
**Điều kiện sau**: Tài khoản được tạo, người dùng được đăng nhập tự động.

#### 2.4.4. Use case chi tiết — Đăng nhập

**Mục đích**: Xác thực người dùng và cấp quyền truy cập.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Click nút "Đăng nhập" trên sidebar | 2. Hiển thị modal đăng nhập (tab Đăng nhập) |
| 3. Nhập Username/Email và Mật khẩu | |
| 4. Click nút "Đăng nhập" | 5. Xác thực thông tin (bcrypt compare) |
| | 6. Nếu đúng: trả về JWT token (7 ngày), lưu localStorage |
| | 7. Nếu sai: hiển thị lỗi |
| 8. Giao diện cập nhật: hiển thị nút "Đăng xuất", tải dữ liệu | |

**Điều kiện trước**: Người dùng đã có tài khoản.
**Điều kiện sau**: JWT token được lưu, giao diện hiển thị đầy đủ dữ liệu.

#### 2.4.5. Use case chi tiết — Quản lý công việc

**Mục đích**: CRUD công việc với đầy đủ thuộc tính.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Click "Tạo công việc mới" | 2. Hiển thị modal tạo công việc |
| 3. Nhập: Tên, Danh mục, Ngày bắt đầu/kết thúc, Giờ, Ưu tiên, Tags, Lặp lại | |
| 4. Click "Lưu" | 5. Validate, lưu vào Tasks table, tạo TaskInstances nếu lặp lại |
| 6. Xem danh sách công việc (trang Work) | 7. Hiển thị danh sách sắp xếp theo ưu tiên/ngày |
| 8. Click checkbox hoàn thành | 9. Cập nhật trạng thái task |
| 10. Click sửa/xóa | 11. Cập nhật hoặc xóa task |

**Chức năng mở rộng**:
- Sắp xếp theo: ưu tiên, ngày, tên, danh mục
- Lọc theo: ngày, trạng thái, danh mục
- Subtask: thêm công việc con cho mỗi task
- Task lặp lại: tạo instances cho ngày/tuần/tháng

#### 2.4.6. Use case chi tiết — Quản lý lịch (Calendar)

**Mục đích**: Hiển thị và tương tác trực quan với lịch trình.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Chuyển đến trang Calendar | 2. Hiển thị FullCalendar với các sự kiện |
| 3. Click vào ô ngày trống | 4. Hiển thị modal tạo công việc nhanh |
| 5. Kéo thả sự kiện sang ngày/giờ khác | 6. Cập nhật thời gian sự kiện |
| 7. Kéo mép sự kiện | 8. Thay đổi thời lượng sự kiện |
| 9. Click vào sự kiện | 10. Hiển thị modal chi tiết sự kiện |
| 11. Chọn chế độ xem: tháng/tuần/ngày/danh sách | 12. Chuyển đổi view tương ứng |
| 13. Chọn nhiều sự kiện + "Hoàn thành hàng loạt" | 14. Bulk complete các sự kiện đã chọn |

#### 2.4.7. Use case chi tiết — Tương tác AI

**Mục đích**: Sử dụng AI để gợi ý và tối ưu lịch trình.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Click "AI Gợi ý" | 2. Hiển thị panel AI với các tuỳ chọn |
| 3. Chọn ngày cần gợi ý | 4. AI phân tích công việc hiện tại |
| | 5. Trả về danh sách gợi ý sắp xếp thời gian tối ưu |
| 6. Click "Áp dụng" trên từng gợi ý | 7. Tạo sự kiện trên lịch theo gợi ý AI |
| 8. Upload ảnh thời khoá biểu | 9. AI nhận diện và trích xuất lịch trình từ ảnh |
| | 10. Hiển thị danh sách sự kiện đã nhận diện |
| 11. Click "Import" | 12. Tạo các sự kiện tương ứng trên lịch |

**Chức năng mở rộng AI**:
- AI gợi ý tag/nhãn phù hợp cho công việc
- AI phân tích reference data để đề xuất lịch trình
- Lịch sử gợi ý AI được lưu để cải thiện

#### 2.4.8. Use case chi tiết — Quản lý lương

**Mục đích**: Tính toán và theo dõi thu nhập từ các công việc part-time/full-time.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Chuyển đến trang Salary | 2. Hiển thị bảng lương với các tab loại lương |
| 3. Chọn loại lương (theo giờ, theo ca, full-time) | 4. Hiển thị dữ liệu tương ứng |
| 5. Đánh dấu ngày làm việc trên lịch full-time | 6. Tính toán lương dựa trên ngày/giờ/ca |
| 7. Xem thống kê | 8. Hiển thị tổng lương, số giờ, biểu đồ |
| 9. Điều chỉnh (OT, nghỉ phép, v.v.) | 10. Cập nhật lương sau điều chỉnh |

#### 2.4.9. Use case chi tiết — Liên kết dịch vụ

**Mục đích**: Kết nối với Telegram Bot và Google Calendar.

**A. Liên kết Telegram**

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Chuyển đến trang Liên kết > Tab Telegram | 2. Hiển thị mã liên kết và hướng dẫn |
| 3. Gửi mã liên kết đến Telegram Bot | 4. Bot xác thực mã, liên kết tài khoản |
| | 5. Tự động gửi nhắc nhở công việc, báo cáo lương |

**B. Liên kết Google Calendar**

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Chuyển đến trang Liên kết > Tab Google Calendar | 2. Hiển thị nút "Kết nối Google Calendar" |
| 3. Click kết nối | 4. Redirect sang Google OAuth2 consent screen |
| 5. Cấp quyền truy cập | 6. Nhận authorization code, đổi lấy access/refresh token |
| | 7. Mã hoá token (AES-256-GCM) và lưu database |
| | 8. Đồng bộ sự kiện hai chiều |

#### 2.4.10. Use case chi tiết — Habit Tracker

**Mục đích**: Theo dõi thói quen hàng ngày với giao diện trực quan.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Chuyển đến trang Habits | 2. Hiển thị danh sách thói quen |
| 3. Tạo thói quen mới (tên, tần suất, icon) | 4. Lưu habit vào database |
| 5. Đánh dấu hoàn thành hàng ngày | 6. Ghi log, cập nhật streak |
| 7. Xem heatmap (GitHub-style) | 8. Hiển thị calendar heatmap theo cường độ màu |
| | 9. Tính toán current streak, longest streak |

#### 2.4.11. Use case chi tiết — Pomodoro Timer

**Mục đích**: Hỗ trợ kỹ thuật Pomodoro cho tập trung làm việc.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Mở Pomodoro Timer | 2. Hiển thị đồng hồ đếm ngược (25 phút mặc định) |
| 3. Click "Start" | 4. Bắt đầu đếm ngược |
| 5. Hoàn thành 1 pomodoro | 6. Ghi nhận phiên, chuyển sang nghỉ (5 phút) |
| 7. Xem thống kê | 8. Hiển thị số pomodoro/ngày, tổng thời gian tập trung |

#### 2.4.12. Use case chi tiết — Chia sẻ lịch cộng tác

**Mục đích**: Chia sẻ lịch trình với người dùng khác.

| Hành động của tác nhân | Phản ứng của hệ thống |
|------------------------|----------------------|
| 1. Click "Chia sẻ lịch" | 2. Hiển thị modal chia sẻ |
| 3. Nhập email người nhận, chọn quyền (xem/sửa) | 4. Tạo lời mời chia sẻ |
| 5. Người nhận chấp nhận/từ chối | 6. Cập nhật quyền truy cập |
| 7. Xem lịch được chia sẻ | 8. Hiển thị sự kiện của lịch được chia sẻ |

### 2.5. Sơ đồ tuần tự (Sequence Diagram)

#### 2.5.1. Sơ đồ tuần tự — Đăng nhập

```
User → Frontend: Click "Đăng nhập"
Frontend → Frontend: Hiển thị Auth Modal
User → Frontend: Nhập username, password
Frontend → Backend API: POST /api/auth/login {username, password}
Backend API → Database: SELECT * FROM Users WHERE Username = ?
Database → Backend API: User record
Backend API → Backend API: bcrypt.compare(password, hashed)
Backend API → Frontend: {success: true, token: JWT, user: {...}}
Frontend → localStorage: Lưu JWT token
Frontend → Frontend: Cập nhật UI, tải dữ liệu
```

#### 2.5.2. Sơ đồ tuần tự — Tạo công việc

```
User → Frontend: Click "Tạo công việc mới"
Frontend → Frontend: Hiển thị modal tạo
User → Frontend: Nhập thông tin, click "Lưu"
Frontend → Backend API: POST /api/tasks {task data} + Authorization header
Backend API → Middleware: authenticateToken(JWT)
Middleware → Backend API: user decoded
Backend API → Controller: taskController.create(req, res)
Controller → Service: taskCrudService.create(taskData, userId)
Service → Database: INSERT INTO Tasks (...)
Database → Service: New task record
Service → Controller: task
Controller → Frontend: {success: true, data: task}
Frontend → FullCalendar: Thêm event mới vào calendar
```

#### 2.5.3. Sơ đồ tuần tự — AI Gợi ý lịch trình

```
User → Frontend: Click "AI Gợi ý" + chọn ngày
Frontend → Backend API: POST /api/ai/suggest {date, tasks}
Backend API → Controller: aiController.suggest(req, res)
Controller → Service: aiScheduleService.generateSuggestions(...)
Service → AI Prompt: Tạo prompt với context user
Service → Gemini API: generateContent(prompt)
Gemini API → Service: JSON response với gợi ý
Service → Controller: parsed suggestions
Controller → Frontend: {success: true, suggestions: [...]}
Frontend → Frontend: Render danh sách gợi ý
User → Frontend: Click "Áp dụng"
Frontend → Backend API: POST /api/schedule/apply {suggestions}
Backend API → Database: INSERT INTO Tasks (batch)
```

#### 2.5.4. Sơ đồ tuần tự — Liên kết Google Calendar

```
User → Frontend: Click "Kết nối Google Calendar"
Frontend → Backend API: GET /api/google-calendar/auth-url
Backend API → Google OAuth2: Tạo authorization URL (state = JWT signed)
Backend API → Frontend: {url: "https://accounts.google.com/o/oauth2/..."}
Frontend → Browser: Redirect sang Google
User → Google: Cấp quyền
Google → Backend API: GET /api/google-calendar/callback?code=...&state=...
Backend API → Backend API: Verify JWT state, extract userId
Backend API → Google OAuth2: Exchange code → tokens
Backend API → Backend API: AES-256-GCM encrypt tokens
Backend API → Database: INSERT INTO GoogleCalendarConnections (encrypted tokens)
Backend API → Frontend: Redirect về /connections?google=success
```

### 2.6. Sơ đồ hoạt động (Activity Diagram)

#### 2.6.1. Sơ đồ hoạt động — Đăng nhập

```
[Start] → Hiển thị Modal → Nhập thông tin → Validate client
  → [Hợp lệ?]
    → Có: Gửi request API → Xác thực server
      → [Đúng?]
        → Có: Lưu JWT → Cập nhật UI → [End]
        → Không: Hiển thị lỗi → Nhập lại
    → Không: Hiển thị lỗi validation → Nhập lại
```

#### 2.6.2. Sơ đồ hoạt động — Tạo công việc với AI gợi ý

```
[Start] → Click "AI Gợi ý" → Chọn ngày/tuần → Gửi request AI
  → AI phân tích → Trả về gợi ý
  → [Người dùng chấp nhận?]
    → Có: Chỉnh sửa (tuỳ chọn) → Áp dụng → Tạo events → [End]
    → Không: Huỷ / Yêu cầu gợi ý lại
```

#### 2.6.3. Sơ đồ hoạt động — Guest mode (chế độ khách)

```
[Start] → Tải trang → [Đã đăng nhập?]
  → Có: Tải dữ liệu → Hiển thị đầy đủ → [End]
  → Không: Hiển thị UI rỗng (dữ liệu mặc định = 0)
    → [Người dùng tương tác?]
      → Có: Hiển thị Auth Modal → [Đăng nhập thành công?]
        → Có: Tải dữ liệu → [End]
        → Không: Quay lại UI rỗng
      → Không: Tiếp tục xem → [End]
```

### 2.7. Kiến trúc hệ thống

#### 2.7.1. Kiến trúc tổng quát

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Vanilla  │ │FullCal-  │ │ Tailwind │ │ Font        │ │
│  │ JS (SPA) │ │ endar 6  │ │ CSS CDN  │ │ Awesome CDN │ │
│  └────┬─────┘ └──────────┘ └──────────┘ └─────────────┘ │
│       │ REST API (JSON) + JWT Auth                        │
└───────┼──────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────┐
│       ▼          BACKEND (Node.js + Express.js)           │
│  ┌─────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ Routes  │→ │ Controllers  │→ │ Services          │    │
│  │ (24)    │  │ (7)          │  │ (9)               │    │
│  └─────────┘  └──────────────┘  └────────┬──────────┘    │
│  ┌─────────┐  ┌──────────────┐           │               │
│  │Middleware│  │ Lib          │           │               │
│  │ (Auth)  │  │ (7 modules)  │           │               │
│  └─────────┘  └──────────────┘           │               │
│  ┌─────────────────┐ ┌─────────────┐     │               │
│  │ Telegram Bot    │ │ Cron Jobs   │     │               │
│  │ + Reminder      │ │ (node-cron) │     │               │
│  └─────────────────┘ └─────────────┘     │               │
└──────────────────────────────────────────┼───────────────┘
                                           │
        ┌──────────────────────────────────┼──────────┐
        │              EXTERNAL SERVICES    │          │
        │  ┌──────────┐  ┌──────────┐      ▼          │
        │  │ Google   │  │ Telegram │  ┌─────────┐    │
        │  │ Gemini   │  │ Bot API  │  │Supabase │    │
        │  │ AI API   │  │          │  │(Postgres)│   │
        │  └──────────┘  └──────────┘  └─────────┘    │
        │  ┌──────────┐                                │
        │  │ Google   │                                │
        │  │ Calendar │                                │
        │  │ API      │                                │
        │  └──────────┘                                │
        └──────────────────────────────────────────────┘
```

#### 2.7.2. Cấu trúc thư mục dự án

```
Schedule-With-AI/
├── backend/
│   ├── config/
│   │   └── database.js              # Supabase client initialization
│   ├── controllers/                  # Request/Response handlers
│   │   ├── ai-controller.js
│   │   ├── ai-history-controller.js
│   │   ├── ai-schedule-controller.js
│   │   ├── calendar-controller.js
│   │   ├── task-controller.js
│   │   ├── task-instance-controller.js
│   │   └── user-controller.js
│   ├── services/                     # Business logic
│   │   ├── ai-gemini-client.js
│   │   ├── ai-prompt-service.js
│   │   ├── ai-schedule-service.js
│   │   ├── calendar-service.js
│   │   ├── task-crud-service.js
│   │   ├── task-instance-service.js
│   │   ├── task-service.js
│   │   ├── task-write-service.js
│   │   └── user-service.js
│   ├── routes/                       # API endpoint definitions (24 files)
│   │   ├── auth.js                   # Đăng ký, đăng nhập
│   │   ├── tasks.js                  # CRUD tasks
│   │   ├── calendar.js               # Calendar events
│   │   ├── ai.js                     # AI suggestions
│   │   ├── ai-reference.js           # AI reference data
│   │   ├── categories.js             # Danh mục công việc
│   │   ├── salary.js                 # Quản lý lương
│   │   ├── statistics.js             # Thống kê
│   │   ├── users.js                  # Quản lý user
│   │   ├── event.js                  # Chi tiết sự kiện
│   │   ├── event-subtasks.js         # Subtasks
│   │   ├── task-instances.js         # Task instances (lặp lại)
│   │   ├── apply-schedule.js         # Áp dụng lịch AI
│   │   ├── schedule-completion.js    # Hoàn thành lịch
│   │   ├── adjustments.js            # Điều chỉnh lương
│   │   ├── tags.js                   # Tags/Labels + AI suggest
│   │   ├── pomodoro.js               # Pomodoro sessions
│   │   ├── habits.js                 # Habit tracker + heatmap
│   │   ├── calendar-shares.js        # Chia sẻ lịch
│   │   ├── calendar-shared-events.js # Sự kiện chia sẻ
│   │   ├── google-calendar.js        # Google Calendar OAuth2
│   │   ├── chat-advisor.js           # Chat AI tư vấn
│   │   ├── notification.routes.js    # Thông báo Telegram
│   │   └── notification-prefs.js     # Cài đặt thông báo
│   ├── middleware/
│   │   └── auth.js                   # JWT authentication
│   ├── lib/                          # Shared libraries
│   │   ├── google-calendar-client.js
│   │   ├── google-calendar-sync.js
│   │   ├── token-encryption.js       # AES-256-GCM
│   │   ├── habits-streak-helper.js
│   │   ├── chat-advisor-prompt.js
│   │   ├── salary-validators.js
│   │   └── shift-matcher.js
│   ├── telegram/                     # Telegram Bot
│   │   ├── bot.js
│   │   ├── commands/
│   │   ├── reminder-engine.js
│   │   ├── reminders/
│   │   ├── schedule-updater.js
│   │   └── scheduleSender.js
│   ├── utils/
│   │   ├── name-matcher.js
│   │   ├── rate-limit.js
│   │   └── schedule-image-prompt.js
│   ├── migrations/                   # SQL migrations (001-015)
│   ├── tests/                        # Unit tests (8 files)
│   └── server.js                     # Entry point
├── frontend/
│   ├── index.html                    # SPA entry point
│   ├── pages/                        # Page templates (HTML)
│   │   ├── calendar-content.html
│   │   ├── work.html
│   │   ├── salary.html
│   │   ├── connections.html
│   │   ├── habits.html
│   │   ├── profile.html
│   │   ├── ai-content.html
│   │   └── notifications.html
│   ├── components/
│   │   ├── sidebar.html
│   │   ├── calendar-sidebar.html
│   │   └── modals/                   # 9 modal templates
│   │       ├── auth-modal.html
│   │       ├── create-task-modal.html
│   │       ├── ai-suggestion-modal.html
│   │       ├── ai-task-edit-modal.html
│   │       ├── settings-modal.html
│   │       ├── profile-modal.html
│   │       ├── schedule-import-modal.html
│   │       ├── create-category-modal.html
│   │       └── priority-manager-modal.html
│   └── assets/
│       ├── css/                      # 15 CSS files
│       │   ├── main.css
│       │   ├── calendar.css
│       │   ├── work.css
│       │   ├── salary.css
│       │   ├── auth-modal.css
│       │   ├── habits.css
│       │   ├── pomodoro.css
│       │   ├── tags.css
│       │   ├── connections.css
│       │   ├── calendar-shares.css
│       │   └── ...
│       └── js/
│           ├── core/                 # Core modules
│           │   ├── app.js            # App initialization
│           │   ├── utils.js          # Utilities + auth guards
│           │   ├── component-loader.js
│           │   ├── app-navigation.js # SPA routing
│           │   ├── modal-manager.js
│           │   └── installHook.js
│           ├── auth/
│           │   ├── auth.js
│           │   └── auth-modal-controller.js
│           ├── theme/
│           │   ├── theme.js          # Dark/Light mode
│           │   ├── accent-theme.js   # Customizable accent color
│           │   └── priority-theme.js
│           ├── modules/
│           │   ├── calendar/         # 7 files
│           │   ├── ai/              # 6 files
│           │   ├── work/            # 5 files
│           │   ├── salary/          # 4 files
│           │   └── habits/          # 4 files
│           └── widgets/
│               ├── pomodoro/        # 2 files
│               ├── chat-advisor/    # 1 file
│               ├── tag-input-widget.js
│               ├── schedule-image-upload.js
│               └── profile-manager.js
└── package.json
```

### 2.8. Thiết kế cơ sở dữ liệu

#### 2.8.1. Mô hình quan hệ

```
Users ──┬── Tasks ──── TaskInstances
        │     └── TaskTags ──── Tags
        │     └── EventSubtasks
        ├── Categories
        ├── SalaryRecords
        ├── TelegramConnections
        ├── ChatAdvisorMessages
        ├── GoogleCalendarConnections
        ├── PomodoroSessions
        ├── Habits ──── HabitLogs
        ├── CalendarShares (owner) ──┐
        └── CalendarShares (shared)──┘
```

#### 2.8.2. Mô hình vật lý

**Bảng Users**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| UserID | uuid | No | PK, auto | Mã người dùng |
| Username | varchar(50) | No | unique | Tên đăng nhập |
| Password | varchar(255) | No | | Mật khẩu (bcrypt hash) |
| Email | varchar(100) | No | unique | Email |
| HoTen | varchar(100) | Yes | | Họ và tên |
| AvatarUrl | varchar(500) | Yes | | URL ảnh đại diện |
| LuongTheoGio | integer | Yes | default 29000 | Lương theo giờ |
| IsActive | boolean | No | default true | Trạng thái hoạt động |
| CreatedDate | timestamp | No | | Ngày tạo |
| NgayTao | timestamp | No | | Ngày tạo (alias) |

**Bảng Tasks**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| TaskID | uuid | No | PK, auto | Mã công việc |
| UserID | uuid | No | FK → Users | Người tạo |
| TieuDe | varchar(255) | No | | Tiêu đề công việc |
| MoTa | text | Yes | | Mô tả chi tiết |
| NgayBatDau | date | Yes | | Ngày bắt đầu |
| NgayKetThuc | date | Yes | | Ngày kết thúc |
| GioBatDau | time | Yes | | Giờ bắt đầu |
| GioKetThuc | time | Yes | | Giờ kết thúc |
| TrangThai | varchar(20) | No | default 'pending' | Trạng thái (pending/done) |
| DoUuTien | integer | Yes | default 3 | Độ ưu tiên (1-5) |
| MauSac | varchar(7) | Yes | | Mã màu hiển thị |
| DanhMuc | varchar(100) | Yes | | Danh mục |
| LapLai | varchar(20) | Yes | | Kiểu lặp lại (daily/weekly/monthly) |
| LoaiLuong | varchar(50) | Yes | | Loại lương liên quan |
| IsAISuggested | boolean | Yes | default false | Được AI gợi ý |
| CreatedDate | timestamp | No | | Ngày tạo |

**Bảng TaskInstances**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| InstanceID | uuid | No | PK, auto | Mã instance |
| TaskID | uuid | No | FK → Tasks | Task gốc |
| UserID | uuid | No | FK → Users | Người sở hữu |
| NgayThucHien | date | No | | Ngày thực hiện |
| TrangThai | varchar(20) | No | default 'pending' | Trạng thái |
| GhiChu | text | Yes | | Ghi chú |

**Bảng Categories**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| CategoryID | uuid | No | PK, auto | Mã danh mục |
| UserID | uuid | No | FK → Users | Người tạo |
| TenDanhMuc | varchar(100) | No | | Tên danh mục |
| MauSac | varchar(7) | Yes | | Mã màu |
| Icon | varchar(50) | Yes | | Icon |

**Bảng EventSubtasks**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| SubtaskID | uuid | No | PK, auto | Mã subtask |
| TaskID | uuid | No | FK → Tasks | Task cha |
| TieuDe | varchar(255) | No | | Tiêu đề subtask |
| TrangThai | boolean | No | default false | Hoàn thành chưa |
| ThuTu | integer | Yes | | Thứ tự hiển thị |

**Bảng Tags**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| TagID | uuid | No | PK, auto | Mã tag |
| UserID | uuid | No | FK → Users | Người tạo |
| Name | varchar(50) | No | | Tên tag |
| Color | varchar(7) | Yes | | Mã màu tag |

**Bảng TaskTags**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| TaskID | uuid | No | FK → Tasks | Mã task |
| TagID | uuid | No | FK → Tags | Mã tag |

**Bảng SalaryRecords** (tên bảng thực tế phụ thuộc migration)

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| RecordID | uuid | No | PK, auto | Mã bản ghi |
| UserID | uuid | No | FK → Users | Người dùng |
| LoaiLuong | varchar(50) | No | | Loại lương |
| SoGio | decimal | Yes | | Số giờ làm |
| SoTien | decimal | No | | Số tiền |
| NgayLam | date | No | | Ngày làm việc |
| CaLam | varchar(50) | Yes | | Ca làm |

**Bảng TelegramConnections**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| ConnectionID | uuid | No | PK, auto | Mã liên kết |
| UserID | uuid | No | FK → Users | Người dùng |
| TelegramChatID | varchar(100) | No | | Chat ID Telegram |
| TelegramUsername | varchar(100) | Yes | | Username Telegram |
| IsActive | boolean | No | default true | Trạng thái |
| ConnectedDate | timestamp | No | | Ngày liên kết |

**Bảng ChatAdvisorMessages**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| MessageID | uuid | No | PK, auto | Mã tin nhắn |
| UserID | uuid | No | FK → Users | Người dùng |
| Role | varchar(20) | No | | user/assistant |
| Content | text | No | | Nội dung tin nhắn |
| CreatedDate | timestamp | No | | Thời gian |

**Bảng GoogleCalendarConnections**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| ConnectionID | uuid | No | PK, auto | Mã liên kết |
| UserID | uuid | No | FK → Users | Người dùng |
| GoogleEmail | varchar(100) | No | | Email Google |
| EncryptedTokens | text | No | | Token đã mã hoá (AES-256-GCM) |
| IsActive | boolean | No | default true | Trạng thái |
| LastSyncDate | timestamp | Yes | | Lần đồng bộ cuối |

**Bảng PomodoroSessions**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| SessionID | uuid | No | PK, auto | Mã phiên |
| UserID | uuid | No | FK → Users | Người dùng |
| TaskID | uuid | Yes | FK → Tasks | Task liên quan |
| Duration | integer | No | | Thời lượng (phút) |
| CompletedAt | timestamp | No | | Thời gian hoàn thành |
| Type | varchar(20) | No | | work/break |

**Bảng Habits**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| HabitID | uuid | No | PK, auto | Mã thói quen |
| UserID | uuid | No | FK → Users | Người dùng |
| Name | varchar(100) | No | | Tên thói quen |
| Icon | varchar(10) | Yes | | Emoji icon |
| Frequency | varchar(20) | No | default 'daily' | Tần suất |
| IsActive | boolean | No | default true | Trạng thái |
| CreatedDate | timestamp | No | | Ngày tạo |

**Bảng HabitLogs**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| LogID | uuid | No | PK, auto | Mã log |
| HabitID | uuid | No | FK → Habits | Thói quen |
| LogDate | date | No | | Ngày ghi nhận |
| Completed | boolean | No | default true | Hoàn thành |

**Bảng CalendarShares**

| Column | Type | Null | Extra | Mô tả |
|--------|------|------|-------|-------|
| ShareID | uuid | No | PK, auto | Mã chia sẻ |
| OwnerID | uuid | No | FK → Users | Người sở hữu lịch |
| SharedWithID | uuid | No | FK → Users | Người được chia sẻ |
| Permission | varchar(20) | No | default 'view' | Quyền (view/edit) |
| Status | varchar(20) | No | default 'pending' | Trạng thái (pending/accepted/rejected) |
| CreatedDate | timestamp | No | | Ngày tạo |

---

## CHƯƠNG III: TRIỂN KHAI HỆ THỐNG

### 3.1. Kết quả thực hiện

#### 3.1.1. Giao diện Sidebar và điều hướng

**Giao diện**: Sidebar cố định bên trái (256px).

**Mô tả**: Sidebar hiển thị logo, menu điều hướng chính, và nút đăng nhập/đăng xuất. Khi chưa đăng nhập, nút hiển thị "Đăng nhập"; khi đã đăng nhập, hiển thị "Đăng xuất" kèm tên người dùng.

**Cách truy cập**: Luôn hiển thị ở mọi trang.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Logo | Image | Logo ứng dụng |
| Lịch | MenuItem | Chuyển đến trang Calendar |
| Công việc | MenuItem | Chuyển đến trang Work |
| Lương | MenuItem | Chuyển đến trang Salary |
| AI Lịch trình | MenuItem | Chuyển đến trang AI |
| Liên kết | MenuItem | Chuyển đến trang Connections |
| Thói quen | MenuItem | Chuyển đến trang Habits |
| Hồ sơ | MenuItem | Chuyển đến trang Profile |
| Đăng nhập/Đăng xuất | Button | Toggle đăng nhập/đăng xuất |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Click MenuItem | Chuyển trang SPA | Hiển thị nội dung trang | |
| Click Đăng nhập | Mở Auth Modal | Modal hiển thị | |
| Click Đăng xuất | Xoá JWT, reload | Quay về trạng thái khách | |

#### 3.1.2. Giao diện trang Lịch (Calendar)

**Giao diện**: Trang chính — FullCalendar full-width với sidebar phải.

**Mô tả**: Hiển thị lịch trình dưới dạng calendar tương tác. Hỗ trợ nhiều chế độ xem, drag & drop, resize, click tạo nhanh.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| FullCalendar | Component | Lịch tương tác chính |
| Calendar Sidebar | Panel | Mini calendar + thông tin ngày |
| Nút chế độ xem | ButtonGroup | Tháng / Tuần / Ngày / Danh sách |
| Nút tạo mới | Button | Mở modal tạo công việc |
| Nút AI Gợi ý | Button | Mở panel AI |
| Nút Import | Button | Import lịch từ ảnh |
| Nút Chia sẻ | Button | Chia sẻ lịch |
| Hoàn thành hàng loạt | Button | Bulk complete events |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Click ô trống | Quick create event | Modal tạo nhanh | Nếu khách: Auth Modal |
| Kéo thả event | Di chuyển thời gian | Cập nhật thời gian | Nếu khách: Auth Modal |
| Kéo mép event | Thay đổi duration | Cập nhật thời lượng | Nếu khách: Auth Modal |
| Click event | Xem chi tiết | Modal chi tiết | |
| Double-click event | Sửa sự kiện | Modal chỉnh sửa | |

#### 3.1.3. Giao diện trang Công việc (Work)

**Giao diện**: Danh sách công việc với controls sắp xếp/lọc.

**Mô tả**: Hiển thị tất cả công việc dưới dạng danh sách, hỗ trợ sắp xếp theo nhiều tiêu chí, lọc theo trạng thái và danh mục.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Danh sách task | List | Danh sách công việc |
| Sort controls | ButtonGroup | Sắp xếp: ưu tiên, ngày, tên |
| Filter controls | Select | Lọc: tất cả, đang làm, hoàn thành |
| Task item | Card | Tên, ưu tiên (màu), ngày, checkbox |
| Nút tạo mới | Button | Mở modal tạo |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Click checkbox | Hoàn thành task | Đánh dấu done | Nếu khách: Auth Modal |
| Click task | Xem/sửa chi tiết | Mở modal | |
| Sắp xếp | Thay đổi thứ tự | Danh sách cập nhật | |

#### 3.1.4. Giao diện Modal đăng nhập / đăng ký

**Giao diện**: Modal overlay theo phong cách Apple Design.

**Mô tả**: Modal 2 tab (Đăng nhập / Đăng ký) với thiết kế clean, đóng bằng X, click overlay, hoặc ESC.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Tab Đăng nhập | Tab | Form đăng nhập |
| Tab Đăng ký | Tab | Form đăng ký |
| Username | Text Input | Nhập tên đăng nhập |
| Email | Text Input | Nhập email (chỉ đăng ký) |
| Mật khẩu | Password Input | Nhập mật khẩu |
| Họ tên | Text Input | Nhập họ tên (chỉ đăng ký) |
| Nút Submit | Button | Đăng nhập / Đăng ký |
| Nút X | Button | Đóng modal |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Đăng nhập | Submit form | JWT saved, UI cập nhật | Hiển thị lỗi |
| Đăng ký | Submit form | Tạo TK + tự đăng nhập | Hiển thị lỗi |
| Đóng | Click X / overlay / ESC | Modal ẩn | |

#### 3.1.5. Giao diện tạo công việc mới

**Giao diện**: Modal tạo công việc đầy đủ.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Tiêu đề | Text Input | Tên công việc |
| Danh mục | Select | Chọn danh mục |
| Ngày bắt đầu | Date Input | Ngày bắt đầu |
| Ngày kết thúc | Date Input | Ngày kết thúc |
| Giờ bắt đầu | Time Input | Giờ bắt đầu |
| Giờ kết thúc | Time Input | Giờ kết thúc |
| Độ ưu tiên | Select | 1 (thấp) → 5 (cao) |
| Tags | Tag Input Widget | Thêm/xoá tags |
| Lặp lại | Select | Không / Hàng ngày / Hàng tuần / Hàng tháng |
| Mô tả | Textarea | Mô tả chi tiết |
| Nút Lưu | Button | Lưu công việc |
| Nút Huỷ | Button | Đóng modal |

#### 3.1.6. Giao diện chi tiết sự kiện

**Giao diện**: Modal hiển thị chi tiết event trên calendar.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Tiêu đề | Text | Tên sự kiện |
| Thời gian | Text | Ngày giờ bắt đầu — kết thúc |
| Danh mục | Badge | Nhãn danh mục (có màu) |
| Ưu tiên | Badge | Mức ưu tiên (có màu) |
| Tags | Tag List | Danh sách tags |
| Subtasks | Checklist | Danh sách subtasks |
| Mô tả | Text | Mô tả chi tiết |
| Nút Sửa | Button | Chuyển sang chế độ sửa |
| Nút Xoá | Button | Xoá sự kiện |
| Nút Hoàn thành | Button | Đánh dấu hoàn thành |

#### 3.1.7. Giao diện AI Gợi ý lịch trình

**Giao diện**: Panel AI bên phải calendar.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Chọn ngày | Date Picker | Ngày cần gợi ý |
| Nút "Gợi ý" | Button | Yêu cầu AI phân tích |
| Danh sách gợi ý | List | Các gợi ý thời gian AI |
| Nút "Áp dụng" | Button | Tạo event từ gợi ý |
| Nút "Bỏ qua" | Button | Bỏ qua gợi ý |
| Upload ảnh | File Input | Import lịch từ ảnh |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Gợi ý | AI phân tích tasks | Danh sách gợi ý | Lỗi API |
| Áp dụng | Tạo events | Events xuất hiện trên lịch | |
| Import ảnh | AI nhận diện | Danh sách events từ ảnh | Ảnh không rõ |

#### 3.1.8. Giao diện Quản lý lương

**Giao diện**: Trang Salary với tabs loại lương.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Tab loại lương | TabGroup | Theo giờ / Theo ca / Full-time |
| Bảng lương | Table | Danh sách bản ghi lương |
| Lịch full-time | Calendar | Mini calendar đánh dấu ngày làm |
| Thống kê | Stats Panel | Tổng lương, số giờ, trung bình |
| Nút thêm | Button | Thêm bản ghi lương |
| Điều chỉnh | Button | OT, nghỉ phép |

#### 3.1.9. Giao diện trang Liên kết (Connections)

**Giao diện**: Trang kết nối dịch vụ ngoài với 2 tabs.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Tab Telegram | Tab | Liên kết Telegram Bot |
| Tab Google Calendar | Tab | Liên kết Google Calendar |
| Mã liên kết Telegram | Text | Mã OTP để gửi đến bot |
| Trạng thái kết nối | Badge | Đã kết nối / Chưa kết nối |
| Nút kết nối Google | Button | Bắt đầu OAuth2 flow |
| Nút ngắt kết nối | Button | Huỷ liên kết |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Kết nối Telegram | Gửi mã cho bot | Liên kết thành công | Mã sai/hết hạn |
| Kết nối Google | OAuth2 flow | Token đã mã hoá lưu DB | Từ chối quyền |
| Ngắt kết nối | Xoá liên kết | Trạng thái = chưa kết nối | |

#### 3.1.10. Giao diện Habit Tracker

**Giao diện**: Trang theo dõi thói quen với heatmap.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Danh sách habits | List | Tên + icon + streak |
| Nút tạo mới | Button | Tạo thói quen mới |
| Check hôm nay | Button | Đánh dấu hoàn thành |
| Heatmap | Calendar Heatmap | GitHub-style heatmap (365 ngày) |
| Current streak | Badge | Chuỗi ngày liên tiếp hiện tại |
| Longest streak | Badge | Chuỗi dài nhất |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Tạo habit | Nhập tên, icon, tần suất | Habit mới xuất hiện | |
| Check | Đánh dấu hôm nay | Heatmap cập nhật, streak +1 | |
| Xoá habit | Xoá thói quen | Habit biến mất | |

#### 3.1.11. Giao diện Pomodoro Timer

**Giao diện**: Widget Pomodoro tích hợp.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Đồng hồ | Timer | Đếm ngược 25:00 / 5:00 |
| Nút Start | Button | Bắt đầu đếm |
| Nút Pause | Button | Tạm dừng |
| Nút Reset | Button | Reset về 25:00 |
| Số phiên | Counter | Số pomodoro hoàn thành hôm nay |
| Thống kê | Stats | Tổng phiên, tổng phút |

#### 3.1.12. Giao diện Chia sẻ lịch cộng tác

**Giao diện**: Modal chia sẻ + quản lý người được chia sẻ.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Email người nhận | Text Input | Email người muốn chia sẻ |
| Quyền | Select | Chỉ xem / Có thể sửa |
| Nút Mời | Button | Gửi lời mời |
| Danh sách đã mời | List | Người đã được mời + trạng thái |
| Nút Thu hồi | Button | Thu hồi lời mời |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Mời | Gửi email + tạo share record | Lời mời gửi | Email không tồn tại |
| Chấp nhận | Người nhận accept | Lịch hiển thị | |
| Từ chối | Người nhận reject | Record cập nhật | |
| Thu hồi | Người gửi revoke | Xoá quyền truy cập | |

#### 3.1.13. Giao diện Chat Advisor (AI tư vấn)

**Giao diện**: Chat widget kiểu messenger.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Chat history | List | Lịch sử tin nhắn |
| Input message | Text Input | Nhập câu hỏi |
| Nút Gửi | Button | Gửi câu hỏi |
| AI response | Bubble | Phản hồi từ Gemini AI |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Gửi câu hỏi | AI phân tích + trả lời | Phản hồi tư vấn | Lỗi API |
| Xem lịch sử | Cuộn xem tin cũ | Tin nhắn hiển thị | |

#### 3.1.14. Giao diện Cài đặt — Tuỳ chỉnh màu sắc

**Giao diện**: Modal settings.

| Mục | Kiểu | Mô tả |
|-----|------|-------|
| Palette presets | Color Grid | 8 màu preset (Xanh dương, Tím, Đỏ, ...) |
| Custom color | Color Picker | Chọn màu tuỳ chỉnh |
| Preview | Preview | Xem trước giao diện với màu mới |
| Nút Áp dụng | Button | Lưu màu accent |

| Hành động | Mô tả | Thành công | Thất bại |
|-----------|-------|------------|----------|
| Chọn preset | Click vào ô màu | Accent thay đổi real-time | |
| Custom | Chọn từ color picker | Accent thay đổi real-time | |
| Áp dụng | Lưu vào localStorage | Giữ sau reload | |

**Màu mặc định**: `#2563EB` (Xanh dương)

**CSS Variables tự động cập nhật**:
- `--accent`: Màu chính
- `--accent-hover`: Màu hover (sáng hơn 10%)
- `--accent-dark`: Màu tối (tối hơn 15%)
- `--accent-header`: Gradient cho modal headers
- `--accent-gradient`: Gradient background

---

## KẾT LUẬN

Qua quá trình thực hiện khóa luận, đã đạt được những kết quả sau:

### Ưu điểm

- **Hệ thống đầy đủ chức năng**: Xây dựng thành công ứng dụng quản lý lịch trình với 15+ chức năng chính bao gồm: quản lý công việc (CRUD, subtasks, tags, lặp lại), lịch trình trực quan (FullCalendar, drag & drop, resize), AI gợi ý thông minh (Gemini), quản lý lương (part-time, full-time), Telegram Bot nhắc nhở, Google Calendar đồng bộ, Habit Tracker + heatmap, Pomodoro Timer, chia sẻ lịch cộng tác, Chat AI tư vấn.
- **Kiến trúc chuyên nghiệp**: Tổ chức code theo mô hình Controller-Service-Route, tách biệt rõ ràng các tầng, dễ bảo trì và mở rộng.
- **Bảo mật**: Xác thực JWT, hash password (bcrypt), mã hoá token (AES-256-GCM), CORS configuration, input validation.
- **Tích hợp AI hiệu quả**: Sử dụng Google Gemini để gợi ý lịch trình, import lịch từ ảnh, gợi ý tags, chat tư vấn.
- **UX thân thiện**: Guest mode cho phép xem trước ứng dụng, modal đóng bằng X/overlay/ESC, tuỳ chỉnh màu accent, thiết kế responsive.
- **Giao diện hiện đại**: Thiết kế theo phong cách Apple Design, sử dụng Tailwind CSS, hỗ trợ dark mode.

### Điểm hạn chế

- Frontend sử dụng Vanilla JavaScript (không framework) nên một số module phức tạp vẫn còn dài.
- Chưa có tính năng PWA (Progressive Web App) cho mobile.
- Chưa tối ưu hoá SEO.
- Unit test coverage chưa bao phủ toàn bộ routes.
- Chưa có tính năng xuất báo cáo (PDF/Excel).

### Hướng phát triển

- Chuyển đổi frontend sang React/Next.js để tối ưu performance và maintainability.
- Phát triển ứng dụng mobile (React Native) hoặc PWA.
- Thêm tính năng xuất báo cáo lương, thống kê.
- Tích hợp thêm các dịch vụ: Slack, Discord, Microsoft Teams.
- Cải thiện AI: học từ hành vi người dùng để gợi ý chính xác hơn.
- Deploy production với CI/CD pipeline (GitHub Actions + Vercel).
- Thêm tính năng offline-first với Service Worker.

---

## TÀI LIỆU THAM KHẢO

### Tài liệu Internet

[1] Node.js Official Documentation — https://nodejs.org/en/docs/

[2] Express.js Documentation — https://expressjs.com/

[3] Supabase Documentation — https://supabase.com/docs

[4] FullCalendar v6 Documentation — https://fullcalendar.io/docs

[5] Tailwind CSS Documentation — https://tailwindcss.com/docs

[6] Google Gemini AI API Documentation — https://ai.google.dev/docs

[7] Telegram Bot API Documentation — https://core.telegram.org/bots/api

[8] Google Calendar API Documentation — https://developers.google.com/calendar/api

[9] JSON Web Token (JWT) Introduction — https://jwt.io/introduction

[10] bcrypt.js — Password Hashing — https://github.com/dcodeIO/bcrypt.js

[11] PostgreSQL Official Documentation — https://www.postgresql.org/docs/

[12] MDN Web Docs — JavaScript — https://developer.mozilla.org/en-US/docs/Web/JavaScript

[13] OWASP Top 10 Web Application Security Risks — https://owasp.org/www-project-top-ten/

[14] RESTful API Design Best Practices — https://restfulapi.net/

[15] Google OAuth 2.0 for Web Server Applications — https://developers.google.com/identity/protocols/oauth2/web-server
