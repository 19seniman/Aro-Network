const chalk = require("chalk");

// Simpan status node sebelumnya untuk deteksi perubahan
const previousStatus = new Map();

// ─── Format Helpers ──────────────────────────────────────────────────────────
function timestamp() {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function separator(char = "─", len = 55) {
  return chalk.gray(char.repeat(len));
}

// ─── Notifikasi Console ──────────────────────────────────────────────────────
function notifyOffline(node) {
  const name = node.name || node.nodeId || "Unknown Node";
  console.log("\n" + separator("═"));
  console.log(chalk.red.bold("  🔴 NODE OFFLINE TERDETEKSI!"));
  console.log(separator());
  console.log(chalk.white(`  Node    : ${name}`));
  console.log(chalk.white(`  ID      : ${node.nodeId || "-"}`));
  console.log(chalk.white(`  Waktu   : ${timestamp()}`));
  console.log(chalk.yellow("  ⚠️  Segera periksa koneksi/node kamu!"));
  console.log(separator("═") + "\n");
}

function notifyRecovery(node) {
  const name = node.name || node.nodeId || "Unknown Node";
  console.log("\n" + separator("═"));
  console.log(chalk.green.bold("  🟢 NODE KEMBALI ONLINE!"));
  console.log(separator());
  console.log(chalk.white(`  Node    : ${name}`));
  console.log(chalk.white(`  ID      : ${node.nodeId || "-"}`));
  console.log(chalk.white(`  Waktu   : ${timestamp()}`));
  console.log(chalk.green("  ✅ Node aktif kembali dan berjalan normal."));
  console.log(separator("═") + "\n");
}

function notifyDailySummary(profile, nodes, rewards) {
  console.log("\n" + separator("═"));
  console.log(chalk.cyan.bold("  📊 RINGKASAN HARIAN ARO NETWORK"));
  console.log(separator());
  console.log(chalk.white(`  Akun    : ${profile?.email || profile?.username || "-"}`));
  console.log(chalk.white(`  Waktu   : ${timestamp()}`));
  console.log(separator());

  // Nodes summary
  const online  = nodes.filter(n => n.status === "online").length;
  const offline = nodes.length - online;
  console.log(chalk.white(`  Total Node  : ${nodes.length}`));
  console.log(chalk.green(`  Online      : ${online}`));
  if (offline > 0) {
    console.log(chalk.red(`  Offline     : ${offline}`));
  }

  // Rewards summary
  if (rewards) {
    const jade = rewards.jade || rewards.totalJade || rewards.balance || "-";
    const earned = rewards.todayEarned || rewards.dailyEarned || "-";
    console.log(separator());
    console.log(chalk.yellow(`  💎 Jade Balance  : ${jade}`));
    console.log(chalk.yellow(`  📈 Earned Hari Ini: ${earned}`));
  }

  console.log(separator("═") + "\n");
}

// ─── Cek Perubahan Status Node ────────────────────────────────────────────────
function checkNodeStatusChanges(nodes) {
  const notifyOfflineEnabled  = process.env.NOTIFY_ON_OFFLINE  !== "false";
  const notifyRecoveryEnabled = process.env.NOTIFY_ON_RECOVERY !== "false";

  for (const node of nodes) {
    const id     = node.nodeId || node.id || node.name;
    const status = (node.status || "unknown").toLowerCase();
    const prev   = previousStatus.get(id);

    // Node baru terdeteksi
    if (prev === undefined) {
      previousStatus.set(id, status);
      continue;
    }

    // Node berubah dari online → offline
    if (prev === "online" && status !== "online" && notifyOfflineEnabled) {
      notifyOffline(node);
    }

    // Node berubah dari offline → online
    if (prev !== "online" && status === "online" && notifyRecoveryEnabled) {
      notifyRecovery(node);
    }

    previousStatus.set(id, status);
  }
}

module.exports = {
  notifyOffline,
  notifyRecovery,
  notifyDailySummary,
  checkNodeStatusChanges,
  timestamp,
  separator,
};
