// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");

const { authenticateToken } = require("./middleware/auth");
const { dbPoolPromise } = require("./config/database");

// Routes
const authRoutes = require("./routes/auth");
const tasksRoutes = require("./routes/tasks");
const calendarRoutes = require("./routes/calendar");
const aiRoutes = require("./routes/ai");
const categoriesRoutes = require("./routes/categories");
const salaryRoutes = require("./routes/salary");
const statisticsRoutes = require("./routes/statistics");

const app = express();
const PORT = process.env.PORT || 3000;

// ===========================
// CẤU HÌNH CƠ BẢN
// ===========================
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5500",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../frontend"))); // phục vụ file tĩnh

// ===========================
// KẾT NỐI DATABASE
// ===========================
const initializeDatabase = async () => {
  try {
    await dbPoolPromise;
    console.log("Database connected successfully!");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

// ===========================
// ROUTES – CHỈ DÙNG JWT (authenticateToken)
// ===========================
app.use("/api/auth", authRoutes); // không cần bảo vệ
app.use("/api/tasks", authenticateToken, tasksRoutes);
app.use("/api/calendar", authenticateToken, calendarRoutes);
app.use("/api/ai", authenticateToken, aiRoutes);
app.use("/api/categories", authenticateToken, categoriesRoutes);
app.use("/api/salary", authenticateToken, salaryRoutes);
app.use("/api/statistics", authenticateToken, statisticsRoutes);

// API cũ vẫn dùng (nếu có)
app.get("/api/work/tasks", authenticateToken, (req, res) =>
  tasksRoutes(req, res)
);
app.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const pool = await dbPoolPromise;
    const { hoten, SoDienThoai, DiaChi } = req.body;
    await pool
      .request()
      .input("userId", req.user.id) // từ JWT
      .input("hoten", hoten || "")
      .input("soDienThoai", SoDienThoai || "")
      .input("diaChi", DiaChi || "")
      .query(
        `UPDATE Users SET HoTen = @hoten, SoDienThoai = @soDienThoai, DiaChi = @diaChi WHERE UserID = @userId`
      );
    res.json({ success: true, message: "Cập nhật thành công" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

// ===========================
// HTML ROUTES (SPA)
// ===========================
const sendFile = (file) => (req, res) =>
  res.sendFile(path.join(__dirname, "../frontend", file));

app.get("/login", sendFile("login.html"));
app.get("/register", sendFile("register.html"));
app.get(
  [
    "/",
    "/dashboard",
    "/home",
    "/work",
    "/salary",
    "/profile",
    "/calendar",
    "/settings",
  ],
  sendFile("index.html")
);

// Catch-all
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res
      .status(404)
      .json({ success: false, message: "API không tồn tại" });
  }
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ===========================
// KHỞI ĐỘNG
// ===========================
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
});
