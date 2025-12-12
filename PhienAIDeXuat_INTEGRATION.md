# 🚀 Hướng Dẫn Tích Hợp PhienAIDeXuat

## 📋 Tóm Tắt

**PhienAIDeXuat** là bảng dùng để lưu lịch sử tất cả các lần **AI đề xuất lịch** cho user.

| Tính Năng      | Mô Tả                           |
| -------------- | ------------------------------- |
| 📊 Thống kê    | Biết AI được dùng bao nhiêu lần |
| 🔍 Lịch sử     | Xem chi tiết từng proposal      |
| 📈 Phân tích   | Tính % proposals được áp dụng   |
| ⚡ Performance | Đánh giá hiệu quả AI            |

---

## ✅ Các Bước Setup

### **Bước 1: Tạo Table trong Database**

```powershell
# 1. Mở SQL Server Management Studio
# 2. Chạy file: PhienAIDeXuat_CREATE_TABLE.sql
# 3. Xác nhận tạo thành công ✅
```

Script sẽ tạo:

- ✅ Bảng `PhienAIDeXuat` với 7 fields
- ✅ 4 indexes cho tìm kiếm nhanh
- ✅ Foreign Key tới `NguoiDung`

### **Bước 2: Backend Đã Sẵn Sàng**

✅ **Tất cả API đã được viết rồi** - không cần code gì thêm!

**3 Endpoints mới:**

```
GET  /api/ai/history       → Lấy lịch sử proposals
PUT  /api/ai/history/:id   → Cập nhật trạng thái apply
GET  /api/ai/stats         → Lấy thống kê AI usage
```

**Tự động tracking:**

```
✅ Khi user save AI suggestions → Tự INSERT vào PhienAIDeXuat
✅ Khi user apply → Tự UPDATE DaApDung = 1, ThoiGianApDung = NOW()
```

### **Bước 3: Frontend (Tùy Chọn)**

**Không bắt buộc**, nhưng có thể thêm:\*\*

```javascript
// dashboard.html - Hiển thị AI stats
<div class="ai-stats">
  <p>
    📊 AI Requests: <span id="totalAI">0</span>
  </p>
  <p>
    ✅ Applied: <span id="appliedPercent">0</span>%
  </p>
  <p>
    ⏳ Pending: <span id="pendingCount">0</span>
  </p>
</div>;

// Script để load stats
async function loadAIStats() {
  const response = await fetch("/api/ai/stats", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const { data } = await response.json();

  document.getElementById("totalAI").textContent = data.totalRequests;
  document.getElementById("appliedPercent").textContent =
    data.appliedPercentage;
  document.getElementById("pendingCount").textContent = data.pendingRequests;
}

// Gọi khi trang load
loadAIStats();
```

---

## 📊 Data Model

### PhienAIDeXuat Table

| Field            | Kiểu          | Ý Nghĩa                                               |
| ---------------- | ------------- | ----------------------------------------------------- |
| `MaPhienDeXuat`  | INT (PK)      | ID proposal                                           |
| `UserID`         | INT (FK)      | User nào yêu cầu                                      |
| `NgayDeXuat`     | DATETIME2     | Khi AI được yêu cầu                                   |
| `NoiDungYeuCau`  | NVARCHAR(MAX) | Nội dung request (ví dụ: "hôm nay 8h-12h làm report") |
| `DaApDung`       | BIT           | 1 = áp dụng, 0 = chưa áp dụng                         |
| `ThoiGianApDung` | DATETIME2     | Khi user apply proposal                               |
| `GhiChu`         | NVARCHAR(MAX) | Ghi chú thêm                                          |

### Indexes

```sql
IX_PhienAIDeXuat_UserID              -- Tìm proposals của user
IX_PhienAIDeXuat_NgayDeXuat          -- Sắp xếp theo ngày
IX_PhienAIDeXuat_DaApDung            -- Filter applied/pending
IX_PhienAIDeXuat_UserID_DaApDung     -- Combo: user + status
```

---

## 🔄 Data Flow

### Khi User Request AI

```
1. User nhập: "Hôm nay 8h-12h làm report, 13h-15h họp team"
                            ↓
2. Frontend gửi POST /api/ai/suggest-schedule
                            ↓
3. Backend tính toán & trả suggestions
                            ↓
4. Frontend hiển thị preview modal
```

### Khi User Click "Áp Dụng"

