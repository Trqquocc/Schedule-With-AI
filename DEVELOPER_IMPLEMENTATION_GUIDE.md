# 💻 AI Recurring Schedule - Developer Implementation Guide

## 🎯 Objective

Optimize AI prompt để hỗ trợ **recurring schedule requests** (hàng ngày, hàng tuần) từ user input.

---

## 🔍 Implementation Details

### 1. Pattern Analysis Engine

**File:** `backend/routes/ai.js` (Lines 45-125)  
**Function:** `analyzeRecurringPatterns(additionalInstructions)`

#### Input

```javascript
"tập gym 6h sáng mỗi ngày";
// hoặc
"tiếng anh 7h-9h sáng T2, T4, T6 hàng tuần";
```

#### Processing

```
1. Regex Pattern Matching:
   - Time: /(\d{1,2})(?::(\d{2}))?\s*(?:h|:00|:30)?/
   - Frequency: /mỗi ngày|hàng ngày|hàng tuần|mỗi tuần/
   - Days: /t2|t3|...|cn|chủ nhật/

2. Time Parsing:
   - 6h → 06:00
   - 6:30 → 06:30
   - 18h → 18:00
   - 6h sáng → 06:00
   - 6h tối → 18:00
   - 6h-9h → startHour: 6, endHour: 9

3. Frequency Detection:
   - "mỗi ngày" → daily
   - "hàng tuần" → weekly
   - If no frequency found → once

4. Days Extraction:
   - Daily → [1,2,3,4,5,6,7]
   - Weekly + days → [2,4,6] (T2, T4, T6)
   - No days specified → fallback to all days
```

#### Output

```javascript
[{
  frequency: "daily" | "weekly" | "once",
  times: [{
    startHour: number,
    startMin: number,
    endHour: number | null,
    endMin: number
  }],
  days: [1-7] // 1=CN, 2=T2, ..., 7=T7
  rawText: string
}]
```

#### Day Mapping

```javascript
1 = Chủ Nhật (CN, Sunday)
2 = Thứ Hai (T2, Monday)
3 = Thứ Ba (T3, Tuesday)
4 = Thứ Tư (T4, Wednesday)
5 = Thứ Năm (T5, Thursday)
6 = Thứ Sáu (T6, Friday)
7 = Thứ Bảy (T7, Saturday)
```

#### Regex Patterns

```javascript
// Frequency Detection
const isDailyPattern = /mỗi ngày|hàng ngày|every day|daily/.test(text);
const isWeeklyPattern = /hàng tuần|mỗi tuần|every week|weekly/.test(text);

// Time Extraction
const timeRegex =
  /(\d{1,2})(?::(\d{2}))?\s*(?:h|:00|:30)?(?:\s*-\s*(\d{1,2})(?::(\d{2}))?)?/g;

// Day Extraction
const dayMap = {
  "t2|thứ 2|thứ hai|monday": 2,
  "t3|thứ 3|thứ ba|tuesday": 3,
  // ... etc
};
```

---

### 2. Enhanced Prompt Builder

**File:** `backend/routes/ai.js` (Lines 257-373)  
**Function:** `buildGeminiPrompt()`

#### New Components

**A. Pattern Display**

```
📅 CÁC YÊU CẦU LẶP LẠI ĐÃ PHÁT HIỆN:
  1. Tần suất: Hàng ngày
     Ngày: CN, T2, T3, T4, T5, T6, T7
     Thời gian: 06:00
```

**B. Special Instructions**

```
👉 NẾU CÓ YÊU CẦU LẶP LẠI:
   - Ví dụ: "tập gym 6h sáng mỗi ngày"
     → TẠO EVENTS: 06:00 mỗi ngày từ T2-CN

   - Ví dụ: "lịch dạy môn A từ 6h-9h tối T2 và T7 hàng tuần"
     → TẠO EVENTS: 18:00-21:00 vào mỗi T2 và T7
```

**C. Time Format Clarification**

```
- Nếu yêu cầu nói "6h sáng" → 06:00
- Nếu yêu cầu nói "6h tối" → 18:00
- Nếu yêu cầu nói "6h-9h" → từ 06:00 đến 09:00
```

#### API Response Schema

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "taskId": number,
        "scheduledTime": "YYYY-MM-DDTHH:mm:ss",
        "durationMinutes": number,
        "reason": "string",
        "color": "hex color",
        "isRecurring": boolean,
        "recurringDays": [1-7] | null
      }
    ],
    "summary": "string",
    "statistics": {
      "totalTasks": number,
      "totalHours": number,
      "daysUsed": number,
      "recurringEvents": number
    },
    "mode": "gemini" | "simulation" | "simulation_fallback"
  }
}
```

---

### 3. Simulation Mode Enhancement

**File:** `backend/routes/ai.js` (Lines 419-540)  
**Function:** `generateSimulatedScheduleWithInstructions()`

#### Process

```
1. Analyze patterns using analyzeRecurringPatterns()

