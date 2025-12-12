# 📋 PhienAIDeXuat - API Documentation

## Mục Đích Bảng PhienAIDeXuat

**PhienAIDeXuat** (AI Proposal Sessions) dùng để **tracking lịch sử tất cả các lần AI đề xuất lịch** cho mỗi user.

### Mục tiêu chính:

- 📊 **Thống kê**: Biết AI được dùng bao nhiêu lần
- 🔍 **Lịch sử**: Xem chi tiết từng proposal của user
- 📈 **Phân tích**: Tính tỷ lệ apply (proposals được áp dụng / tổng proposals)
- ⚡ **Performance**: Tracking AI system hiệu quả thế nào

---

## Schema & Fields

```sql
CREATE TABLE PhienAIDeXuat (
    MaPhienDeXuat INT PRIMARY KEY IDENTITY(1,1),    -- ID proposal
    UserID INT NOT NULL,                              -- User nào yêu cầu

    NgayDeXuat DATETIME2 DEFAULT GETDATE(),           -- Khi AI được yêu cầu
    ThoiGianApDung DATETIME2 NULL,                   -- Khi user apply

    NoiDungYeuCau NVARCHAR(MAX),                     -- Nội dung request
    GhiChu NVARCHAR(MAX),                            -- Ghi chú thêm

    DaApDung BIT DEFAULT 0,                          -- 1 = applied, 0 = pending

    FOREIGN KEY (UserID) REFERENCES NguoiDung(MaNguoiDung)
);
```

---

## API Endpoints

### 1. **GET /api/ai/history** - Lấy lịch sử AI proposals

**Mục đích**: Lấy danh sách tất cả proposals của user (với phân trang)

**Query Parameters**:

```
limit: int (default: 20) - Số records trả về
offset: int (default: 0) - Bỏ qua bao nhiêu records
```

**Request**:

```javascript
GET /api/ai/history?limit=20&offset=0
Headers: Authorization: Bearer <token>
```

**Response (200)**:

```json
{
  "success": true,
  "data": [
    {
      "MaPhienDeXuat": 1,
      "UserID": 5,
      "NgayDeXuat": "2025-12-12T14:30:00Z",
      "NoiDungYeuCau": "Hôm nay 8h-12h làm report, 13h-15h họp team, còn lại học backend",
      "DaApDung": 1,
      "ThoiGianApDung": "2025-12-12T14:35:00Z",
      "GhiChu": "User applied this proposal"
    },
    {
      "MaPhienDeXuat": 2,
      "UserID": 5,
      "NgayDeXuat": "2025-12-11T10:15:00Z",
      "NoiDungYeuCau": "Ngày mai nộp 3 bài tập",
      "DaApDung": 0,
      "ThoiGianApDung": null,
      "GhiChu": null
    }
  ],
  "stats": {
    "total": 15, // Tổng proposals
    "totalProposals": 15,
    "appliedCount": 12, // Đã apply
    "pendingCount": 3, // Chưa apply
    "appliedPercentage": 80 // Tỷ lệ apply %
  },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 15
  }
}
```

**Ví dụ JavaScript**:

```javascript
const response = await fetch("/api/ai/history?limit=20&offset=0", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
const { data, stats } = await response.json();

console.log(`📊 Tổng proposals: ${stats.totalProposals}`);
console.log(`✅ Đã apply: ${stats.appliedCount} (${stats.appliedPercentage}%)`);
console.log(`⏳ Pending: ${stats.pendingCount}`);
```

---

### 2. **PUT /api/ai/history/:id** - Cập nhật trạng thái apply

**Mục đích**: Đánh dấu proposal đã được apply

**Parameters**:

```
:id - MaPhienDeXuat
```

**Request Body**:

```json
{
  "DaApDung": 1 // 1 = apply, 0 = undo apply
}
```

**Request**:

```javascript
PUT /api/ai/history/5
Headers:
  - Authorization: Bearer <token>
  - Content-Type: application/json
Body: { "DaApDung": 1 }
```

**Response (200)**:

```json
{
  "success": true,
  "message": "Đã cập nhật proposal #5"
}
```

**Ví dụ JavaScript**:

```javascript
const response = await fetch("/api/ai/history/5", {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ DaApDung: 1 }),
});

if (response.ok) {
  console.log("✅ Updated proposal status");
}
```

---

### 3. **GET /api/ai/stats** - Thống kê AI usage

**Mục đích**: Lấy dashboard thống kê AI của user

**Request**:

```javascript
GET /api/ai/stats
Headers: Authorization: Bearer <token>
```

**Response (200)**:

```json
{
  "success": true,
  "data": {
    "totalRequests": 15, // Tổng lần request AI
    "appliedRequests": 12, // Đã áp dụng
    "pendingRequests": 3, // Chưa áp dụng
    "appliedPercentage": 80, // Tỷ lệ %
    "lastUsed": "2025-12-12T14:35:00Z" // Lần dùng gần nhất
  }
}
```

**Ví dụ JavaScript**:

