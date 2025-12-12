# ⚡ PhienAIDeXuat - Quick Start (2 Phút)

## 🎯 PhienAIDeXuat Là Gì?

**Bảng tracking lịch sử AI proposals** - lưu mỗi lần user yêu cầu AI đề xuất lịch

**Ví dụ**:

```
User yêu cầu: "Hôm nay 8h-12h làm report, 13h-15h họp"
            ↓
System lưu vào PhienAIDeXuat:
  - Ngày yêu cầu: 12/12/2025 14:30
  - Nội dung: "Hôm nay 8h-12h làm report, 13h-15h họp"
  - Status: 0 (chưa áp dụng)
            ↓
User click "Áp dụng"
            ↓
System cập nhật:
  - Status: 1 (đã áp dụng)
  - Thời gian áp dụng: 12/12/2025 14:35
```

---

## 🚀 Tích Hợp (3 Bước)

### Bước 1: Tạo Table (2 phút)

```powershell
# 1. Mở SQL Server Management Studio
# 2. Chạy file:
#    d:\Schedule-With-AI\PhienAIDeXuat_CREATE_TABLE.sql
# 3. Xác nhận: "✅ Bảng PhienAIDeXuat đã được tạo thành công!"
```

### Bước 2: Backend Sẵn Sàng (0 bước)

```
✅ Backend đã có 3 APIs:
   GET  /api/ai/history      - Xem lịch sử proposals
   PUT  /api/ai/history/:id  - Cập nhật status
   GET  /api/ai/stats        - Xem thống kê AI

✅ Tự động tracking:
   - INSERT vào PhienAIDeXuat khi save AI suggestions
   - UPDATE DaApDung = 1 khi apply
```

### Bước 3: Test (1 phút)

```bash
# Mở Postman hoặc curl:

# Test 1: Xem stats
GET http://localhost:5000/api/ai/stats
Header: Authorization: Bearer YOUR_TOKEN

# Response:
{
  "success": true,
  "data": {
    "totalRequests": 5,          ← Tổng requests
    "appliedRequests": 4,        ← Đã apply
    "appliedPercentage": 80,     ← Tỉ lệ %
    "lastUsed": "2025-12-12T14:35:00Z"
  }
}

# Test 2: Xem lịch sử
GET http://localhost:5000/api/ai/history?limit=10
Header: Authorization: Bearer YOUR_TOKEN

# Response:
{
  "success": true,
  "data": [
    {
      "MaPhienDeXuat": 1,
      "NoiDungYeuCau": "Hôm nay 8h-12h làm report",
      "NgayDeXuat": "2025-12-12T14:30:00Z",
      "DaApDung": 1,
      "ThoiGianApDung": "2025-12-12T14:35:00Z"
    },
    ...
  ],
  "stats": {
    "total": 5,
    "appliedCount": 4,
    "appliedPercentage": 80
  }
}
```

---

## 📊 Schema

```
PhienAIDeXuat Table:
┌─────────────────┬───────────────────────────────────────────┐
│ Field           │ Mô Tả                                       │
├─────────────────┼───────────────────────────────────────────┤
│ MaPhienDeXuat   │ ID proposal (auto increment)               │
│ UserID          │ User nào yêu cầu                          │
│ NgayDeXuat      │ Khi AI được yêu cầu                       │
│ NoiDungYeuCau   │ "Hôm nay 8h-12h làm report, 13h-15h họp" │
│ DaApDung        │ 1 = applied, 0 = pending                  │
│ ThoiGianApDung  │ Khi user apply                            │
│ GhiChu          │ Ghi chú thêm                              │
└─────────────────┴───────────────────────────────────────────┘
```

---

## 🔄 Tự Động Tracking

### Khi Người Dùng Request AI

