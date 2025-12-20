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

    // Check all tasks for user 4008 today with detailed time info
    console.log(
      "=== ALL LichTrinh records for user 4008 today (with times) ===\n"
    );
    const allResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT 
          lt.MaLichTrinh, lt.MaCongViec, lt.UserID, lt.GioBatDau,
          cv.TieuDe, cv.MoTa,
          CAST(lt.GioBatDau AS TIME) as TimeOnly,
          DATEPART(HOUR, lt.GioBatDau) as Hour
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId
          AND CAST(lt.GioBatDau AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY lt.GioBatDau
      `);

    console.log("Total records:", allResult.recordset.length);
    allResult.recordset.forEach((r, i) => {
      console.log(
        `${i + 1}. ${r.TieuDe || "NULL"} - Hour: ${r.Hour} - Time: ${
          r.TimeOnly
        }`
      );
      console.log(`   GioBatDau: ${r.GioBatDau}`);
    });

    // Check specifically for 6-7am range
    console.log("\n=== Tasks between 6:00 - 7:00 AM ===\n");
    const earlyResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT 
          lt.MaLichTrinh, lt.MaCongViec, lt.UserID, lt.GioBatDau,
          cv.TieuDe, cv.MoTa,
          CAST(lt.GioBatDau AS TIME) as TimeOnly,
          DATEPART(HOUR, lt.GioBatDau) as Hour
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId
          AND CAST(lt.GioBatDau AS DATE) = CAST(GETDATE() AS DATE)
          AND DATEPART(HOUR, lt.GioBatDau) >= 6
          AND DATEPART(HOUR, lt.GioBatDau) < 7
        ORDER BY lt.GioBatDau
      `);

    console.log("6-7am records:", earlyResult.recordset.length);
    if (earlyResult.recordset.length > 0) {
      earlyResult.recordset.forEach((r, i) => {
        console.log(`${i + 1}. ${r.TieuDe || "NULL"} - Time: ${r.TimeOnly}`);
        console.log(`   GioBatDau: ${r.GioBatDau}`);
      });
    } else {
      console.log("No tasks found in 6-7am range");
    }

    // Check all hours
    console.log("\n=== Task count by hour ===\n");
    const hourResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT 
          DATEPART(HOUR, lt.GioBatDau) as Hour,
          COUNT(*) as TaskCount
        FROM LichTrinh lt
        WHERE lt.UserID = @userId
          AND CAST(lt.GioBatDau AS DATE) = CAST(GETDATE() AS DATE)
        GROUP BY DATEPART(HOUR, lt.GioBatDau)
        ORDER BY Hour
      `);

    hourResult.recordset.forEach((r) => {
      console.log(
        `${String(r.Hour).padStart(2, "0")}:00 - ${r.TaskCount} task(s)`
      );
    });

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
