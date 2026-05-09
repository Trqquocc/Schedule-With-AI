#!/bin/bash
# Bulk rename DB table and column references in backend + frontend code
# Order: longest patterns first to avoid partial matches

DIRS="backend/routes backend/services backend/controllers backend/lib backend/telegram frontend/assets/js"
BASE="/mnt/d/Schedule-With-AI"

do_sed() {
  local old="$1" new="$2"
  find $DIRS -name "*.js" -exec sed -i "s/$old/$new/g" {} +
}

cd "$BASE"

# =============================================
# PHASE 1: TABLE RENAMES in from("...") calls
# =============================================
# Longest first to avoid partial matches (e.g. GroupMembers before Groups)
do_sed 'from("GoogleCalendarConnections")' 'from("KetNoiGoogleCalendar")'
do_sed 'from("TelegramConnections")' 'from("KetNoiTelegram")'
do_sed 'from("ConversationMembers")' 'from("ThanhVienHoiThoai")'
do_sed 'from("PomodoroSessions")' 'from("PhienPomodoro")'
do_sed 'from("CalendarShares")' 'from("ChiaSeLich")'
do_sed 'from("GroupMembers")' 'from("ThanhVienNhom")'
do_sed 'from("GroupTasks")' 'from("CongViecNhom")'
do_sed 'from("Conversations")' 'from("HoiThoai")'
do_sed 'from("HabitLogs")' 'from("NhatKyThoiQuen")'
do_sed 'from("TaskTags")' 'from("CongViecNhanDan")'
do_sed 'from("Messages")' 'from("TinNhan")'
do_sed 'from("Friends")' 'from("BanBe")'
do_sed 'from("Groups")' 'from("NhomLamViec")'
do_sed 'from("Habits")' 'from("ThoiQuen")'
do_sed 'from("Users")' 'from("NguoiDung")'
do_sed 'from("Tags")' 'from("NhanDan")'

# Table names in Supabase embed/join syntax (inside select strings)
# e.g. CongViec(TieuDe) stays, but Users(...) → NguoiDung(...)
do_sed 'Users!' 'NguoiDung!'
do_sed 'Groups(' 'NhomLamViec('

# =============================================
# PHASE 2: FK CONSTRAINT RENAMES in embed syntax
# =============================================
do_sed 'CalendarShares_OwnerID_fkey' 'ChiaSeLich_MaChuSoHuu_fkey'
do_sed 'CalendarShares_SharedWithID_fkey' 'ChiaSeLich_NguoiDuocChiaSe_fkey'
do_sed 'Friends_RequesterID_fkey' 'BanBe_NguoiGui_fkey'
do_sed 'Friends_ReceiverID_fkey' 'BanBe_NguoiNhan_fkey'
do_sed 'GroupTasks_AssignedTo_fkey' 'CongViecNhom_NguoiNhan_fkey'

# =============================================
# PHASE 3: COLUMN RENAMES
# Longest patterns first, order matters!
# =============================================

# --- GroupTaskID → MaCongViecNhom (already done in migration 018 for CongViec, but GroupTasks PK) ---
do_sed '"GroupTaskID"' '"MaCongViecNhom"'
do_sed '\.GroupTaskID' '.MaCongViecNhom'
do_sed 'GroupTaskID:' 'MaCongViecNhom:'

# --- ConversationID → MaHoiThoai ---
do_sed '"ConversationID"' '"MaHoiThoai"'
do_sed '\.ConversationID' '.MaHoiThoai'
do_sed 'ConversationID:' 'MaHoiThoai:'

# --- FriendshipID → MaKetBan ---
do_sed '"FriendshipID"' '"MaKetBan"'
do_sed '\.FriendshipID' '.MaKetBan'
do_sed 'FriendshipID:' 'MaKetBan:'

# --- SharedWithID → NguoiDuocChiaSe ---
do_sed '"SharedWithID"' '"NguoiDuocChiaSe"'
do_sed '\.SharedWithID' '.NguoiDuocChiaSe'
do_sed 'SharedWithID:' 'NguoiDuocChiaSe:'

# --- RequesterID → NguoiGui (in BanBe) ---
do_sed '"RequesterID"' '"NguoiGui"'
do_sed '\.RequesterID' '.NguoiGui'
do_sed 'RequesterID:' 'NguoiGui:'

# --- ReceiverID → NguoiNhan (in BanBe) ---
do_sed '"ReceiverID"' '"NguoiNhan"'
do_sed '\.ReceiverID' '.NguoiNhan'
do_sed 'ReceiverID:' 'NguoiNhan:'

# --- AssignedTo → NguoiNhan (in CongViecNhom) ---
do_sed '"AssignedTo"' '"NguoiNhan"'
do_sed '\.AssignedTo' '.NguoiNhan'
do_sed 'AssignedTo:' 'NguoiNhan:'

# --- AssignedBy → NguoiGiao (in CongViecNhom) ---
do_sed '"AssignedBy"' '"NguoiGiao"'
do_sed '\.AssignedBy' '.NguoiGiao'
do_sed 'AssignedBy:' 'NguoiGiao:'

