-- =============================================================
-- Migration 018: Standardize table/column names to Vietnamese (no diacritics)
-- Converts English-named tables and columns to match existing Vietnamese convention.
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- =============================================================

-- =============================================
-- 1. RENAME TABLES
-- =============================================
ALTER TABLE "task_instances" RENAME TO "LichCongViec";
ALTER TABLE "event_subtasks" RENAME TO "CongViecPhu";
ALTER TABLE "ChatMessages" RENAME TO "TinNhanTuVan";
ALTER TABLE "UserGamification" RENAME TO "ThanhTich";
ALTER TABLE "TelegramReminderLog" RENAME TO "NhatKyNhacNho";

-- =============================================
-- 2. LichCongViec columns (was task_instances)
-- =============================================
ALTER TABLE "LichCongViec" RENAME COLUMN "id" TO "MaLich";
ALTER TABLE "LichCongViec" RENAME COLUMN "task_id" TO "MaCongViec";
ALTER TABLE "LichCongViec" RENAME COLUMN "user_id" TO "UserID";
ALTER TABLE "LichCongViec" RENAME COLUMN "start_at" TO "GioBatDau";
ALTER TABLE "LichCongViec" RENAME COLUMN "end_at" TO "GioKetThuc";
ALTER TABLE "LichCongViec" RENAME COLUMN "title" TO "TieuDe";
ALTER TABLE "LichCongViec" RENAME COLUMN "note" TO "GhiChu";
ALTER TABLE "LichCongViec" RENAME COLUMN "status" TO "TrangThai";
ALTER TABLE "LichCongViec" RENAME COLUMN "is_ai_suggested" TO "AI_DeXuat";
ALTER TABLE "LichCongViec" RENAME COLUMN "created_at" TO "NgayTao";
ALTER TABLE "LichCongViec" RENAME COLUMN "updated_at" TO "NgayCapNhat";
ALTER TABLE "LichCongViec" RENAME COLUMN "source" TO "NguonDuLieu";
ALTER TABLE "LichCongViec" RENAME COLUMN "priority_rank" TO "ThuTuUuTien";
ALTER TABLE "LichCongViec" RENAME COLUMN "import_batch_id" TO "MaLoNhap";
ALTER TABLE "LichCongViec" RENAME COLUMN "meta" TO "DuLieuPhu";

-- =============================================
-- 3. CongViecPhu columns (was event_subtasks)
-- =============================================
ALTER TABLE "CongViecPhu" RENAME COLUMN "id" TO "MaCongViecPhu";
ALTER TABLE "CongViecPhu" RENAME COLUMN "event_id" TO "MaLichTrinh";
ALTER TABLE "CongViecPhu" RENAME COLUMN "user_id" TO "UserID";
ALTER TABLE "CongViecPhu" RENAME COLUMN "title" TO "TieuDe";
ALTER TABLE "CongViecPhu" RENAME COLUMN "start_at" TO "GioBatDau";
ALTER TABLE "CongViecPhu" RENAME COLUMN "end_at" TO "GioKetThuc";
ALTER TABLE "CongViecPhu" RENAME COLUMN "note" TO "GhiChu";
ALTER TABLE "CongViecPhu" RENAME COLUMN "is_done" TO "DaHoanThanh";
ALTER TABLE "CongViecPhu" RENAME COLUMN "position" TO "ViTri";
ALTER TABLE "CongViecPhu" RENAME COLUMN "created_at" TO "NgayTao";
ALTER TABLE "CongViecPhu" RENAME COLUMN "updated_at" TO "NgayCapNhat";

-- =============================================
-- 4. TinNhanTuVan columns (was ChatMessages)
-- =============================================
ALTER TABLE "TinNhanTuVan" RENAME COLUMN "Id" TO "MaTinNhan";
ALTER TABLE "TinNhanTuVan" RENAME COLUMN "Role" TO "VaiTro";
ALTER TABLE "TinNhanTuVan" RENAME COLUMN "Content" TO "NoiDung";
ALTER TABLE "TinNhanTuVan" RENAME COLUMN "ContextAttached" TO "DinhKemNguCanh";
ALTER TABLE "TinNhanTuVan" RENAME COLUMN "CreatedAt" TO "NgayTao";

-- =============================================
-- 5. ThanhTich columns (was UserGamification)
-- =============================================
ALTER TABLE "ThanhTich" RENAME COLUMN "XP" TO "DiemKinhNghiem";
ALTER TABLE "ThanhTich" RENAME COLUMN "Level" TO "CapDo";
ALTER TABLE "ThanhTich" RENAME COLUMN "Streak" TO "ChuoiNgay";
ALTER TABLE "ThanhTich" RENAME COLUMN "Badges" TO "HuyHieu";
ALTER TABLE "ThanhTich" RENAME COLUMN "LastXPUpdate" TO "LanCapNhatCuoi";
ALTER TABLE "ThanhTich" RENAME COLUMN "CreatedAt" TO "NgayTao";

-- =============================================
-- 6. NhatKyNhacNho columns (was TelegramReminderLog)
-- =============================================
ALTER TABLE "NhatKyNhacNho" RENAME COLUMN "Kind" TO "LoaiNhacNho";
ALTER TABLE "NhatKyNhacNho" RENAME COLUMN "SentAt" TO "ThoiGianGui";

-- =============================================
-- 7. English columns in existing Vietnamese tables
-- =============================================

-- CongViec: drop unused English aliases (code uses CoThoiGianCoDinh/GioBatDauCoDinh/GioKetThucCoDinh)
ALTER TABLE "CongViec" DROP COLUMN IF EXISTS "is_fixed";
ALTER TABLE "CongViec" DROP COLUMN IF EXISTS "fixed_start";
ALTER TABLE "CongViec" DROP COLUMN IF EXISTS "fixed_end";
ALTER TABLE "CongViec" RENAME COLUMN "default_duration_minutes" TO "ThoiLuongMacDinh";
ALTER TABLE "CongViec" RENAME COLUMN "GroupTaskID" TO "MaCongViecNhom";

-- CalendarShares
ALTER TABLE "CalendarShares" RENAME COLUMN "Permission" TO "QuyenHan";

-- LichTrinh
ALTER TABLE "LichTrinh" RENAME COLUMN "GoogleEventId" TO "MaSuKienGoogle";

-- =============================================
-- 8. Reload PostgREST schema cache
-- =============================================
NOTIFY pgrst, 'reload schema';

-- =============================================================
-- Rollback (if needed):
--   ALTER TABLE "LichCongViec" RENAME TO "task_instances";
--   ALTER TABLE "CongViecPhu" RENAME TO "event_subtasks";
--   ALTER TABLE "TinNhanTuVan" RENAME TO "ChatMessages";
--   ALTER TABLE "ThanhTich" RENAME TO "UserGamification";
--   ALTER TABLE "NhatKyNhacNho" RENAME TO "TelegramReminderLog";
--   (then rename all columns back — see mapping above)
-- =============================================================
