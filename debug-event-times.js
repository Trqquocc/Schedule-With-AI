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

    // Check recent events for user 4008 with their start and end times
    console.log("=== Recent events for user 4008 with times ===\n");
    const result = await pool.request().input("userId", sql.Int, 4008).query(`
        SELECT TOP 10
          lt.MaLichTrinh,
          lt.TieuDe,
          lt.GioBatDau,
          lt.GioKetThuc,
          DATEDIFF(MINUTE, lt.GioBatDau, lt.GioKetThuc) as DurationMinutes,
          lt.NgayTao,
          cv.ThoiGianUocTinh
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId
        ORDER BY lt.NgayTao DESC
      `);

    console.log(`Found ${result.recordset.length} recent events:\n`);
    result.recordset.forEach((r, i) => {
      const startTime = r.GioBatDau
        ? new Date(r.GioBatDau).toLocaleString("vi-VN")
        : "NULL";
      const endTime = r.GioKetThuc
        ? new Date(r.GioKetThuc).toLocaleString("vi-VN")
        : "NULL";
      const duration =
        r.DurationMinutes !== null ? `${r.DurationMinutes}min` : "NULL";

      console.log(`${i + 1}. ${r.TieuDe}`);
      console.log(`   Start: ${startTime}`);
      console.log(`   End:   ${endTime}`);
      console.log(
        `   Duration: ${duration} (Ước tính: ${r.ThoiGianUocTinh}min)`
      );
      console.log(`   Created: ${r.NgayTao}`);
      console.log();
    });

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