# --- SenderID → NguoiGui (in TinNhan) ---
do_sed '"SenderID"' '"NguoiGui"'
do_sed '\.SenderID' '.NguoiGui'
do_sed 'SenderID:' 'NguoiGui:'

# --- MessageID → MaTinNhan ---
do_sed '"MessageID"' '"MaTinNhan"'
do_sed '\.MessageID' '.MaTinNhan'
do_sed 'MessageID:' 'MaTinNhan:'

# --- MemberID → MaThanhVien ---
do_sed '"MemberID"' '"MaThanhVien"'
do_sed '\.MemberID' '.MaThanhVien'
do_sed 'MemberID:' 'MaThanhVien:'

# --- SessionID → MaPhien ---
do_sed '"SessionID"' '"MaPhien"'
do_sed '\.SessionID' '.MaPhien'
do_sed 'SessionID:' 'MaPhien:'

# --- MaxMembers → SoThanhVienToiDa ---
do_sed '"MaxMembers"' '"SoThanhVienToiDa"'
do_sed '\.MaxMembers' '.SoThanhVienToiDa'
do_sed 'MaxMembers:' 'SoThanhVienToiDa:'

# --- OwnerID → MaChuNhom (Groups) / MaChuSoHuu (CalendarShares) ---
# OwnerID appears in both Groups and CalendarShares context
# CalendarShares files: calendar-shares.js, calendar-shared-events.js
# Groups files: group-service.js, groups.js, etc.
# We need context-specific replacement. Do ChiaSeLich first, then Groups.
# For calendar-shares files: OwnerID → MaChuSoHuu
find backend/routes -name "calendar-share*.js" -exec sed -i 's/"OwnerID"/"MaChuSoHuu"/g; s/\.OwnerID/.MaChuSoHuu/g; s/OwnerID:/MaChuSoHuu:/g' {} +
# For groups/group-service files: OwnerID → MaChuNhom
find backend/routes -name "groups.js" -exec sed -i 's/"OwnerID"/"MaChuNhom"/g; s/\.OwnerID/.MaChuNhom/g; s/OwnerID:/MaChuNhom:/g' {} +
find backend/services -name "group-service.js" -o -name "group-member-service.js" | xargs sed -i 's/"OwnerID"/"MaChuNhom"/g; s/\.OwnerID/.MaChuNhom/g; s/OwnerID:/MaChuNhom:/g'
find backend/services -name "conversation-service.js" | xargs sed -i 's/"OwnerID"/"MaChuNhom"/g; s/\.OwnerID/.MaChuNhom/g; s/OwnerID:/MaChuNhom:/g'

# --- GroupID → MaNhom ---
do_sed '"GroupID"' '"MaNhom"'
do_sed '\.GroupID' '.MaNhom'
do_sed 'GroupID:' 'MaNhom:'

# --- ShareID → MaChiaSe ---
do_sed '"ShareID"' '"MaChiaSe"'
do_sed '\.ShareID' '.MaChiaSe'
do_sed 'ShareID:' 'MaChiaSe:'

# --- TagID → MaNhanDan ---
do_sed '"TagID"' '"MaNhanDan"'
do_sed '\.TagID' '.MaNhanDan'
do_sed 'TagID:' 'MaNhanDan:'
# Also in frontend tag references
do_sed 'tagId' 'maNhanDan'

# --- HabitID → MaThoiQuen ---
do_sed '"HabitID"' '"MaThoiQuen"'
do_sed '\.HabitID' '.MaThoiQuen'
do_sed 'HabitID:' 'MaThoiQuen:'

# --- LogID → MaNhatKy ---
do_sed '"LogID"' '"MaNhatKy"'
do_sed '\.LogID' '.MaNhatKy'
do_sed 'LogID:' 'MaNhatKy:'

# --- UserID → MaNguoiDung (most widespread - do last) ---
# CAREFUL: only replace DB column references, NOT JS variable names like userId, req.userId
do_sed '"UserID"' '"MaNguoiDung"'
# Property access on DB result objects
do_sed '\.UserID' '.MaNguoiDung'
# Object literal keys (for insert/update payloads)
do_sed 'UserID:' 'MaNguoiDung:'

# --- Drop references to deleted columns ---
# CongViec.Tag (string field) - remove from insert/select/update but keep Tags table refs
# This needs manual fixing - the sed would be too risky for select strings

# --- "ID" in ConversationMembers (now ThanhVienHoiThoai) → MaThanhVien ---
# Already handled by MemberID rename above, but the original column was "ID"
# Check if any code uses just "ID" for this table
find backend/services -name "conversation-service.js" -exec sed -i 's/"ID"/"MaThanhVien"/g' {} +

# --- IsActive / CreatedDate removal from auth.js ---
# These need manual removal from the insert payload

# --- TaskID in NhatKyNhacNho → MaCongViec ---
do_sed '"TaskID"' '"MaCongViec"'
do_sed '\.TaskID' '.MaCongViec'
do_sed 'TaskID:' 'MaCongViec:'

echo "Done! Renamed all DB references."