2. If patterns found:
   - For each pattern in recurringPatterns
   - For each day in pattern.days
   - For each time in pattern.times
   - Create event for that day at that time
   - Add to suggestions array

3. If no patterns found:
   - Fallback to original generateSimulatedSchedule()

4. Return with statistics.recurringEvents count
```

#### Logic Flow

```
Input: patterns = [
  {
    frequency: "daily",
    times: [{startHour: 6, endHour: null}],
    days: [1,2,3,4,5,6,7]
  }
]

Process:
  For day 1 to 7:
    For time in times:
      Create event at that day + time

Output: 7 events total
        Set recurringEvents = 7
```

---

## 📝 Code Changes Summary

### Changed Files

1. **`backend/routes/ai.js`**
   - Added: `analyzeRecurringPatterns()` function
   - Modified: `buildGeminiPrompt()` function
   - Modified: `generateSimulatedScheduleWithInstructions()` function
   - Modified: Logging in POST `/api/ai/suggest-schedule` endpoint

### Function Changes

| Function                                      | Type     | Lines   | Change             |
| --------------------------------------------- | -------- | ------- | ------------------ |
| `analyzeRecurringPatterns()`                  | NEW      | 45-125  | Pattern extraction |
| `buildGeminiPrompt()`                         | MODIFIED | 257-373 | Enhanced prompt    |
| `generateSimulatedScheduleWithInstructions()` | MODIFIED | 419-540 | Pattern handling   |
| `POST /suggest-schedule`                      | MODIFIED | 597-670 | Better logging     |

---

## 🔄 Execution Flow

```
User Input
  ↓
POST /api/ai/suggest-schedule
  ├─ Extract: tasks, startDate, endDate, additionalInstructions
  ├─ buildGeminiPrompt()
  │   ├─ analyzeRecurringPatterns(additionalInstructions)
  │   │   ├─ Regex matching
  │   │   ├─ Time parsing
  │   │   ├─ Frequency detection
  │   │   └─ Return patterns
  │   └─ Create enhanced prompt with pattern info
  ├─ Call Gemini API OR Simulation Mode
  │   └─ generateSimulatedScheduleWithInstructions()
  │       ├─ analyzeRecurringPatterns() again
  │       ├─ Create multiple events based on patterns
  │       └─ Return suggestions array
  └─ Response JSON
      ├─ suggestions: [...events...]
      ├─ statistics: {totalTasks, recurringEvents, ...}
      └─ mode: "gemini" | "simulation"

Response
  ↓
Frontend: ai-suggestion-handler.js
  ├─ Display preview
  ├─ Show event list
  └─ Apply to calendar
```

---

## 🧪 Test Cases

### Test 1: Basic Daily Pattern

```javascript
Input:
  additionalInstructions: "tập gym 6h sáng mỗi ngày"
  dateRange: 7 days

Expected Output:
  suggestions.length: 7
  All at 06:00
  isRecurring: true (or omitted)
  statistics.recurringEvents: 7
```

### Test 2: Weekly with Multiple Days

```javascript
Input:
  additionalInstructions: "tiếng anh 7h-9h sáng T2, T4, T6 hàng tuần"
  dateRange: 14 days (2 weeks)

Expected Output:
  suggestions.length: 6 (3 per week × 2 weeks)
  Days: [2, 4, 6]
  Time: 07:00-09:00
  Duration: 120 minutes
  statistics.recurringEvents: 6
```

### Test 3: No Pattern

```javascript
Input:
  additionalInstructions: "công việc thường"
  (No clear recurring pattern)

Expected Output:
  Fallback to simulation
  Distribute tasks based on priority
  statistics.recurringEvents: 0 or absent
```

---

## 🔧 Configuration

### Environment Variables

```
GEMINI_API_KEY=your_key_here
```

### Database

No new tables needed. Uses existing:

- `LichTrinh` (schedule table)
- `CongViec` (task table)

### Dependencies

No new dependencies. Uses existing:

- express
- @google/generative-ai (already added)

---

## 🐛 Error Handling

### Pattern Not Found

```javascript
if (recurringPatterns.length === 0) {
  // Use default simulation
  return generateSimulatedSchedule(...);
}
```

### API Fallback

```javascript
if (geminiAvailable) {
  try {
    aiResult = await callGeminiAI(prompt);
  } catch (error) {
    // Fallback to simulation
    aiResult = await generateSimulatedScheduleWithInstructions(...);
  }
}
```

### Logging

```javascript
console.log("📋 Analyzed recurring patterns:", patterns);
console.log(`✓ Added recurring event: ${title} on day ${dayNum}`);
console.log(`✅ Tạo ${suggestions.length} khung giờ...`);
```

---

## 📊 Performance

### Time Complexity

```
Pattern Analysis: O(n) where n = length of instruction string
                  Regex operations: O(n)
                  Loop through days: O(7)
                  Result: O(n)