```javascript
const response = await fetch("/api/ai/stats", {
  headers: { Authorization: `Bearer ${token}` },
});

const { data } = await response.json();

if (data.totalRequests > 0) {
  console.log(`📊 Dashboard AI:`);
  console.log(`   📈 Total requests: ${data.totalRequests}`);
  console.log(`   ✅ Applied: ${data.appliedPercentage}%`);
  console.log(`   ⏳ Pending: ${data.pendingRequests}`);
  console.log(`   🕐 Last used: ${new Date(data.lastUsed).toLocaleString()}`);
}
```

---

## Tích Hợp Trong Dự Án

### 1️⃣ **Khi User Request AI** (tự động)

```javascript
// ai-suggestion-handler.js dòng 1684
// Backend tự động INSERT vào PhienAIDeXuat khi save suggestions
POST / api / ai / save - ai - suggestions;
// ↓
// Backend INSERT INTO PhienAIDeXuat (UserID, NgayDeXuat, NoiDungYeuCau, DaApDung)
```

### 2️⃣ **Khi User Apply AI** (tự động)

```javascript
// ai.js dòng 666 - Tự động cập nhật DaApDung = 1, ThoiGianApDung = NOW()
PUT /api/ai/history/:id
Body: { "DaApDung": 1 }
```

### 3️⃣ **Xem Lịch Sử** (frontend)

```javascript
// Thêm vào dashboard/settings page
const response = await fetch("/api/ai/history?limit=10");
const { data, stats } = await response.json();

// Hiển thị:
// - 10 proposals gần nhất
// - Thống kê: X proposals, Y% applied
// - Cho phép filter: Applied / Pending / All
```

---

## Hướng Dẫn Setup

### Bước 1: Tạo Table

```powershell
# Mở SQL Server Management Studio
# Chạy file: PhienAIDeXuat_CREATE_TABLE.sql
```

### Bước 2: Deploy APIs

```bash
# Backend đã có 3 endpoints sẵn:
# GET /api/ai/history
# PUT /api/ai/history/:id
# GET /api/ai/stats

# Chỉ cần start server:
cd backend
npm start
```

### Bước 3: Test APIs

```bash
# Test /history
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/ai/history

# Test /stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/ai/stats
```

---

## Ví Dụ Thực Tế

### Scenario: Xây dựng AI Usage Dashboard

```javascript
// dashboard.js - Hiển thị thống kê AI
async function loadAIStats() {
  const response = await fetch("/api/ai/stats", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const { data } = await response.json();

  // Hiển thị metrics
  document.getElementById("totalAIRequests").textContent = data.totalRequests;
  document.getElementById("aiAppliedPercent").textContent =
    data.appliedPercentage + "%";
  document.getElementById("aiLastUsed").textContent = formatDate(data.lastUsed);

  // Vẽ chart (đơn giản)
  const appliedBar = (data.appliedPercentage / 100) * 100;
  document.getElementById("appliedBar").style.width = appliedBar + "%";
}

// dashboard.js - Hiển thị lịch sử proposals
async function loadAIHistory() {
  const response = await fetch("/api/ai/history?limit=5", {
    headers: { Authorization: `Bearer ${token}` },
  });

  const { data, stats } = await response.json();

  const html = data
    .map(
      (proposal) => `
    <div class="proposal-item">
      <div class="proposal-content">
        <p><strong>${proposal.NoiDungYeuCau}</strong></p>
        <small>${formatDate(proposal.NgayDeXuat)}</small>
      </div>
      <div class="proposal-status">
        ${
          proposal.DaApDung
            ? `<span class="badge-success">✅ Applied</span>`
            : `<span class="badge-pending">⏳ Pending</span>`
        }
      </div>
    </div>
  `
    )
    .join("");

  document.getElementById("historyList").innerHTML = html;
}
```

---

## Query Hữu Ích

### Xem proposals của user theo ngày

```sql
SELECT * FROM PhienAIDeXuat
WHERE UserID = 5
  AND NgayDeXuat >= DATEADD(day, -7, GETDATE())
ORDER BY NgayDeXuat DESC;
```

### Thống kê AI effectiveness

```sql
SELECT
  UserID,
  COUNT(*) as total,
  SUM(CASE WHEN DaApDung = 1 THEN 1 ELSE 0 END) as applied,
  ROUND(100.0 * SUM(CASE WHEN DaApDung = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as percentage
FROM PhienAIDeXuat
GROUP BY UserID
ORDER BY percentage DESC;
```

### Xóa proposals cũ (nếu cần)

```sql
DELETE FROM PhienAIDeXuat
WHERE NgayDeXuat < DATEADD(month, -3, GETDATE());
```

---

## Notes

- ✅ PhienAIDeXuat **tự động** được populate khi user save AI suggestions
- ✅ Backend **tự động** cập nhật DaApDung khi apply
- ✅ Có 4 indexes cho query nhanh
- ⚠️ Nếu table chưa tồn tại, APIs sẽ return empty gracefully (không error)
- 💡 Có thể dùng để recommend AI usage patterns cho users
