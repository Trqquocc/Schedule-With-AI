# 📋 PhienAIDeXuat - Tổng Hợp

## 📁 Files Liên Quan

Mình đã tạo **4 files** để giải thích & tích hợp PhienAIDeXuat:

```
📦 Schedule-With-AI/
├── 📄 PhienAIDeXuat_QUICK_START.md         ← ⭐ ĐỌC ĐÂY TRƯỚC (2 phút)
├── 📄 PhienAIDeXuat_CREATE_TABLE.sql       ← SQL script tạo table
├── 📄 PhienAIDeXuat_API_DOCS.md            ← API documentation (chi tiết)
├── 📄 PhienAIDeXuat_INTEGRATION.md         ← Hướng dẫn chi tiết
└── 📄 README.md                            ← File này
```

---

## 🎯 PhienAIDeXuat Là Gì? (30 giây)

**Bảng trong database dùng để lưu lịch sử tất cả các lần AI đề xuất lịch trình**

```
Timeline:
1. User yêu cầu AI: "Hôm nay 8h-12h làm report, 13h-15h họp"
2. System lưu request vào PhienAIDeXuat
3. User click "Áp dụng"
4. System cập nhật: DaApDung = 1, ThoiGianApDung = NOW()
5. Admin có thể xem: AI được dùng bao nhiêu lần? % apply rate?
```

---

## 🚀 Setup (5 Phút)

### 1. Tạo Table

```sql
-- Mở SQL Server Management Studio
-- Chạy file: PhienAIDeXuat_CREATE_TABLE.sql
-- Xác nhận: "✅ Bảng PhienAIDeXuat đã được tạo thành công!"
```

### 2. Backend

```
✅ KHÔNG CẦN CODE GÌ THÊM
✅ Backend đã sẵn 3 APIs:
   - GET  /api/ai/history       (lấy lịch sử)
   - PUT  /api/ai/history/:id   (cập nhật status)
   - GET  /api/ai/stats         (lấy thống kê)

✅ Tự động tracking:
   - INSERT vào PhienAIDeXuat khi user save AI
   - UPDATE DaApDung = 1 khi apply
```

### 3. Test

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/ai/stats
```

---

## 📊 Schema

**PhienAIDeXuat Table:**

| Field            | Kiểu          | Ý Nghĩa                  |
| ---------------- | ------------- | ------------------------ |
| `MaPhienDeXuat`  | INT (PK)      | ID proposal              |
| `UserID`         | INT (FK)      | User nào yêu cầu         |
| `NgayDeXuat`     | DATETIME2     | Khi AI được yêu cầu      |
| `NoiDungYeuCau`  | NVARCHAR(MAX) | Nội dung request         |
| `DaApDung`       | BIT           | 1 = applied, 0 = pending |
| `ThoiGianApDung` | DATETIME2     | Khi user apply           |
| `GhiChu`         | NVARCHAR(MAX) | Ghi chú thêm             |

**Indexes** (4 cái):

- `IX_PhienAIDeXuat_UserID` → Tìm proposals của user
- `IX_PhienAIDeXuat_NgayDeXuat` → Sắp xếp theo thời gian
- `IX_PhienAIDeXuat_DaApDung` → Filter applied/pending
- `IX_PhienAIDeXuat_UserID_DaApDung` → Combo search

---

## 🔄 Data Flow

### Khi User Request AI

```
User input: "Hôm nay 8h-12h làm report, 13h-15h họp"
                    ↓
Frontend: POST /api/ai/suggest-schedule
                    ↓
Backend: Tính toán suggestions
                    ↓
Frontend: Hiển thị preview
                    ↓
User click "Áp dụng"
                    ↓
Frontend: POST /api/ai/save-ai-suggestions
                    ↓
Backend:
  1. DELETE FROM LichTrinh WHERE AI_DeXuat = 1
  2. INSERT INTO LichTrinh (events mới)
  3. INSERT INTO PhienAIDeXuat:
     - UserID = 5
     - NgayDeXuat = NOW()
     - NoiDungYeuCau = "Hôm nay 8h-12h..."
     - DaApDung = 1 ← Đã set = 1 ngay
     - ThoiGianApDung = NOW()
                    ↓
