require("dotenv").config();
const chalk = require("chalk");
const { startMonitor } = require("./src/monitor");
const { login, loadTokenCache } = require("./src/api");

async function main() {
  // Validasi konfigurasi awal
  const token = process.env.ARO_TOKEN;
  const email = process.env.ARO_EMAIL;
  const cache = loadTokenCache();

  if (!token && !email && !cache) {
    console.log(chalk.red("\n  ❌ Konfigurasi tidak lengkap!"));
    console.log(chalk.yellow("  Pastikan file .env sudah diisi dengan benar."));
    console.log(chalk.gray("  Salin .env.example → .env lalu isi ARO_TOKEN atau ARO_EMAIL + ARO_PASSWORD\n"));
    process.exit(1);
  }

  // Jika ada email+password tapi belum ada token cache, login dulu
  if (!cache && !token && email) {
    console.log(chalk.cyan("\n  🔐 Login ke ARO Network..."));
    try {
      await login();
      console.log(chalk.green("  ✅ Login berhasil!\n"));
    } catch (err) {
      console.error(chalk.red("  ❌ Login gagal:"), err.message);
      process.exit(1);
    }
  }

  // Mulai monitoring
  await startMonitor();
}

// Handle exit
process.on("SIGINT", () => {
  console.log(chalk.cyan("\n\n  👋 Monitor dihentikan. Sampai jumpa!\n"));
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  console.error(chalk.red("\n  ❌ Uncaught Error:"), err.message);
});

main();