```
1. User click "Áp dụng lịch trình"
                            ↓
2. Frontend POST /api/ai/save-ai-suggestions
                            ↓
3. Backend XÓA AI events cũ (WHERE AI_DeXuat = 1)
                            ↓
4. Backend INSERT events mới (vào LichTrinh table)
                            ↓
5. Backend INSERT vào PhienAIDeXuat → DaApDung = 1 ✅
```

---

## 📈 Các API Calls

### 1. Lấy Lịch Sử Proposals

```javascript
fetch("/api/ai/history?limit=20&offset=0", {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((r) => r.json())
  .then((data) => {
    console.log("📜 Proposals:", data.data);
    console.log("📊 Stats:", data.stats);
    // {
    //   "totalProposals": 15,
    //   "appliedCount": 12,
    //   "appliedPercentage": 80,
    //   "pendingCount": 3
    // }
  });
```

### 2. Lấy Thống Kê AI

```javascript
fetch("/api/ai/stats", {
  headers: { Authorization: `Bearer ${token}` },
})
  .then((r) => r.json())
  .then((data) => {
    console.log("📊 AI Usage:", data.data);
    // {
    //   "totalRequests": 15,
    //   "appliedRequests": 12,
    //   "appliedPercentage": 80,
    //   "lastUsed": "2025-12-12T14:35:00Z"
    // }
  });
```

### 3. Cập Nhật Proposal Status

```javascript
fetch("/api/ai/history/5", {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ DaApDung: 1 }),
})
  .then((r) => r.json())
  .then((data) => console.log("✅ Updated!"));
```

---

## 🧪 Test APIs

### Dùng Postman hoặc curl

```bash
# 1. Lấy lịch sử
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/ai/history

# 2. Lấy stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/ai/stats

# 3. Update proposal
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"DaApDung": 1}' \
  http://localhost:5000/api/ai/history/5
```

---

## 💡 Ý Tưởng Mở Rộng

### Dashboard AI Stats

```html
<div class="ai-dashboard">
  <div class="stat-card">
    <h3>📊 Total Requests</h3>
    <p class="stat-value" id="totalReq">15</p>
  </div>

  <div class="stat-card">
    <h3>✅ Applied %</h3>
    <p class="stat-value" id="appliedPercent">80%</p>
  </div>

  <div class="stat-card">
    <h3>⏳ Pending</h3>
    <p class="stat-value" id="pending">3</p>
  </div>
</div>
```

### History Timeline

```html
<div class="ai-history">
  <!-- Mỗi proposal là 1 item -->
  <div class="proposal-item">
    <div class="proposal-meta">
      <p><strong>Request:</strong> "Hôm nay 8h-12h làm report..."</p>
      <small>Ngày yêu cầu: 12/12/2025 14:30</small>
    </div>
    <div class="proposal-status">
      <span class="badge-applied">✅ Applied 14:35</span>
      <!-- hoặc -->
      <span class="badge-pending">⏳ Pending</span>
    </div>
  </div>
</div>
```

### Chart Hiển Thị

```javascript
// Dùng Chart.js để vẽ:
// - Pie chart: Applied vs Pending
// - Line chart: AI requests theo thời gian
// - Bar chart: Top AI request keywords
```

---

## ⚙️ Troubleshooting

| Vấn Đề            | Giải Pháp                              |
| ----------------- | -------------------------------------- |
| API return empty  | Table chưa tạo → Chạy SQL script       |
| Foreign key error | Sửa tên table NguoiDung trong script   |
| 401 Unauthorized  | Check token expires                    |
| Slow query        | Indexes đã có rồi, kiểm tra số records |

---

## 📝 Checklist

- [ ] Chạy SQL script tạo PhienAIDeXuat table
- [ ] Verify table tạo thành công (SELECT \* FROM PhienAIDeXuat)
- [ ] Test 3 APIs bằng Postman
- [ ] (Optional) Thêm dashboard frontend
- [ ] (Optional) Thêm history timeline UI
- [ ] Deploy lên production

---

## 📚 File Liên Quan

```
📦 Schedule-With-AI/
├── PhienAIDeXuat_CREATE_TABLE.sql      ← SQL script tạo table
├── PhienAIDeXuat_API_DOCS.md           ← API documentation
├── PhienAIDeXuat_INTEGRATION.md        ← File này
├── backend/
│   └── routes/ai.js                    ← 3 endpoints mới
└── frontend/
    └── (tùy chọn thêm dashboard)
```

---

**✅ Đã sẵn sàng để tích hợp!** Chỉ cần chạy SQL script là xong. 🎉
