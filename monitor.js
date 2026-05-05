const cron = require("node-cron");
const chalk = require("chalk");
const api = require("./api");
const { checkNodeStatusChanges, notifyDailySummary, timestamp, separator } = require("./notifier");

// ─── Tampilkan Status Node ───────────────────────────────────────────────────
function printNodeStatus(nodes) {
  console.log(chalk.bold("\n  🖧  STATUS NODE"));
  console.log(separator());

  if (!nodes || nodes.length === 0) {
    console.log(chalk.gray("  Tidak ada node yang ditemukan."));
    return;
  }

  for (const node of nodes) {
    const name   = node.name || node.nodeId || "Unknown";
    const status = (node.status || "unknown").toLowerCase();
    const uptime = node.uptime || node.uptimeHours || "-";
    const type   = node.type || node.nodeType || "-";
    const nat    = node.natType || "-";

    const icon   = status === "online" ? chalk.green("🟢") : chalk.red("🔴");
    const sLabel = status === "online"
      ? chalk.green("online")
      : chalk.red(status);

    console.log(`  ${icon} ${chalk.white.bold(name)}`);
    console.log(chalk.gray(`     Status  : `) + sLabel);
    console.log(chalk.gray(`     Tipe    : `) + chalk.white(type));
    console.log(chalk.gray(`     Uptime  : `) + chalk.white(uptime));
    console.log(chalk.gray(`     NAT     : `) + chalk.white(nat));
    console.log();
  }
}

// ─── Tampilkan Rewards ───────────────────────────────────────────────────────
function printRewards(rewards) {
  if (!rewards) return;

  const jade    = rewards.jade || rewards.totalJade || rewards.balance || "-";
  const today   = rewards.todayEarned || rewards.dailyEarned || "-";
  const total   = rewards.totalEarned || "-";

  console.log(chalk.bold("  💎 REWARDS"));
  console.log(separator());
  console.log(chalk.gray("  Jade Balance   : ") + chalk.yellow.bold(jade));
  console.log(chalk.gray("  Earned Hari Ini: ") + chalk.yellow(today));
  console.log(chalk.gray("  Total Earned   : ") + chalk.yellow(total));
  console.log();
}

// ─── Satu Siklus Monitoring ──────────────────────────────────────────────────
async function runMonitorCycle(isFirst = false) {
  try {
    // Pastikan token valid, refresh jika perlu
    await api.ensureValidToken();

    const [nodes, rewards] = await Promise.all([
      api.getNodes().catch(() => null),
      api.getRewards().catch(() => null),
    ]);

    // Header
    console.log("\n" + separator("═"));
    console.log(chalk.cyan.bold("  ARO NETWORK MONITOR") + chalk.gray("  —  " + timestamp()));
    console.log(separator("═"));

    // Status node
    const nodeList = Array.isArray(nodes) ? nodes : nodes?.list || nodes?.nodes || [];
    printNodeStatus(nodeList);
    printRewards(rewards);

    // Cek perubahan status (kirim notifikasi jika ada perubahan)
    if (!isFirst) {
      checkNodeStatusChanges(nodeList);
    } else {
      // Siklus pertama: inisialisasi state tanpa notifikasi
      checkNodeStatusChanges(nodeList);
      console.log(chalk.gray("  (Monitoring dimulai — perubahan status akan dinotifikasi)\n"));
    }

  } catch (err) {
    console.error(chalk.red("\n  ❌ Error pada siklus monitoring:"), err.message);
  }
}

// ─── Jadwalkan Daily Summary ─────────────────────────────────────────────────
function scheduleDailySummary() {
  const enabled = process.env.NOTIFY_DAILY_SUMMARY !== "false";
  if (!enabled) return;

  const hour = parseInt(process.env.DAILY_SUMMARY_HOUR || "8", 10);
  const cronExpr = `0 ${hour} * * *`; // Setiap hari jam XX:00

  cron.schedule(cronExpr, async () => {
    try {
      await api.ensureValidToken();
      const [profile, nodes, rewards] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getNodes().catch(() => null),
        api.getRewards().catch(() => null),
      ]);
      const nodeList = Array.isArray(nodes) ? nodes : nodes?.list || nodes?.nodes || [];
      notifyDailySummary(profile, nodeList, rewards);
    } catch (err) {
      console.error(chalk.red("❌ Gagal kirim daily summary:"), err.message);
    }
  });

  console.log(chalk.gray(`  📅 Daily summary dijadwalkan setiap hari jam ${hour}:00\n`));
}

// ─── Start Monitor ───────────────────────────────────────────────────────────
async function startMonitor() {
  const intervalMin = parseInt(process.env.MONITOR_INTERVAL_MINUTES || "5", 10);
  const cronExpr    = `*/${intervalMin} * * * *`;

  console.log(chalk.cyan.bold("\n  ╔══════════════════════════════════════════╗"));
  console.log(chalk.cyan.bold("  ║       ARO NETWORK NODE MONITOR           ║"));
  console.log(chalk.cyan.bold("  ╚══════════════════════════════════════════╝"));
  console.log(chalk.gray(`  Interval check : setiap ${intervalMin} menit`));
  console.log(chalk.gray(`  API Base URL   : ${process.env.ARO_API_BASE || "https://api.aro.network"}`));

  // Jadwalkan daily summary
  scheduleDailySummary();

  // Jalankan langsung di awal
  await runMonitorCycle(true);

  // Jadwalkan monitoring berkala
  cron.schedule(cronExpr, () => runMonitorCycle(false));
  console.log(chalk.gray(`\n  🕐 Monitor berjalan... (Ctrl+C untuk berhenti)\n`));
}

module.exports = { startMonitor };
