// middleware/auth.js - CHỈ CẦN MỘT HÀM authenticateToken

const jwt = require("jsonwebtoken");
const { dbPoolPromise, sql } = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware xác thực đồng bộ duy nhất
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token không tồn tại",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Kiểm tra user tồn tại trong database
    const pool = await dbPoolPromise;
    const userCheck = await pool
      .request()
      .input("userId", sql.Int, decoded.userId)
      .query("SELECT UserID, Username FROM Users WHERE UserID = @userId");

    if (userCheck.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User không tồn tại",
      });
    }

    req.user = {
      UserID: decoded.userId,
      username: decoded.username,
    };
    req.userId = decoded.userId;

    next();
  } catch (err) {
    console.error("Token verification error:", err);
    return res.status(403).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
};

module.exports = { authenticateToken };
