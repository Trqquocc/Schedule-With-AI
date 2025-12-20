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

    // Get raw GioBatDau values for user 4008
    console.log("=== Raw GioBatDau values for user 4008 ===\n");
    const rawResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT TOP 20
          lt.MaLichTrinh,
          lt.GioBatDau,
          CONVERT(VARCHAR(50), lt.GioBatDau, 121) as GioBatDauStr,
          DATALENGTH(lt.GioBatDau) as DataLength,
          CAST(lt.GioBatDau AS DATE) as DatePart,
          CAST(lt.GioBatDau AS TIME) as TimePart
        FROM LichTrinh lt
        WHERE lt.UserID = @userId
        ORDER BY lt.GioBatDau
      `);

    console.log(`Found ${rawResult.recordset.length} tasks:`);
    rawResult.recordset.forEach((r, i) => {
      console.log(`\n${i + 1}. MaLichTrinh: ${r.MaLichTrinh}`);
      console.log(`   GioBatDau: ${r.GioBatDau}`);
      console.log(`   GioBatDauStr: ${r.GioBatDauStr}`);
      console.log(`   DatePart: ${r.DatePart}`);
      console.log(`   TimePart: ${r.TimePart}`);
    });

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
