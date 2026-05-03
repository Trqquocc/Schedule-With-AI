-- =============================================================
-- Migration 019: Unify all table/column names to Vietnamese (no diacritics)
-- + Drop redundant columns
-- Run in Supabase SQL Editor
-- =============================================================

-- =============================================
-- 1. DROP REDUNDANT COLUMNS
-- =============================================
ALTER TABLE "Users" DROP COLUMN IF EXISTS "CreatedDate";
ALTER TABLE "Users" DROP COLUMN IF EXISTS "IsActive";
ALTER TABLE "CongViec" DROP COLUMN IF EXISTS "Tag";
ALTER TABLE "CongViec" DROP COLUMN IF EXISTS "MauSac";
ALTER TABLE "CongViec" DROP COLUMN IF EXISTS "ThoiLuongMacDinh";
ALTER TABLE "CongViec" DROP COLUMN IF EXISTS "HanChot";

-- =============================================
-- 2. RENAME TABLES (English → Vietnamese)
-- =============================================
ALTER TABLE "Users" RENAME TO "NguoiDung";
ALTER TABLE "Groups" RENAME TO "NhomLamViec";
ALTER TABLE "GroupMembers" RENAME TO "ThanhVienNhom";
ALTER TABLE "GroupTasks" RENAME TO "CongViecNhom";
ALTER TABLE "Conversations" RENAME TO "HoiThoai";
ALTER TABLE "ConversationMembers" RENAME TO "ThanhVienHoiThoai";
ALTER TABLE "Messages" RENAME TO "TinNhan";
ALTER TABLE "Friends" RENAME TO "BanBe";
ALTER TABLE "CalendarShares" RENAME TO "ChiaSeLich";
ALTER TABLE "Tags" RENAME TO "NhanDan";
ALTER TABLE "TaskTags" RENAME TO "CongViecNhanDan";
ALTER TABLE "Habits" RENAME TO "ThoiQuen";
ALTER TABLE "HabitLogs" RENAME TO "NhatKyThoiQuen";
ALTER TABLE "PomodoroSessions" RENAME TO "PhienPomodoro";
ALTER TABLE "TelegramConnections" RENAME TO "KetNoiTelegram";
ALTER TABLE "GoogleCalendarConnections" RENAME TO "KetNoiGoogleCalendar";

