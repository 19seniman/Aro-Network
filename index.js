require("dotenv").config();
const { startMonitor } = require("./src/monitor");
const { login, loadTokenCache } = require("./src/api");

async function main() {
  const token = process.env.ARO_TOKEN;
  const email = process.env.ARO_EMAIL;
  const cache = loadTokenCache();

  if (!token && !email && !cache) {
    console.log("Isi file .env dengan ARO_TOKEN atau ARO_EMAIL+ARO_PASSWORD");
    process.exit(1);
  }

  if (!cache && !token && email) {
    try {
      console.log("Login ke ARO Network...");
      await login();
      console.log("Login berhasil!");
    } catch (err) {
      console.error("Login gagal:", err.message);
      process.exit(1);
    }
  }

  await startMonitor();
}

process.on("SIGINT", () => { console.log("\nMonitor dihentikan."); process.exit(0); });
process.on("uncaughtException", (err) => { console.error("Error:", err.message); });
main();
