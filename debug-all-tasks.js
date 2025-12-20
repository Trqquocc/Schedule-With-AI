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

    // Check the 6am task for user 4008 today
    console.log("=== Checking 6am task for user 4008 today ===\n");
    const sixAmResult = await pool.request().input("userId", sql.Int, 4008)
      .query(`
        SELECT 
          lt.MaLichTrinh, lt.MaCongViec, lt.UserID, lt.GioBatDau,
          cv.TieuDe, cv.MoTa
        FROM LichTrinh lt
        LEFT JOIN CongViec cv ON lt.MaCongViec = cv.MaCongViec
        WHERE lt.UserID = @userId
          AND lt.GioBatDau IS NOT NULL
        ORDER BY lt.GioBatDau
      `);

    console.log(`Total tasks for user 4008: ${sixAmResult.recordset.length}`);
    sixAmResult.recordset.forEach((r, i) => {
      const time = new Date(r.GioBatDau).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const date = new Date(r.GioBatDau).toLocaleDateString("vi-VN");
      console.log(`${i + 1}. ${date} ${time} - ${r.TieuDe}`);
    });

    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
})();
