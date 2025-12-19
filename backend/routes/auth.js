require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { dbPoolPromise, sql } = require("../config/database");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, hoten } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin",
      });
    }

    const pool = await dbPoolPromise;

    const check = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("email", sql.NVarChar, email)
      .query(
        "SELECT UserID FROM Users WHERE Username = @username OR Email = @email"
      );

    if (check.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập hoặc email đã tồn tại",
      });
    }

    const hashed = await bcrypt.hash(password, 12);
    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, hashed)
      .input("email", sql.NVarChar, email)
      .input("hoten", sql.NVarChar, hoten || username).query(`
        INSERT INTO Users (Username, Password, Email, HOTen, CreatedDate, NgayTao, LuongTheoGio, IsActive)
        OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.HOTen
        VALUES (@username, @password, @email, @hoten, GETDATE(), GETDATE(), 29000, 1)
      `);

    const newUser = result.recordset[0];

    const defaultCats = [
      { TenLoai: "Công việc", MoTa: "Công việc hàng ngày" },
      { TenLoai: "Cá nhân", MoTa: "Việc cá nhân" },
      { TenLoai: "Học tập", MoTa: "Học tập và phát triển" },
      { TenLoai: "Sức khỏe", MoTa: "Chăm sóc sức khỏe" },
    ];

    for (const c of defaultCats) {
      await pool
        .request()
        .input("UserID", sql.Int, newUser.UserID)
        .input("TenLoai", sql.NVarChar(100), c.TenLoai)
        .input("MoTa", sql.NVarChar(255), c.MoTa)
        .query(
          `INSERT INTO LoaiCongViec (UserID, TenLoai, MoTa) VALUES (@UserID, @TenLoai, @MoTa)`
        );
    }

    const token = jwt.sign(
      {
        userId: newUser.UserID,
        username: newUser.Username,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: {
        token: token,
        user: {
          id: newUser.UserID,
          username: newUser.Username,
          email: newUser.Email,
          hoten: newUser.HOTen || newUser.Username,
        },
      },
    });
  } catch (err) {
    console.error("Lỗi đăng ký:", err);
    return res.status(500).json({
      success: false,
      message: "Lỗi server: " + err.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const pool = await dbPoolPromise;

    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query(
        "SELECT * FROM Users WHERE Username = @username OR Email = @username"
      );

    const user = result.recordset[0];

    if (!user || !(await bcrypt.compare(password, user.Password))) {
      return res.status(401).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    await pool
      .request()
      .input("UserID", sql.Int, user.UserID)
      .query("UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @UserID");

    const token = jwt.sign(
      { userId: user.UserID, username: user.Username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        token,
        user: {
          id: user.UserID,
          username: user.Username,
          email: user.Email,
          hoten: user.HOTen,
          luongTheoGio: user.LuongTheoGio || 0,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res
      .status(500)
      .json({ success: false, message: "Lỗi server khi đăng nhập" });
  }
});

router.get("/verify", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Không có token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const pool = await dbPoolPromise;

    const result = await pool
      .request()
      .input("UserID", sql.Int, decoded.userId)
      .query(
        "SELECT UserID, Username, Email, HOTen, LuongTheoGio FROM Users WHERE UserID = @UserID"
      );

    if (result.recordset.length === 0) {
      throw new Error("User not found");
    }

    res.json({
      success: true,
      data: { user: result.recordset[0] },
    });
  } catch (error) {
    res
      .status(401)
      .json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
  }
});

router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Đăng xuất thành công" });
});

module.exports = router;