Calendar được refresh → Hiển thị events mới
```

---

## 📈 3 APIs Mới

### 1. GET /api/ai/history

**Lấy lịch sử AI proposals**

```javascript
fetch("/api/ai/history?limit=10&offset=0", {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((r) => r.json())
  .then((data) => {
    // data.data = [proposal1, proposal2, ...]
    // data.stats = { totalProposals, appliedCount, appliedPercentage }
  });
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "MaPhienDeXuat": 1,
      "UserID": 5,
      "NgayDeXuat": "2025-12-12T14:30:00Z",
      "NoiDungYeuCau": "Hôm nay 8h-12h làm report",
      "DaApDung": 1,
      "ThoiGianApDung": "2025-12-12T14:35:00Z"
    }
  ],
  "stats": {
    "total": 15,
    "appliedCount": 12,
    "appliedPercentage": 80
  }
}
```

### 2. GET /api/ai/stats

**Lấy thống kê AI usage**

```javascript
fetch("/api/ai/stats", {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((r) => r.json())
  .then((data) => {
    // data.data = { totalRequests, appliedPercentage, ... }
  });
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalRequests": 15,
    "appliedRequests": 12,
    "appliedPercentage": 80,
    "lastUsed": "2025-12-12T14:35:00Z"
  }
}
```

### 3. PUT /api/ai/history/:id

**Cập nhật trạng thái proposal**

```javascript
fetch("/api/ai/history/5", {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ DaApDung: 1 }),
});
```

---

## 💡 Ý Tưởng Sử Dụng

### 1. Dashboard AI Stats

```html
<div class="ai-dashboard">
  <div class="stat">📊 AI Requests: <span id="total">15</span></div>
  <div class="stat">✅ Applied: <span id="applied">80%</span></div>
  <div class="stat">⏳ Pending: <span id="pending">3</span></div>
</div>
```

### 2. AI History Timeline

```html
<div class="ai-history">
  <!-- Mỗi proposal là 1 item -->
  <div class="proposal">
    <p>"Hôm nay 8h-12h làm report..."</p>
    <small>Dec 12, 14:30</small>
    <span>✅ Applied 14:35</span>
  </div>
</div>
```

### 3. AI Effectiveness Chart

```
Pie Chart: Applied vs Pending
Line Chart: AI requests theo thời gian
Bar Chart: Top request keywords
```

---

## 🧪 Test Ngay

### Postman

```
1. GET /api/ai/stats
   Header: Authorization: Bearer <YOUR_TOKEN>

2. GET /api/ai/history?limit=5
   Header: Authorization: Bearer <YOUR_TOKEN>

3. PUT /api/ai/history/1
   Header: Authorization: Bearer <YOUR_TOKEN>
   Body: {"DaApDung": 1}
```

### Curl

```bash
TOKEN="your_token_here"

# Test stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/ai/stats

# Test history
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/ai/history?limit=5
```

---

## 📝 SQL Queries Hữu Ích

### Xem tất cả proposals của user

```sql
SELECT * FROM PhienAIDeXuat
WHERE UserID = 5
ORDER BY NgayDeXuat DESC;
```

### Thống kê AI effectiveness (%)

```sql
SELECT
  UserID,
  COUNT(*) as total_requests,
  SUM(CASE WHEN DaApDung = 1 THEN 1 ELSE 0 END) as applied_count,
  ROUND(100.0 * SUM(CASE WHEN DaApDung = 1 THEN 1 ELSE 0 END) /
        COUNT(*), 2) as applied_percentage
FROM PhienAIDeXuat
GROUP BY UserID
ORDER BY applied_percentage DESC;
```

### Proposals trong 7 ngày gần nhất

```sql
SELECT * FROM PhienAIDeXuat
WHERE NgayDeXuat >= DATEADD(day, -7, GETDATE())
  AND DaApDung = 1
ORDER BY NgayDeXuat DESC;
```

### Xóa proposals cũ (nếu cần)

```sql
DELETE FROM PhienAIDeXuat
WHERE NgayDeXuat < DATEADD(month, -3, GETDATE());
```

---

## ✅ Checklist

- [ ] Đọc `PhienAIDeXuat_QUICK_START.md`
- [ ] Chạy SQL script `PhienAIDeXuat_CREATE_TABLE.sql`
- [ ] Verify table tạo thành công: `SELECT * FROM PhienAIDeXuat`
- [ ] Test 3 APIs bằng Postman/curl
- [ ] (Tùy chọn) Thêm dashboard UI
- [ ] (Tùy chọn) Thêm history timeline
- [ ] Deploy lên production

---

## 📚 File References

| File                             | Mục Đích                       |
| -------------------------------- | ------------------------------ |
| `PhienAIDeXuat_QUICK_START.md`   | ⭐ Hướng dẫn nhanh (2-5 phút)  |
| `PhienAIDeXuat_CREATE_TABLE.sql` | SQL script tạo table & indexes |
| `PhienAIDeXuat_API_DOCS.md`      | API documentation (chi tiết)   |
| `PhienAIDeXuat_INTEGRATION.md`   | Hướng dẫn tích hợp (chi tiết)  |
| `backend/routes/ai.js`           | 3 APIs đã implement            |

---

## 🎉 Summary

✅ **Đã tích hợp PhienAIDeXuat hoàn chỉnh:**

- Table được tạo ✅
- 3 APIs sẵn sàng ✅
- Tự động tracking khi user use AI ✅
- Documentation đầy đủ ✅

**Chỉ cần chạy SQL script là xong!** 🚀

Hỏi gì thêm, cứ comment! 😊
