# 🚀 Quick Start: AI Lịch Lặp Lại

## ⚡ 30 Giây Để Hiểu

**Trước:** Tạo 1 event lúc một lần  
**Sau:** Tạo 7+ events theo pattern (hàng ngày, hàng tuần)

---

## 🎯 Ví Dụ Nhanh

### Ví Dụ 1: Hàng Ngày

```
Yêu cầu: "tập gym 6h sáng mỗi ngày"
         ↓
Kết quả: 7 events, mỗi ngày 06:00
```

### Ví Dụ 2: Hàng Tuần

```
Yêu cầu: "lịch dạy T2, T4, T6 từ 6h-9h tối hàng tuần"
         ↓
Kết quả: 6 events (3 events × 2 tuần), từ 18:00-21:00
```

### Ví Dụ 3: Ngày Cụ Thể

```
Yêu cầu: "họp hành 14:30 mỗi T3"
         ↓
Kết quả: 2 events (1 mỗi tuần), lúc 14:30
```

---

## ✍️ Cách Nhập Yêu Cầu

### ✅ CÓ THỂ

| Yêu Cầu                              | Kết Quả               |
| ------------------------------------ | --------------------- |
| `"tập gym 6h sáng mỗi ngày"`         | 7 events, mỗi ngày    |
| `"tiếng anh 7h-9h sáng T2, T4, T6"`  | 6 events, 3 ngày/tuần |
| `"họp 14:30 mỗi T3"`                 | 2 events (tuần 1 & 2) |
| `"lớp 19h-21h T2, T4, T6 hàng tuần"` | 6 events, 3 ngày/tuần |

### ❌ KHÔNG NÊN

| Yêu Cầu                  | Lý Do                         |
| ------------------------ | ----------------------------- |
| `"lịch học"`             | Không rõ ngày/giờ             |
| `"công việc sáng"`       | "Sáng" không cụ thể (6h? 9h?) |
| `"họp T3"`               | Không có giờ                  |
| `"lớp chiều ngày thứ 2"` | Quá mơ hồ                     |

---

## 📝 Hướng Dẫn Chi Tiết

### 📍 Bước 1: Chọn Công Việc

```
Vào trang "Lập Lịch AI"
→ Chọn 1 hoặc nhiều công việc
→ Click "Tiếp tục"
```

### 📍 Bước 2: Chọn Khoảng Thời Gian

```
Chọn ngày bắt đầu & kết thúc
(tối thiểu 7 ngày để thấy pattern)
```

### 📍 Bước 3: Nhập Yêu Cầu (quan trọng!)

```
Hộp "Hướng dẫn thêm" nhập:

✅ "tập gym 6h sáng mỗi ngày"

hoặc

✅ "tiếng anh 7h-9h T2, T4, T6 hàng tuần"

hoặc

✅ "họp 14:30 mỗi T3"
```

### 📍 Bước 4: Xem Preview

```
AI hiển thị danh sách events
→ Kiểm tra số lượng & thời gian
→ Nếu OK → Click "Áp dụng"
```

---

## ⏰ Định Dạng Thời Gian

| Bạn Nhập      | Hệ Thống Hiểu    |
| ------------- | ---------------- |
| `6h`          | 06:00 sáng       |
| `6:30`        | 06:30 sáng       |
| `18h`         | 18:00 (6h chiều) |
| `6h sáng`     | 06:00            |
| `6h tối`      | 18:00            |
| `6h-9h`       | 06:00 đến 09:00  |
| `18:30-21:00` | 18:30 đến 21:00  |

---

## 📅 Ngày Trong Tuần

| Viết | Ý Nghĩa            |
| ---- | ------------------ |
| `T2` | Thứ Hai (Monday)   |
| `T3` | Thứ Ba (Tuesday)   |
| `T4` | Thứ Tư (Wednesday) |
| `T5` | Thứ Năm (Thursday) |
| `T6` | Thứ Sáu (Friday)   |
| `T7` | Thứ Bảy (Saturday) |
| `CN` | Chủ Nhật (Sunday)  |

### Ví Dụ

```
"T2, T4, T6" → Thứ 2, 4, 6 mỗi tuần
"T2, T7"     → Thứ 2 và Chủ Nhật
"mỗi ngày"   → Tất cả 7 ngày trong tuần
```

---

## 🎪 Test Nhanh (Thử Ngay)

### Test 1: Hoạt Động Hàng Ngày

```
1. Chọn công việc: "Tập Gym"
2. Khoảng: 7 ngày bất kỳ
3. Yêu cầu: "tập gym 6h sáng mỗi ngày"
4. Preview: Nên thấy 7 events, mỗi lúc 06:00
```

### Test 2: Lịch Hàng Tuần

```
1. Chọn công việc: "Học Tiếng Anh"
2. Khoảng: 14 ngày (2 tuần)
3. Yêu cầu: "tiếng anh 7h-9h sáng T2, T4, T6 hàng tuần"
4. Preview: Nên thấy 6 events (3 × 2 tuần)
```

