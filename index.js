cat > index.js << 'ENDOFFILE'
require("dotenv").config();
const { startMonitor } = require("./src/monitor");
const { login, loadTokenCache } = require("./src/api");

async function main() {
  const token = process.env.ARO_TOKEN;
  const email = process.env.ARO_EMAIL;
  const cache = loadTokenCache();

  if (!token && !email && !cache) {
    console.log("\n  ❌ Konfigurasi tidak lengkap!");
    console.log("  Pastikan file .env sudah diisi dengan benar.");
    console.log("  Salin .env.example → .env lalu isi ARO_TOKEN atau ARO_EMAIL + ARO_PASSWORD\n");
    process.exit(1);
  }

  if (!cache && !token && email) {
    console.log("\n  🔐 Login ke ARO Network...");
    try {
      await login();
      console.log("  ✅ Login berhasil!\n");
    } catch (err) {
      console.error("  ❌ Login gagal:", err.message);
      process.exit(1);
    }
  }

  await startMonitor();
}

process.on("SIGINT", () => {
  console.log("\n\n  👋 Monitor dihentikan. Sampai jumpa!\n");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error("\n  ❌ Uncaught Error:", err.message);
});

main();
ENDOFFILE
