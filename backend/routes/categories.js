// Quản lý danh mục công việc với xác thực người dùng

const express = require("express");
const router = express.Router();
const { dbPoolPromise, sql } = require("../config/database");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware xác thực JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token)
    return res.status(401).json({ success: false, message: "Không có token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res
      .status(403)
      .json({ success: false, message: "Token không hợp lệ" });
  }
};

// Áp dụng middleware cho tất cả routes
router.use(authenticateToken);

// GET danh sách danh mục theo user
router.get("/", async (req, res) => {
  try {
    const pool = await dbPoolPromise;
    const result = await pool.request().input("UserID", sql.Int, req.userId)
      .query(`
        SELECT MaLoai, TenLoai, MoTa
        FROM LoaiCongViec
        WHERE UserID = @UserID
      `);

    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error("Lỗi tải danh mục:", error);
    res.status(500).json({ success: false, message: "Lỗi tải danh mục" });
  }
});

// POST tạo danh mục mới
router.post("/", async (req, res) => {
  try {
    const { TenLoai, MoTa } = req.body;

    if (!TenLoai) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tên danh mục",
      });
    }

    const pool = await dbPoolPromise;
    const result = await pool
      .request()
      .input("UserID", sql.Int, req.userId)
      .input("TenLoai", sql.NVarChar, TenLoai)
      .input("MoTa", sql.NVarChar, MoTa || "").query(`
        INSERT INTO LoaiCongViec (UserID, TenLoai, MoTa)
        OUTPUT INSERTED.MaLoai, INSERTED.TenLoai, INSERTED.MoTa
        VALUES (@UserID, @TenLoai, @MoTa)
      `);

    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Lỗi tạo danh mục:", error);
    res.status(500).json({ success: false, message: "Lỗi tạo danh mục" });
  }
});

// PUT cập nhật danh mục
router.put("/:id", async (req, res) => {
  try {
    const { TenLoai, MoTa } = req.body;
    const pool = await dbPoolPromise;

    await pool
      .request()
      .input("MaLoai", sql.Int, req.params.id)
      .input("UserID", sql.Int, req.userId)
      .input("TenLoai", sql.NVarChar, TenLoai)
      .input("MoTa", sql.NVarChar, MoTa || "").query(`
        UPDATE LoaiCongViec
        SET TenLoai = @TenLoai, MoTa = @MoTa
        WHERE MaLoai = @MaLoai AND UserID = @UserID
      `);

    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật danh mục:", error);
    res.status(500).json({ success: false, message: "Lỗi cập nhật danh mục" });
  }
});

// DELETE xóa danh mục
router.delete("/:id", async (req, res) => {
  try {
    const pool = await dbPoolPromise;
    await pool
      .request()
      .input("MaLoai", sql.Int, req.params.id)
      .input("UserID", sql.Int, req.userId).query(`
        DELETE FROM LoaiCongViec
        WHERE MaLoai = @MaLoai AND UserID = @UserID
      `);

    res.json({ success: true, message: "Xóa danh mục thành công" });
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error);
    res.status(500).json({ success: false, message: "Lỗi xóa danh mục" });
  }
});

module.exports = router;