### Test 3: Ngày Cụ Thể

```
1. Chọn công việc: "Họp Hành"
2. Khoảng: 14 ngày
3. Yêu cầu: "họp 14:30 mỗi T3"
4. Preview: Nên thấy 2 events (T3 × 2 lần)
```

---

## 🔍 Kiểm Tra Kết Quả

### Cách 1: Xem Preview

```
Trước khi "Áp dụng", xem danh sách events:
- Đếm số lượng
- Kiểm tra thời gian
- Kiểm tra ngày
```

### Cách 2: Xem Console (F12)

```
F12 → Console tab → Tìm:

"📋 Analyzed recurring patterns:"
  ✓ Pattern phát hiện được

"✓ Added recurring event:"
  ✓ Events được tạo

"✅ Tạo X khung giờ"
  ✓ Tổng kết quả
```

### Cách 3: Kiểm Tra Lịch

```
Áp dụng → Vào trang Calendar
Xem các events được thêm vào
Kiểm tra thời gian & số lượng
```

---

## 💡 Mẹo Hay

### Mẹo 1: Nếu AI Không Hiểu

```
Thay vì: "lịch học sáng"
Viết:    "tiếng anh 7h sáng T2, T4, T6"
```

### Mẹo 2: Điều Chỉnh & Thử Lại

```
1. Lần 1: Nhập yêu cầu
2. Nếu sai → Edit yêu cầu rõ ràng hơn
3. Lần 2: Thử lại
4. Nếu OK → Áp dụng
```

### Mẹo 3: Tạo Nhiều Lịch Khác Nhau

```
Nếu muốn: Gym hàng ngày + Học hàng tuần

Cách 1: Tạo 2 lần riêng biệt
  Lần 1: Chọn "Tập Gym" → "6h mỗi ngày"
  Lần 2: Chọn "Học" → "7h-9h T2,T4,T6"

Cách 2: Tạo 1 lần với multiple instructions (nếu hỗ trợ)
  Chọn cả 2 → "gym 6h mỗi ngày; học 7h T2,T4,T6"
```

### Mẹo 4: Kiểm Tra Trùng Lịch

```
Nếu công việc trùng với lịch hiện tại:
1. Bật "Tránh trùng lịch" trong cấu hình
2. AI sẽ tự điều chỉnh thời gian
```

---

## ⚠️ Ghi Chú Quan Trọng

### Lưu Ý 1: Thời Gian 24h

```
Nếu muốn 6h tối (18:00):
  Viết: "6h tối" hoặc "18h"

Không viết: "6h chiều" (mơ hồ)
```

### Lưu Ý 2: Khoảng Ngày

```
Nếu muốn tạo lặp lại:
  Chọn khoảng thời gian dài hơn (min 7 ngày)

Nếu chỉ chọn 1 ngày:
  Sẽ chỉ tạo 1 event, không lặp lại
```

### Lưu Ý 3: Số Lượng Events

```
Hàng ngày × 7 ngày = 7 events
Hàng tuần × 2 tuần = 6 events (nếu 3 ngày/tuần)

Sẽ tạo rất nhiều events nếu pattern phức tạp
Hãy kiểm tra preview trước áp dụng!
```

---

## 🆘 Khắc Phục Sự Cố

### Sự Cố: Không Thấy Gì Trong Preview

**Giải Pháp:**

```
1. Kiểm tra yêu cầu có rõ ràng không
2. Đảm bảo có từ "mỗi ngày" hoặc "hàng tuần"
3. Đảm bảo có thời gian cụ thể (6h, 14:30, ...)
4. Thử viết lại rõ hơn
```

### Sự Cố: Số Events Sai

**Giải Pháp:**

```
1. Đếm: Bao nhiêu ngày × bao nhiêu lần lặp
2. Ví dụ: T2, T4, T6 trong 14 ngày = 6 events (3 × 2 tuần)
3. Nếu vẫn sai, kiểm tra yêu cầu
```

### Sự Cố: Thời Gian Sai

**Giải Pháp:**

```
1. Dùng định dạng 24h: "18h" thay vì "6h chiều"
2. Rõ ràng: "6h sáng" hoặc "6h tối"
3. Kiểm tra conversion:
   - "6h sáng" → 06:00 ✓
   - "6h tối" → 18:00 ✓
```

---

## 📞 Cần Giúp?

1. **Kiểm tra Console:** F12 → Console tab
2. **Đọc guide đầy đủ:** Xem file `AI_RECURRING_SCHEDULE_GUIDE.md`
3. **Xem test cases:** Xem file `AI_RECURRING_TEST_CASES.md`
4. **Liên hệ:** [Support info here]

---

## ✅ Tóm Tắt

| Bước | Hành Động             |
| ---- | --------------------- |
| 1    | Chọn công việc        |
| 2    | Chọn khoảng thời gian |
| 3    | Nhập yêu cầu rõ ràng  |
| 4    | Xem preview           |
| 5    | Kiểm tra & áp dụng    |

**Xong!** Events đã được thêm vào lịch 🎉
