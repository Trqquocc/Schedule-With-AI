# 🧪 Test Cases cho AI Recurring Schedule

## Test Setup

- **Backend:** http://localhost:3001
- **Endpoint:** POST `/api/ai/suggest-schedule`
- **Auth:** Cần có token từ login

---

## 📋 Test Case 1: Hoạt Động Hàng Ngày

### Request Body

```json
{
  "tasks": [1],
  "startDate": "2025-12-15",
  "endDate": "2025-12-21",
  "options": {
    "considerPriority": true,
    "avoidConflict": false,
    "balanceWorkload": false
  },
  "additionalInstructions": "tập gym 6h sáng mỗi ngày"
}
```

### Expected Result

- ✓ 7 events (một cho mỗi ngày)
- ✓ Mỗi event lúc 06:00
- ✓ Thời lượng: 30-60 phút (tùy công việc)
- ✓ Reason: "Lặp lại hàng ngày vào lúc 06:00"

### Console Output

```
📋 Analyzed recurring patterns: [{
  frequency: "daily",
  times: [{startHour: 6, startMin: 0, endHour: null, endMin: 0}],
  days: [1,2,3,4,5,6,7],
  ...
}]

✅ Added recurring event: Tập Gym on day 1 at 6:0
✅ Added recurring event: Tập Gym on day 2 at 6:0
... (7 total)

Đã tạo 7 khung giờ (bao gồm 7 events lặp lại)
```

---

## 📋 Test Case 2: Lịch Hàng Tuần (3 Ngày)

### Request Body

```json
{
  "tasks": [2],
  "startDate": "2025-12-15",
  "endDate": "2025-12-28",
  "options": {
    "considerPriority": true,
    "avoidConflict": false,
    "balanceWorkload": false
  },
  "additionalInstructions": "tiếng anh 7h-9h sáng T2, T4, T6 hàng tuần"
}
```

### Expected Result

- ✓ 6 events (T2, T4, T6 × 2 tuần)
- ✓ Mỗi event từ 07:00 đến 09:00
- ✓ Thời lượng: 120 phút (2 tiếng)
- ✓ Reason: "Lặp lại hàng tuần vào lúc 07:00"

### Console Output

```
📋 Analyzed recurring patterns: [{
  frequency: "weekly",
  times: [{startHour: 7, startMin: 0, endHour: 9, endMin: 0}],
  days: [2,4,6],  // T2, T4, T6
  ...
}]

✅ Added recurring event: Tiếng Anh on day 2 at 7:0
✅ Added recurring event: Tiếng Anh on day 4 at 7:0
✅ Added recurring event: Tiếng Anh on day 6 at 7:0
... (2 tuần, 6 total)

Đã tạo 6 khung giờ (bao gồm 6 events lặp lại)
```

---

## 📋 Test Case 3: Thời Gian Chiều (Afternoon)

### Request Body

```json
{
  "tasks": [3],
  "startDate": "2025-12-15",
  "endDate": "2025-12-21",
  "options": {
    "considerPriority": true,
    "avoidConflict": false,
    "balanceWorkload": false
  },
  "additionalInstructions": "họp hành 14:30 mỗi T3"
}
```

### Expected Result

- ✓ 2 events (T3 của 2 tuần)
- ✓ Mỗi event lúc 14:30
- ✓ Reason: "Lặp lại hàng tuần vào lúc 14:30"

---

## 📋 Test Case 4: Thời Gian Tối (Evening)

### Request Body

```json
{
  "tasks": [4],
  "startDate": "2025-12-15",
  "endDate": "2025-12-21",
  "options": {
    "considerPriority": true,
    "avoidConflict": false,
    "balanceWorkload": false
  },
  "additionalInstructions": "học tiếng 6h-9h tối T2 và T7 hàng tuần"
}
```

### Expected Result

- ✓ 2 events (T2 và T7, chỉ 1 tuần trong range 15-21)
- ✓ T2: 18:00-21:00
- ✓ T7: 18:00-21:00
- ✓ Thời lượng: 180 phút (3 tiếng)

---

## 📋 Test Case 5: Không Có Pattern Rõ Ràng (Fallback)

### Request Body

```json
{
  "tasks": [1, 2],
  "startDate": "2025-12-15",
  "endDate": "2025-12-21",
  "options": {
    "considerPriority": true,
    "avoidConflict": false,
    "balanceWorkload": false
  },
  "additionalInstructions": "làm việc thông thường"
}
```

### Expected Result

- ✓ Sử dụng chế độ simulation
- ✓ Phân bố các công việc dựa trên priority
- ✓ Không có pattern lặp lại

