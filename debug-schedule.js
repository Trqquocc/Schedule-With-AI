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
    console.log("Connected!");

    const result = await pool.request().input("userId", sql.Int, 4008).query(`
        SELECT TOP 10 
          MaCongViec, TieuDe, 
          GioBatDauCoDinh,
          CAST(GioBatDauCoDinh AS DATE) as DateOnly,
          CAST(GETDATE() AS DATE) as TodayDate
        FROM CongViec 
        WHERE UserID = @userId 
        ORDER BY GioBatDauCoDinh DESC
      `);

    console.log("\n=== Records found:", result.recordset.length, "===\n");
    result.recordset.forEach((r, i) => {
      console.log(`${i + 1}. ${r.TieuDe}`);
      console.log(`   GioBatDauCoDinh: ${r.GioBatDauCoDinh}`);
      console.log(`   DateOnly: ${r.DateOnly}`);
      console.log(`   TodayDate: ${r.TodayDate}`);
      console.log("");
    });

    // Now test the actual query used in bot.js
    console.log("\n=== Testing bot.js query on CongViec ===\n");
    const testResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT TieuDe, MoTa, GioBatDauCoDinh
        FROM CongViec
        WHERE UserID = @userId 
          AND CAST(GioBatDauCoDinh AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY GioBatDauCoDinh
      `);

    console.log("Tasks for today (CongViec):", testResult.recordset.length);

    // Check LichTrinh table instead
    console.log("\n=== Checking LichTrinh table ===\n");
    const lichTrinhResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT TOP 10 
          lt.MaLichTrinh, lt.GioBatDau, lt.GioKetThuc,
          cv.TieuDe,
          CAST(lt.GioBatDau AS DATE) as DateOnly,
          CAST(GETDATE() AS DATE) as TodayDate
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId 
        ORDER BY lt.GioBatDau DESC
      `);

    console.log("LichTrinh records found:", lichTrinhResult.recordset.length);
    lichTrinhResult.recordset.forEach((r, i) => {
      console.log(`${i + 1}. ${r.TieuDe}`);
      console.log(`   GioBatDau: ${r.GioBatDau}`);
      console.log(`   DateOnly: ${r.DateOnly}`);
      console.log("");
    });

    // Test today's schedule from LichTrinh
    console.log("\n=== Testing today's schedule query on LichTrinh ===\n");
    const todayResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT cv.TieuDe, cv.MoTa, lt.GioBatDau
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId 
          AND CAST(lt.GioBatDau AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY lt.GioBatDau
      `);

    console.log("Today's schedule (LichTrinh):", todayResult.recordset.length);
    console.log(JSON.stringify(todayResult.recordset, null, 2));

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    console.error(e);
    process.exit(1);
  }
})();