-- =============================================
-- 3. RENAME COLUMNS: UserID → MaNguoiDung (all tables)
-- =============================================
ALTER TABLE "NguoiDung" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "CongViec" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "LichTrinh" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "LichCongViec" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "CongViecPhu" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "LoaiCongViec" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "DieuChinhLuong" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "NhomLamViec" RENAME COLUMN "OwnerID" TO "MaChuNhom";
ALTER TABLE "NhomLamViec" RENAME COLUMN "MaxMembers" TO "SoThanhVienToiDa";
ALTER TABLE "ThanhVienNhom" RENAME COLUMN "MemberID" TO "MaThanhVien";
ALTER TABLE "ThanhVienNhom" RENAME COLUMN "GroupID" TO "MaNhom";
ALTER TABLE "ThanhVienNhom" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "CongViecNhom" RENAME COLUMN "GroupTaskID" TO "MaCongViecNhom";
ALTER TABLE "CongViecNhom" RENAME COLUMN "GroupID" TO "MaNhom";
ALTER TABLE "CongViecNhom" RENAME COLUMN "AssignedTo" TO "NguoiNhan";
ALTER TABLE "CongViecNhom" RENAME COLUMN "AssignedBy" TO "NguoiGiao";
ALTER TABLE "HoiThoai" RENAME COLUMN "ConversationID" TO "MaHoiThoai";
ALTER TABLE "HoiThoai" RENAME COLUMN "GroupID" TO "MaNhom";
ALTER TABLE "ThanhVienHoiThoai" RENAME COLUMN "ID" TO "MaThanhVien";
ALTER TABLE "ThanhVienHoiThoai" RENAME COLUMN "ConversationID" TO "MaHoiThoai";
ALTER TABLE "ThanhVienHoiThoai" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "TinNhan" RENAME COLUMN "MessageID" TO "MaTinNhan";
ALTER TABLE "TinNhan" RENAME COLUMN "ConversationID" TO "MaHoiThoai";
ALTER TABLE "TinNhan" RENAME COLUMN "SenderID" TO "NguoiGui";
ALTER TABLE "BanBe" RENAME COLUMN "FriendshipID" TO "MaKetBan";
ALTER TABLE "BanBe" RENAME COLUMN "RequesterID" TO "NguoiGui";
ALTER TABLE "BanBe" RENAME COLUMN "ReceiverID" TO "NguoiNhan";
ALTER TABLE "ChiaSeLich" RENAME COLUMN "ShareID" TO "MaChiaSe";
ALTER TABLE "ChiaSeLich" RENAME COLUMN "OwnerID" TO "MaChuSoHuu";
ALTER TABLE "ChiaSeLich" RENAME COLUMN "SharedWithID" TO "NguoiDuocChiaSe";
ALTER TABLE "NhanDan" RENAME COLUMN "TagID" TO "MaNhanDan";
ALTER TABLE "NhanDan" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "CongViecNhanDan" RENAME COLUMN "TagID" TO "MaNhanDan";
ALTER TABLE "ThoiQuen" RENAME COLUMN "HabitID" TO "MaThoiQuen";
ALTER TABLE "ThoiQuen" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "NhatKyThoiQuen" RENAME COLUMN "LogID" TO "MaNhatKy";
ALTER TABLE "NhatKyThoiQuen" RENAME COLUMN "HabitID" TO "MaThoiQuen";
ALTER TABLE "PhienPomodoro" RENAME COLUMN "SessionID" TO "MaPhien";
ALTER TABLE "PhienPomodoro" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "KetNoiTelegram" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "KetNoiGoogleCalendar" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "ThanhTich" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "TinNhanTuVan" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "NhatKyNhacNho" RENAME COLUMN "UserID" TO "MaNguoiDung";
ALTER TABLE "NhatKyNhacNho" RENAME COLUMN "TaskID" TO "MaCongViec";
-- NhomLamViec: rename GroupID PK
ALTER TABLE "NhomLamViec" RENAME COLUMN "GroupID" TO "MaNhom";

-- =============================================
-- 4. RENAME FK CONSTRAINTS (used in Supabase embed syntax)
-- =============================================

-- BanBe (was Friends)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Friends_RequesterID_fkey') THEN
    ALTER TABLE "BanBe" RENAME CONSTRAINT "Friends_RequesterID_fkey" TO "BanBe_NguoiGui_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Friends_ReceiverID_fkey') THEN
    ALTER TABLE "BanBe" RENAME CONSTRAINT "Friends_ReceiverID_fkey" TO "BanBe_NguoiNhan_fkey";
  END IF;
END $$;

-- ChiaSeLich (was CalendarShares)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarShares_OwnerID_fkey') THEN
    ALTER TABLE "ChiaSeLich" RENAME CONSTRAINT "CalendarShares_OwnerID_fkey" TO "ChiaSeLich_MaChuSoHuu_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarShares_SharedWithID_fkey') THEN
    ALTER TABLE "ChiaSeLich" RENAME CONSTRAINT "CalendarShares_SharedWithID_fkey" TO "ChiaSeLich_NguoiDuocChiaSe_fkey";
  END IF;
END $$;

-- CongViecNhom (was GroupTasks)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GroupTasks_AssignedTo_fkey') THEN
    ALTER TABLE "CongViecNhom" RENAME CONSTRAINT "GroupTasks_AssignedTo_fkey" TO "CongViecNhom_NguoiNhan_fkey";
  END IF;
END $$;

-- =============================================
-- 5. Reload PostgREST schema cache
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================================
-- Rollback: reverse all renames (tables, columns, constraints)
-- =============================================================
