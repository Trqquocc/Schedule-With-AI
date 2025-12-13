# 🤖 Hướng Dẫn Sử Dụng AI với Lịch Lặp Lại (Recurring Schedule)

## 📋 Tổng Quan

AI bây giờ có thể **tự động phân tích yêu cầu lặp lại** từ bạn và tạo lịch trình phù hợp. Thay vì tạo một event duy nhất, AI sẽ tạo nhiều events cho mỗi ngày/tuần theo yêu cầu.

## 🎯 Các Trường Hợp Sử Dụng

### 1️⃣ Hoạt Động Hàng Ngày (Daily Activities)

**Ví dụ:**

```
"tập gym 6h sáng mỗi ngày"
```

**Kết quả:**

- AI tạo event "Tập Gym" vào 06:00 mỗi ngày từ Thứ Hai đến Chủ Nhật
- Mỗi event có thời lượng theo thông tin từ công việc

**Cách nhập:**

- "công việc X mỗi ngày"
- "công việc X hàng ngày vào HH:mm"
- "công việc X 6h sáng mỗi ngày"

---

### 2️⃣ Lịch Định Kỳ Trong Tuần (Weekly Schedule)

**Ví dụ:**

```
"lịch dạy môn A từ 6h-9h tối T2 và T7 hàng tuần"
```

**Kết quả:**

- AI tạo event "Lịch Dạy Môn A" từ 18:00-21:00 (6h-9h tối)
- Mỗi Thứ Hai và Thứ Bảy trong khoảng ngày đã chọn
- Thời lượng: 3 tiếng (từ 18:00 đến 21:00)

**Cách nhập:**

- "công việc X T2, T4, T6 hàng tuần từ HH:mm-HH:mm"
- "môn học Y từ 6h-9h tối T2 và T7 hàng tuần"
- "công việc Z vào các ngày T3, T5 từ 14:00-16:00"

---

### 3️⃣ Khoảng Ngày Cụ Thể (Specific Days in Week)

**Ví dụ:**

```
"tiếng anh từ 7h-9h sáng T2, T4, T6 hàng tuần"
```

**Kết quả:**

- AI tạo 3 events mỗi tuần (Thứ 2, 4, 6)
- Từ 07:00 đến 09:00 (2 tiếng)

**Hỗ trợ viết tắt:**

- T2, T3, T4, T5, T6, T7, CN (Chủ Nhật)
- Hoặc: Thứ Hai, Thứ Ba, Thứ Tư, ...
- Hoặc: Monday, Tuesday, Wednesday, ...

---

### 4️⃣ Thời Gian Cụ Thể (Specific Times)

**Ví dụ:**

```
"họp hành 10:30 sáng mỗi T3"
```

**Kết quả:**

- AI tạo event "Họp Hành" vào 10:30 mỗi Thứ Ba
- Thời lượng: theo cấu hình của công việc

**Định Dạng Thời Gian Hỗ Trợ:**

- `6h` → 06:00
- `6:30` → 06:30
- `18h` → 18:00
- `6h sáng` → 06:00
- `6h tối` → 18:00
- `6h-9h` → từ 06:00 đến 09:00
- `18:30-21:00` → từ 18:30 đến 21:00

---

## 📝 Hướng Dẫn Nhập Dữ Liệu

### ✅ Cách Nhập Tốt

1. **Rõ ràng về tần suất:**

   ```
   "tập gym 6h sáng mỗi ngày"
   "lịch học T2, T4, T6 hàng tuần"
   ```

2. **Có thời gian cụ thể:**

   ```
   "họp hành 14:30 mỗi T3"
   "yoga 7h-8h sáng mỗi T2 và T5"
   ```

3. **Ghi rõ ngày trong tuần:**
   ```
   "tiếng anh 19h mỗi T3 và T7"
   "công việc X từ 09:00-11:00 T2, T4"
   ```

### ❌ Cách Nhập Không Tốt

```
"lịch học" ← Không rõ ngày/giờ
"công việc X lúc sáng" ← "Sáng" không cụ thể (bao từ 6h đến 11h?)
"họp T3" ← Không có giờ cụ thể
```

---

## 🔧 Cấu Trúc AI Phân Tích

### Quy Trình Phân Tích

```
Yêu cầu của bạn
    ↓
[1] Trích xuất tần suất (daily/weekly)
    ↓
[2] Trích xuất ngày trong tuần (T2, T3, ...)
    ↓
[3] Trích xuất thời gian bắt đầu-kết thúc
    ↓
[4] Tạo events cho từng ngày
    ↓
Kết quả lịch trình
```

### Ví Dụ Chi Tiết

**Input:**

```
Yêu cầu: "lịch dạy môn tiếng anh từ 7h-9h sáng T2, T4, T6 hàng tuần"
```

**Phân Tích:**

```
✓ Tần suất: WEEKLY (hàng tuần)
✓ Ngày: [T2, T4, T6] = [Thứ 2, Thứ 4, Thứ 6]
✓ Thời gian: 07:00 - 09:00 (2 tiếng)
```

**Kết Quả:**

```
Event 1: Lịch Dạy Môn Tiếng Anh | Thứ 2 | 07:00-09:00
Event 2: Lịch Dạy Môn Tiếng Anh | Thứ 4 | 07:00-09:00
Event 3: Lịch Dạy Môn Tiếng Anh | Thứ 6 | 07:00-09:00

(Lặp lại cho mỗi tuần trong khoảng ngày đã chọn)
```

---

## 🎪 Thử Nghiệm