---

## 📋 Test Case 6: Nhiều Yêu Cầu Lặp Lại

### Request Body

```json
{
  "tasks": [1, 2, 3],
  "startDate": "2025-12-15",
  "endDate": "2025-12-28",
  "options": {
    "considerPriority": true,
    "avoidConflict": true,
    "balanceWorkload": true
  },
  "additionalInstructions": "tập gym 6h mỗi ngày; học tiếng T2,T4,T6 19h-21h hàng tuần; họp T3 14:30"
}
```

### Expected Result

- ✓ 7 tập gym (mỗi ngày)
- ✓ 6 học tiếng (T2, T4, T6 × 2 tuần)
- ✓ 2 họp hành (T3 × 2 tuần)
- ✓ Tổng: 15 events
- ✓ Kiểm tra không có trùng lịch (avoidConflict=true)

---

## 🔍 Các Yêu Cầu Không Nên Nhận Diện (Negative Tests)

### Test A: Mô Tả Mơ Hồ

```json
{
  "additionalInstructions": "lịch học sáng"
}
```

- ❌ Không có ngày cụ thể
- ❌ Không có giờ cụ thể
- → Fallback to simulation

### Test B: Định Dạng Lạ

```json
{
  "additionalInstructions": "công việc x từ thứ 2 tới thứ 5"
}
```

- ❌ Không rõ "tới" là inclusive hay exclusive
- ❌ Không có giờ cụ thể
- → Fallback to simulation

### Test C: Khoảng Giờ Mơ Hồ

```json
{
  "additionalInstructions": "họp chiều mỗi T3"
}
```

- ❌ "Chiều" không cụ thể (12:00? 14:00? 16:00?)
- ❌ Có thể sử dụng "suitableTime" từ công việc
- → Sử dụng giờ mặc định + pattern

---

## 🧬 Cấu Trúc JSON Response

### Success Response (Recurring)

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
        "color": "#FF5733"
      },
      {
        "taskId": 1,
        "scheduledTime": "2025-12-16T06:00:00",
        "durationMinutes": 60,
        "reason": "Lặp lại hàng ngày vào lúc 06:00",
        "color": "#FF5733"
      }
      // ... 5 more for each day
    ],
    "summary": "Đã tạo 7 khung giờ (bao gồm 7 events lặp lại) từ các yêu cầu cụ thể trong 7 ngày. Tổng thời lượng: 7 giờ.",
    "statistics": {
      "totalTasks": 7,
      "totalHours": 7,
      "daysUsed": 7,
      "recurringEvents": 7
    },
    "mode": "simulation"
  },
  "message": "Đã tạo lịch trình (chế độ mô phỏng)"
}
```

---

## ✅ Checklist Kiểm Tra

- [ ] Recurring events được tạo với số lượng chính xác
- [ ] Thời gian bắt đầu chính xác (06:00, 18:00, v.v.)
- [ ] Duration tính toán đúng (nếu có endTime)
- [ ] Ngày trong tuần được nhận diện đúng (T2=2, T3=3, ...)
- [ ] Pattern frequency là "daily" hoặc "weekly"
- [ ] Console logs hiển thị đầy đủ (pattern analysis, events added)
- [ ] Summary text có chứa số recurring events
- [ ] Statistics.recurringEvents chính xác

---

## 🚀 Hướng Dẫn Chạy Test

### 1. Sử dụng Postman/Insomnia

```
1. POST http://localhost:3001/api/ai/suggest-schedule
2. Headers: { "Authorization": "Bearer <token>" }
3. Body: Copy JSON từ test case
4. Click Send
5. Kiểm tra response
```

### 2. Sử dụng cURL

```bash
curl -X POST http://localhost:3001/api/ai/suggest-schedule \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...test case json...}'
```

### 3. Sử dụng Frontend UI

```
1. Login vào app
2. Chọn công việc để lập lịch
3. Nhập yêu cầu trong "Hướng dẫn thêm"
4. Click "Tạo lịch trình"
5. Xem preview
6. Kiểm tra console logs (F12)
```

---

## 📊 Metrics Cần Kiểm Tra

| Metric          | Test Case 1 | Test Case 2 | Test Case 3 |
| --------------- | ----------- | ----------- | ----------- |
| Số events       | 7           | 6           | 2           |
| Start time      | 06:00       | 07:00       | 14:30       |
| Duration        | 60 min      | 120 min     | 45 min      |
| Days            | [1-7]       | [2,4,6]     | [3]         |
| Frequency       | daily       | weekly      | weekly      |
| Recurring count | 7           | 6           | 2           |