```
Frontend: POST /api/ai/save-ai-suggestions
          ↓
Backend:  INSERT INTO PhienAIDeXuat (
            UserID = 5,
            NgayDeXuat = NOW(),
            NoiDungYeuCau = "Hôm nay 8h-12h...",
            DaApDung = 1  ← Được set = 1 ngay lập tức
          )
```

**LƯU Ý**: Backend ở dòng 666 (ai.js) đã set `DaApDung = 1` ngay khi save,
vì user đã click "Áp dụng" rồi → Không cần cập nhật sau

---

## 📈 Dùng Để Làm Gì?

### 1️⃣ Dashboard Stats

```javascript
// Hiển thị trên dashboard:
// "🤖 AI được dùng 15 lần"
// "✅ 80% proposals được áp dụng"
// "⏳ 3 proposals chưa áp dụng"
```

### 2️⃣ History Timeline

```javascript
// Hiển thị lịch sử:
// Dec 12, 14:30 - "Hôm nay 8h-12h làm report..." ✅ Applied
// Dec 11, 10:15 - "Ngày mai nộp 3 bài tập"      ⏳ Pending
// Dec 10, 09:00 - "Học tiếng Anh 2 giờ"         ✅ Applied
```

### 3️⃣ AI Effectiveness Analysis

```sql
-- Admin có thể chạy query này:
SELECT
  UserID,
  COUNT(*) as total_requests,
  SUM(CASE WHEN DaApDung = 1 THEN 1 ELSE 0 END) as applied,
  ROUND(100.0 * SUM(CASE WHEN DaApDung = 1 THEN 1 ELSE 0 END) /
        COUNT(*), 2) as percentage
FROM PhienAIDeXuat
GROUP BY UserID
ORDER BY percentage DESC;

-- Output:
-- UserID | total_requests | applied | percentage
-- 5      | 15             | 12      | 80.00
-- 3      | 8              | 5       | 62.50
```

---

## 💻 JavaScript Examples

### Hiển thị AI Stats

```javascript
// Load stats từ API
async function showAIStats() {
  const response = await fetch("/api/ai/stats", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const { data } = await response.json();

  console.log(`
    📊 AI Statistics:
    Total requests: ${data.totalRequests}
    Applied: ${data.appliedRequests} (${data.appliedPercentage}%)
    Pending: ${data.pendingRequests}
    Last used: ${new Date(data.lastUsed).toLocaleString()}
  `);
}

showAIStats();
```

### Hiển thị Lịch Sử

```javascript
// Load history từ API
async function showAIHistory() {
  const response = await fetch("/api/ai/history?limit=5", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const { data } = await response.json();

  data.forEach((proposal) => {
    console.log(`
      📝 ${proposal.NoiDungYeuCau}
      📅 ${new Date(proposal.NgayDeXuat).toLocaleString()}
      ${proposal.DaApDung ? "✅ Applied" : "⏳ Pending"}
    `);
  });
}

showAIHistory();
```

---

## 🧪 Test với Curl

```bash
# 1. Set token variable
TOKEN="your_jwt_token_here"

# 2. Test stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/ai/stats | jq

# 3. Test history
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/ai/history?limit=5 | jq

# 4. Test update
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"DaApDung": 0}' \
  http://localhost:5000/api/ai/history/1 | jq
```

---

## ✅ Done! 🎉

**Bạn đã tích hợp PhienAIDeXuat:**

- ✅ Table được tạo
- ✅ 3 APIs sẵn sàng
- ✅ Tự động tracking khi user use AI
- ✅ Có thể xem history & stats

**Tiếp theo (tùy chọn):**

- 🎨 Thêm dashboard UI
- 📊 Vẽ chart stats
- 📜 Hiển thị history timeline

---

## 📚 Tài Liệu Đầy Đủ

Xem chi tiết tại:

- `PhienAIDeXuat_API_DOCS.md` - Đầy đủ API documentation
- `PhienAIDeXuat_INTEGRATION.md` - Hướng dẫn chi tiết
