

const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const { dbPoolPromise, sql } = require("../config/database");

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.UserID;

    const pool = await dbPoolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(
        "SELECT UserID as id, Username as username, Email as email, HoTen as hoten, Phone as phone, NgaySinh as ngaysinh, GioiTinh as gioitinh, Bio as bio FROM Users WHERE UserID = @userId"
      );

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res
      .status(500)
      .json({ message: "Error fetching profile", error: error.message });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.UserID;

    if (userId !== currentUserId && currentUserId !== 1) {

      return res
        .status(403)
        .json({ message: "Không có quyền cập nhật thông tin này" });
    }

    const { hoten, email, phone, ngaysinh, gioitinh, bio } = req.body;

    if (!hoten || !email) {
      return res.status(400).json({ message: "Họ tên và email là bắt buộc" });
    }

    const pool = await dbPoolPromise;

    const updateResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("hoten", sql.NVarChar, hoten || "")
      .input("email", sql.NVarChar, email || "")
      .input("phone", sql.NVarChar, phone || null)
      .input("ngaysinh", sql.DateTime, ngaysinh || null)
      .input("gioitinh", sql.NVarChar, gioitinh || null)
      .input("bio", sql.NVarChar, bio || null)
      .query(
        "UPDATE Users SET HoTen = @hoten, Email = @email, Phone = @phone, NgaySinh = @ngaysinh, GioiTinh = @gioitinh, Bio = @bio WHERE UserID = @userId"
      );

    if (updateResult.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const selectResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(
        "SELECT UserID as id, Username as username, Email as email, HoTen as hoten, Phone as phone, NgaySinh as ngaysinh, GioiTinh as gioitinh, Bio as bio FROM Users WHERE UserID = @userId"
      );

    res.json({
      success: true,
      message: "Thông tin cá nhân được cập nhật thành công",
      data: selectResult.recordset[0],
    });

    console.log(` User ${userId} profile updated`);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res
      .status(500)
      .json({ message: "Error updating profile", error: error.message });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.UserID;

    if (userId !== currentUserId && currentUserId !== 1) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    const pool = await dbPoolPromise;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(
        "SELECT UserID as id, Username as username, Email as email, HoTen as hoten, Phone as phone, NgaySinh as ngaysinh, GioiTinh as gioitinh, Bio as bio FROM Users WHERE UserID = @userId"
      );

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.UserID;

    if (userId !== currentUserId && currentUserId !== 1) {
      return res
        .status(403)
        .json({ message: "Không có quyền xóa tài khoản này" });
    }

    const pool = await dbPoolPromise;

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query("DELETE FROM Users WHERE UserID = @userId");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "Tài khoản được xóa thành công",
    });

    console.log(` User ${userId} account deleted`);
  } catch (error) {
    console.error("Error deleting user:", error);
    res
      .status(500)
      .json({ message: "Error deleting user", error: error.message });
  }
});

module.exports = router;
