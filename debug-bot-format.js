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

    // Get all tasks with the same query as bot
    console.log("=== Tasks formatted like bot does ===\n");
    const tasksResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT cv.TieuDe, cv.MoTa, lt.GioBatDau
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId 
          AND CAST(lt.GioBatDau AS DATE) = CAST(GETDATE() AS DATE)
        ORDER BY lt.GioBatDau
      `);

    console.log(`Total tasks: ${tasksResult.recordset.length}\n`);

    tasksResult.recordset.forEach((task, index) => {
      const time = new Date(task.GioBatDau).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      console.log(`${index + 1}. ${time} - ${task.TieuDe}`);
      console.log(`   Raw GioBatDau: ${task.GioBatDau}`);
    });

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
