-- ====================================================
-- 📋 BẢNG PhienAIDeXuat - Tracking AI Proposals
-- ====================================================
-- MỤC ĐÍCH: Lưu lịch sử tất cả các lần AI đề xuất lịch trình
-- 
-- SỬ DỤNG ĐỂ:
-- - 📊 Thống kê AI được dùng bao nhiêu lần
-- - 🔍 Xem lịch sử từng proposal của từng user
-- - 📈 Phân tích hiệu quả AI (được apply hay không)
-- - ⚡ Tracking AI system performance
-- ====================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='PhienAIDeXuat')
BEGIN
    CREATE TABLE PhienAIDeXuat (
        -- 🔑 Keys
        MaPhienDeXuat INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        
        -- 📅 Timestamps
        NgayDeXuat DATETIME2 DEFAULT GETDATE(),          -- Ngày/giờ AI được yêu cầu
        ThoiGianApDung DATETIME2 NULL,                  -- Ngày/giờ user apply proposal
        
        -- 📝 Content
        NoiDungYeuCau NVARCHAR(MAX),                    -- Nội dung request từ user (ví dụ: "hôm nay 8h-12h làm report")
        GhiChu NVARCHAR(MAX),                           -- Ghi chú thêm
        
        -- ✅ Status
        DaApDung BIT DEFAULT 0,                         -- 1 = đã áp dụng, 0 = chưa áp dụng
        
        -- 🔗 Foreign Keys
        FOREIGN KEY (UserID) REFERENCES NguoiDung(MaNguoiDung) ON DELETE CASCADE
    );
    
    -- 🚀 Tạo indexes để tìm kiếm nhanh
    CREATE INDEX IX_PhienAIDeXuat_UserID ON PhienAIDeXuat(UserID);
    CREATE INDEX IX_PhienAIDeXuat_NgayDeXuat ON PhienAIDeXuat(NgayDeXuat DESC);
    CREATE INDEX IX_PhienAIDeXuat_DaApDung ON PhienAIDeXuat(DaApDung);
    CREATE INDEX IX_PhienAIDeXuat_UserID_DaApDung ON PhienAIDeXuat(UserID, DaApDung);
    
    PRINT '✅ Bảng PhienAIDeXuat đã được tạo thành công!';
    PRINT '   - Dùng để tracking lịch sử AI proposals';
    PRINT '   - Có 4 indexes cho tìm kiếm nhanh';
END
ELSE
BEGIN
    PRINT '⚠️  Bảng PhienAIDeXuat đã tồn tại!';
    
    -- Kiểm tra xem có thiếu field nào không
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PhienAIDeXuat' AND COLUMN_NAME='DaApDung')
    BEGIN
        ALTER TABLE PhienAIDeXuat ADD DaApDung BIT DEFAULT 0;
        PRINT '   ✏️  Đã thêm field DaApDung';
    END
END;

-- ℹ️  HƯỚNG DẪN:
-- 1. Chạy script này trong SQL Server Management Studio
-- 2. Thay tên table NguoiDung nếu cần (kiểm tra schema của bạn)
-- 3. Nếu foreign key fail, sửa lại foreign key reference