Prompt Building: O(1) - fixed operations
                 String interpolation

Event Generation: O(d × t) where d = days, t = times in pattern
                  Typical: O(7 × 1) = O(7)
                  Max: O(7 × 10) = O(70) per pattern

Total: O(n + m) where n = instruction length
                       m = number of events
       Typical: ~300-500ms with Gemini API
                ~50-150ms with simulation
```

### Memory Usage

```
Pattern Array: ~1KB per pattern
Suggestions: ~100 bytes per event
Typical: <10KB for standard use case
```

---

## 🎯 Use Cases

### UC1: Personal Gym Schedule

```
User: "tập gym 6h sáng mỗi ngày"
Result: 7 events, automated recurring
Time saved: ~6 manual entries eliminated
```

### UC2: Class Schedule

```
User: "lớp tiếng anh 7h-9h T2, T4, T6 hàng tuần"
Result: 6 events (or 12 for 4 weeks)
Time saved: ~11 manual entries eliminated
```

### UC3: Work Meetings

```
User: "họp hành 14:30 mỗi T3"
Result: ~4 events per month
Time saved: ~3 manual entries per month
```

---

## ✅ Verification Checklist

```
Code Changes:
[ ] analyzeRecurringPatterns() implemented correctly
[ ] buildGeminiPrompt() enhanced with pattern display
[ ] generateSimulatedScheduleWithInstructions() handles patterns
[ ] No syntax errors
[ ] All regex patterns tested

Testing:
[ ] Test Case 1: Daily pattern (7 events)
[ ] Test Case 2: Weekly pattern (6+ events)
[ ] Test Case 3: Time parsing (06:00, 18:00, ranges)
[ ] Test Case 4: Day parsing (T2, T3, CN, ...)
[ ] Test Case 5: No pattern (fallback)
[ ] Gemini API fallback works
[ ] Console logs display correctly

Documentation:
[ ] QUICK_START.md created
[ ] GUIDE.md created
[ ] TEST_CASES.md created
[ ] TECHNICAL_SUMMARY.md created
[ ] Code comments added
[ ] README updated

Deployment:
[ ] No breaking changes
[ ] Backward compatible
[ ] Can be deployed safely
[ ] No database migrations needed
```

---

## 🚀 Deployment Steps

### 1. Code Review

```bash
# Check changes
git diff backend/routes/ai.js

# Verify syntax
npm run lint  # if available
```

### 2. Test Locally

```bash
cd backend
npm start

# In another terminal
curl -X POST http://localhost:3001/api/ai/suggest-schedule \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...test payload...}'
```

### 3. Deploy

```bash
git add backend/routes/ai.js
git commit -m "feat: add recurring schedule pattern analysis"
git push

# Deploy to server
# ... (your deployment process)
```

### 4. Verify on Production

```
- Login to app
- Create AI schedule with recurring request
- Verify events created correctly
- Check console logs
- Verify calendar display
```

---

## 📚 Code References

### Main File

- Location: `backend/routes/ai.js`
- Lines to review:
  - 45-125: `analyzeRecurringPatterns()`
  - 257-373: `buildGeminiPrompt()`
  - 419-540: `generateSimulatedScheduleWithInstructions()`
  - 597-670: Endpoint logging

### Related Files

- `frontend/assets/js/ai-suggestion-handler.js` - No changes needed
- `backend/routes/calendar.js` - Already fixed in previous session
- `backend/config/database.js` - No changes needed

---

## 💡 Future Enhancements

### Phase 2 (Low Priority)

- [ ] Support "mỗi 2 ngày" (every 2 days)
- [ ] Support "ngoại trừ T6, T7" (exclude weekends)
- [ ] Support "mỗi tháng" (monthly patterns)
- [ ] Support "tối đa X events" (limit creation)

### Phase 3 (Medium Priority)

- [ ] Dashboard for recurring events stats
- [ ] Edit/modify existing recurring events
- [ ] Delete entire recurring series
- [ ] Duplicate recurring pattern

### Phase 4 (High Priority)

- [ ] Calendar export with recurring events
- [ ] Google Calendar sync
- [ ] Notification for recurring events
- [ ] Smart conflict detection with ML

---

## 📞 Support

### For Bugs

1. Check console logs
2. Run test cases
3. Verify pattern analysis output
4. Check Gemini API status

### For Features

1. Create GitHub issue
2. Link to Phase 2/3/4 list above
3. Provide use case

### For Questions

1. Check documentation files
2. Review code comments
3. Check test cases for examples
