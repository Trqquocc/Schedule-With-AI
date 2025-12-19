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
        "SELECT UserID as id, Username as username, Email as email, HoTen as hoten, SoDienThoai as phone, LuongTheoGio as luongthegio FROM Users WHERE UserID = @userId"
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

    console.log(
      `📝 UPDATE USER REQUEST - UserID: ${userId}, CurrentUserID: ${currentUserId}`
    );

    if (userId !== currentUserId && currentUserId !== 1) {
      return res
        .status(403)
        .json({ message: "Không có quyền cập nhật thông tin này" });
    }

    const {
      hoten,
      email,
      phone,
      username,
      HoTen,
      Email,
      SoDienThoai,
      Password,
      LuongTheoGio,
      luongthegio,
    } = req.body;

    // Support both lowercase and uppercase field names
    const hoTenValue = hoten || HoTen;
    const emailValue = email || Email;
    const phoneValue = phone || SoDienThoai;
    const passwordValue = Password;
    const luongTheoGioValue = luongthegio || LuongTheoGio;

    console.log("📦 Received payload:", {
      hoten: hoTenValue,
      email: emailValue,
      phone: phoneValue,
      hasPassword: !!passwordValue,
      luongthegio: luongTheoGioValue,
    });

    if (!hoTenValue || !emailValue) {
      return res.status(400).json({ message: "Họ tên và email là bắt buộc" });
    }

    const pool = await dbPoolPromise;

    // Build dynamic UPDATE query based on provided fields
    let updateFields = [];
    let updateParams = [];

    updateFields.push("HoTen = @hoten");
    updateParams.push({ name: "hoten", type: sql.NVarChar, value: hoTenValue });

    updateFields.push("Email = @email");
    updateParams.push({ name: "email", type: sql.NVarChar, value: emailValue });

    if (phoneValue) {
      updateFields.push("SoDienThoai = @phone");
      updateParams.push({
        name: "phone",
        type: sql.NVarChar,
        value: phoneValue,
      });
    }

    if (passwordValue) {
      updateFields.push("Password = @password");
      updateParams.push({
        name: "password",
        type: sql.NVarChar,
        value: passwordValue,
      });
    }

    if (luongTheoGioValue) {
      updateFields.push("LuongTheoGio = @luongthegio");
      updateParams.push({
        name: "luongthegio",
        type: sql.Decimal(10, 2),
        value: luongTheoGioValue,
      });
    }

    // Build the request
    let request = pool.request();
    request.input("userId", sql.Int, userId);

    updateParams.forEach((param) => {
      request.input(param.name, param.type, param.value);
    });

    const updateQuery = `UPDATE Users SET ${updateFields.join(
      ", "
    )} WHERE UserID = @userId`;
    console.log("📝 Update query:", updateQuery);

    const updateResult = await request.query(updateQuery);

    console.log(
      "✅ Update result rows affected:",
      updateResult.rowsAffected[0]
    );

    if (updateResult.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const selectResult = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(
        "SELECT UserID as id, Username as username, Email as email, HoTen as hoten, SoDienThoai as phone, LuongTheoGio as luongthegio FROM Users WHERE UserID = @userId"
      );

    console.log("✅ Updated user data:", selectResult.recordset[0]);

    res.json({
      success: true,
      message: "Thông tin cá nhân được cập nhật thành công",
      data: selectResult.recordset[0],
    });

    console.log(`✅ User ${userId} profile updated successfully`);
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
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
