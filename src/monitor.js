cat > src/monitor.js << 'ENDOFFILE'
const cron = require("node-cron");
const api = require("./api");
const { checkNodeStatusChanges, notifyDailySummary, timestamp, separator } = require("./notifier");

function printNodeStatus(nodes) {
  console.log("\n  🖧  STATUS NODE");
  console.log(separator());
  if (!nodes || nodes.length === 0) {
    console.log("  Tidak ada node yang ditemukan.");
    return;
  }
  for (const node of nodes) {
    const name   = node.name || node.nodeId || "Unknown";
    const status = (node.status || "unknown").toLowerCase();
    const uptime = node.uptime || node.uptimeHours || "-";
    const type   = node.type || node.nodeType || "-";
    const nat    = node.natType || "-";
    const icon   = status === "online" ? "🟢" : "🔴";
    console.log(`  ${icon} ${name}`);
    console.log(`     Status  : ${status}`);
    console.log(`     Tipe    : ${type}`);
    console.log(`     Uptime  : ${uptime}`);
    console.log(`     NAT     : ${nat}`);
    console.log();
  }
}

function printRewards(rewards) {
  if (!rewards) return;
  const jade  = rewards.jade || rewards.totalJade || rewards.balance || "-";
  const today = rewards.todayEarned || rewards.dailyEarned || "-";
  const total = rewards.totalEarned || "-";
  console.log("  💎 REWARDS");
  console.log(separator());
  console.log(`  Jade Balance   : ${jade}`);
  console.log(`  Earned Hari Ini: ${today}`);
  console.log(`  Total Earned   : ${total}`);
  console.log();
}

async function runMonitorCycle(isFirst = false) {
  try {
    await api.ensureValidToken();
    const [nodes, rewards] = await Promise.all([
      api.getNodes().catch(() => null),
      api.getRewards().catch(() => null),
    ]);
    console.log("\n" + separator("═"));
    console.log(`  ARO NETWORK MONITOR  —  ${timestamp()}`);
    console.log(separator("═"));
    const nodeList = Array.isArray(nodes) ? nodes : nodes?.list || nodes?.nodes || [];
    printNodeStatus(nodeList);
    printRewards(rewards);
    checkNodeStatusChanges(nodeList);
    if (isFirst) console.log("  (Monitoring dimulai — perubahan status akan dinotifikasi)\n");
  } catch (err) {
    console.error("\n  ❌ Error pada siklus monitoring:", err.message);
  }
}

function scheduleDailySummary() {
  const enabled = process.env.NOTIFY_DAILY_SUMMARY !== "false";
  if (!enabled) return;
  const hour = parseInt(process.env.DAILY_SUMMARY_HOUR || "8", 10);
  cron.schedule(`0 ${hour} * * *`, async () => {
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
      console.error("❌ Gagal kirim daily summary:", err.message);
    }
  });
  console.log(`  📅 Daily summary dijadwalkan setiap hari jam ${hour}:00\n`);
}

async function startMonitor() {
  const intervalMin = parseInt(process.env.MONITOR_INTERVAL_MINUTES || "5", 10);
  console.log("  ╔══════════════════════════════════════════╗");
  console.log("  ║       ARO NETWORK NODE MONITOR           ║");
  console.log("  ╚══════════════════════════════════════════╝");
  console.log(`  Interval check : setiap ${intervalMin} menit`);
  console.log(`  API Base URL   : ${process.env.ARO_API_BASE || "https://api.aro.network"}`);
  scheduleDailySummary();
  await runMonitorCycle(true);
  cron.schedule(`*/${intervalMin} * * * *`, () => runMonitorCycle(false));
  console.log("  🕐 Monitor berjalan... (Ctrl+C untuk berhenti)\n");
}

module.exports = { startMonitor };
ENDOFFILE
