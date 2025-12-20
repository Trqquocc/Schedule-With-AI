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

    // Check current date from database
    console.log("=== Server date/time info ===\n");
    const dateResult = await pool.request().query(`
      SELECT 
        CAST(GETDATE() AS DATE) as ServerDate,
        GETDATE() as ServerDateTime,
        CAST(GETDATE() AS TIME) as ServerTime
    `);

    console.log("Server date:", dateResult.recordset[0]);
    console.log("Local JS date:", new Date());

    // Now test the actual query used by bot
    console.log("\n=== Testing bot's exact query ===\n");
    const botQueryResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT 
          cv.TieuDe, 
          cv.MoTa, 
          lt.GioBatDau,
          CAST(lt.GioBatDau AS DATE) as TaskDate,
          CAST(GETDATE() AS DATE) as ServerDate
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId 
          AND CAST(lt.GioBatDau AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY lt.GioBatDau
      `);

    console.log(`Bot query returns: ${botQueryResult.recordset.length} tasks`);
    botQueryResult.recordset.forEach((r, i) => {
      const time = new Date(r.GioBatDau).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      console.log(`${i + 1}. ${time} - ${r.TieuDe}`);
    });

    // Check the 6am task specifically
    console.log("\n=== Checking 6am task directly ===\n");
    const sixAmResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT 
          lt.MaLichTrinh,
          lt.GioBatDau,
          CAST(lt.GioBatDau AS DATE) as TaskDate,
          CAST(GETDATE() AS DATE) as ServerDate
        FROM LichTrinh lt
        WHERE lt.UserID = @userId
          AND CAST(lt.GioBatDau AS TIME) = '06:00:00'
      `);

    console.log(`Found ${sixAmResult.recordset.length} 6am tasks`);
    sixAmResult.recordset.forEach((r) => {
      console.log(`GioBatDau: ${r.GioBatDau}`);
      console.log(`TaskDate: ${r.TaskDate}`);
      console.log(`ServerDate: ${r.ServerDate}`);
    });

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
