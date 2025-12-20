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

    // Check ALL tasks (any time) for user 4008 today
    console.log("=== ALL tasks for user 4008 today (all times) ===\n");
    const allTodayResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT 
          lt.MaLichTrinh, lt.MaCongViec, lt.UserID, lt.GioBatDau, lt.NgayTao,
          cv.TieuDe
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId
          AND CAST(lt.GioBatDau AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY lt.GioBatDau
      `);

    console.log(`Total: ${allTodayResult.recordset.length}`);
    allTodayResult.recordset.forEach((r, i) => {
      const time = new Date(r.GioBatDau).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      console.log(`${i + 1}. ${time} - ${r.TieuDe} (Created: ${r.NgayTao})`);
    });

    // Check if there's a 6am task somewhere (different date or user)
    console.log("\n=== Looking for any 6:00-7:00 AM tasks ===\n");
    const sixResult = await pool.request().query(`
        SELECT TOP 10
          lt.MaLichTrinh, lt.MaCongViec, lt.UserID, lt.GioBatDau,
          cv.TieuDe
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE DATEPART(HOUR, DATEADD(HOUR, 7, lt.GioBatDau)) >= 6
          AND DATEPART(HOUR, DATEADD(HOUR, 7, lt.GioBatDau)) < 7
        ORDER BY lt.GioBatDau DESC
      `);

    if (sixResult.recordset.length > 0) {
      console.log(
        `Found ${sixResult.recordset.length} tasks in 6-7am (adjusting for UTC):`
      );
      sixResult.recordset.forEach((r) => {
        console.log(`UserID: ${r.UserID} - ${r.TieuDe} at ${r.GioBatDau}`);
      });
    } else {
      console.log("No tasks found in 6-7am range");
    }

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
