const sql = require("mssql");
const config = {
  server: "localhost",
  database: "LoginDB",
  authentication: {
    type: "default",
    options: { userName: "sa", password: "0Quenmatkhau" },
  },
  options: { encrypt: true, trustServerCertificate: true },
};

(async () => {
  try {
    console.log("Connecting to database...");
    const pool = await sql.connect(config);
    console.log("Connected!\n");

    // Kiểm tra tất cả công việc hôm nay của user 4008
    console.log("=== All LichTrinh records for user 4008 today ===\n");
    const allResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT 
          lt.MaLichTrinh, lt.MaCongViec, lt.UserID, lt.GioBatDau,
          cv.TieuDe, cv.MoTa
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId
          AND CAST(lt.GioBatDau AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY lt.GioBatDau
      `);

    console.log("Total records:", allResult.recordset.length);
    allResult.recordset.forEach((r, i) => {
      console.log(
        `${i + 1}. ${r.TieuDe || "NULL"} - UserID: ${r.UserID}, MaCongViec: ${
          r.MaCongViec
        }`
      );
      console.log(`   GioBatDau: ${r.GioBatDau}`);
    });

    // Kiểm tra các công việc được tạo gần đây
    console.log("\n=== Recent LichTrinh records (last 10) ===\n");
    const recentResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT TOP 10
          lt.MaLichTrinh, lt.MaCongViec, lt.UserID, lt.GioBatDau, lt.NgayTao,
          cv.TieuDe, cv.MoTa
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId
        ORDER BY lt.NgayTao DESC
      `);

    console.log("Recent records:", recentResult.recordset.length);
    recentResult.recordset.forEach((r, i) => {
      console.log(`${i + 1}. ${r.TieuDe || "NULL"} - Created: ${r.NgayTao}`);
      console.log(`   GioBatDau: ${r.GioBatDau}`);
    });

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