### Test Case 1: Hoạt Động Hàng Ngày

```
Công việc: Tập Gym (60 phút)
Yêu cầu: "tập gym 6h sáng mỗi ngày"
Khoảng: 1 tuần (7 ngày)

Kết quả dự kiến: 7 events, mỗi ngày 06:00
```

### Test Case 2: Lịch Hàng Tuần

```
Công việc: Học Tiếng Anh (120 phút)
Yêu cầu: "tiếng anh 7h-9h sáng T2, T4, T6 hàng tuần"
Khoảng: 2 tuần (14 ngày)

Kết quả dự kiến: 6 events (3 mỗi tuần), 07:00-09:00
```

### Test Case 3: Lịch Khác Nhau

```
Công việc:
  - Tập Gym (30 phút)
  - Họp Hành (45 phút)
  - Học Tiếng (90 phút)

Yêu cầu:
  "tập gym 6h sáng mỗi ngày; họp hành 14:30 mỗi T3; tiếng anh 19h-21h T2,T4,T6"

Kết quả dự kiến:
  - 7 tập gym (mỗi ngày)
  - 2-3 họp hành (mỗi T3)
  - 6 học tiếng (mỗi T2,T4,T6)
```

---

## 📊 Thông Tin Kỹ Thuật

### API Response

Khi AI tạo lịch, response sẽ có thêm thông tin:

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "taskId": 1,
        "scheduledTime": "2025-12-15T06:00:00",
        "durationMinutes": 60,
        "reason": "Lặp lại hàng ngày vào lúc 06:00",
        "color": "#FF5733",
        "isRecurring": true,
        "recurringDays": [1, 2, 3, 4, 5, 6, 7]
      }
    ],
    "summary": "Đã tạo 7 khung giờ (bao gồm 7 events lặp lại)...",
    "statistics": {
      "totalTasks": 7,
      "totalHours": 7,
      "daysUsed": 7,
      "recurringEvents": 7
    },
    "mode": "gemini"
  }
}
```

### Các Loại Thời Gian Hỗ Trợ

| Format        | Giải Thích       | Ví Dụ               |
| ------------- | ---------------- | ------------------- |
| `6h`          | 06:00 sáng       | Tập gym 6h mỗi ngày |
| `6:30`        | 06:30 sáng       | Ăn sáng 6:30        |
| `18h`         | 18:00 (6h chiều) | Họp 18h             |
| `6h sáng`     | 06:00            | Chạy bộ 6h sáng     |
| `6h tối`      | 18:00            | Học 6h tối          |
| `6h-9h`       | 06:00 đến 09:00  | Lớp 6h-9h           |
| `18:30-21:00` | 18:30 đến 21:00  | Dạy 18:30-21:00     |

---

## ⚙️ Cài Đặt & Tối Ưu

### Khi Sử Dụng Gemini AI (Khuyến Nghị)

- AI tự động phân tích yêu cầu
- Hỗ trợ tất cả các định dạng thời gian
- Xử lý ngôn ngữ tự nhiên (natural language)

### Khi Sử Dụng Simulation Mode (Fallback)

- Phân tích cơ bản của yêu cầu
- Tạo events dựa trên pattern nhận diện được
- Nếu không nhận diện được, sẽ phân bố events đều trên các ngày

---

## 🐛 Khắc Phục Sự Cố

### Vấn Đề: AI không nhận diện yêu cầu lặp lại

**Giải Pháp:**

1. Sử dụng những từ rõ ràng: "mỗi ngày", "hàng tuần", "hàng tháng"
2. Ghi rõ ngày: "T2", "T3", "T4", ... thay vì "các ngày làm việc"
3. Thêm thời gian cụ thể: "6h sáng" thay vì chỉ "sáng"

### Vấn Đề: Thời gian không chính xác

**Giải Pháp:**

1. Sử dụng định dạng 24h: "18h" thay vì "6h chiều"
2. Nếu muốn sáng: "6h sáng"
3. Nếu muốn tối: "6h tối" hoặc "18h"

### Vấn Đề: Một số ngày bị bỏ sót

**Giải Pháp:**

1. Ghi rõ từng ngày: "T2, T3, T4" thay vì "T2-T4"
2. Nếu muốn tất cả ngày: "mỗi ngày"
3. Nếu muốn ngày làm việc: "T2, T3, T4, T5, T6"

---

## 💡 Mẹo Sử Dụng

1. **Sử dụng câu ngắn gọn, rõ ràng**

   ```
   ✓ Tốt: "tập gym 6h sáng mỗi ngày"
   ✗ Xấu: "tôi muốn tập gym mỗi sáng lúc khoảng 6h"
   ```

2. **Nếu AI chưa hiểu, hãy chỉnh sửa yêu cầu**

   ```
   Lần 1: "lịch học"
   Lần 2: "tiếng anh 7h-9h sáng T2, T4, T6 hàng tuần"
   ```

3. **Kết hợp nhiều yêu cầu cùng lúc**

   ```
   "tập gym 6h mỗi ngày; họp T3 14h; học tiếng T2,T4,T6 19h"
   ```

4. **Kiểm tra kết quả và điều chỉnh**
   - Xem preview trước khi apply
   - Nếu không hợp lý, edit lại yêu cầu và try again

---

## 📞 Hỗ Trợ

Nếu có vấn đề:

1. Kiểm tra Console (F12) → Xem logs từ server
2. Kiểm tra mô tả công việc có đầy đủ không
3. Thử viết lại yêu cầu rõ ràng hơn
4. Nếu vẫn lỗi, hãy liên hệ support
