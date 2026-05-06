cat > src/notifier.js << 'ENDOFFILE'
const previousStatus = new Map();

function timestamp() {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function separator(char = "─", len = 50) {
  return char.repeat(len);
}

function notifyOffline(node) {
  const name = node.name || node.nodeId || "Unknown Node";
  console.log("\n" + separator("═"));
  console.log("  🔴 NODE OFFLINE TERDETEKSI!");
  console.log(separator());
  console.log(`  Node    : ${name}`);
  console.log(`  ID      : ${node.nodeId || "-"}`);
  console.log(`  Waktu   : ${timestamp()}`);
  console.log("  ⚠️  Segera periksa koneksi/node kamu!");
  console.log(separator("═") + "\n");
}

function notifyRecovery(node) {
  const name = node.name || node.nodeId || "Unknown Node";
  console.log("\n" + separator("═"));
  console.log("  🟢 NODE KEMBALI ONLINE!");
  console.log(separator());
  console.log(`  Node    : ${name}`);
  console.log(`  ID      : ${node.nodeId || "-"}`);
  console.log(`  Waktu   : ${timestamp()}`);
  console.log("  ✅ Node aktif kembali dan berjalan normal.");
  console.log(separator("═") + "\n");
}

function notifyDailySummary(profile, nodes, rewards) {
  console.log("\n" + separator("═"));
  console.log("  📊 RINGKASAN HARIAN ARO NETWORK");
  console.log(separator());
  console.log(`  Akun    : ${profile?.email || profile?.username || "-"}`);
  console.log(`  Waktu   : ${timestamp()}`);
  console.log(separator());
  const online = nodes.filter(n => n.status === "online").length;
  const offline = nodes.length - online;
  console.log(`  Total Node  : ${nodes.length}`);
  console.log(`  Online      : ${online}`);
  if (offline > 0) console.log(`  Offline     : ${offline}`);
  if (rewards) {
    const jade = rewards.jade || rewards.totalJade || rewards.balance || "-";
    const earned = rewards.todayEarned || rewards.dailyEarned || "-";
    console.log(separator());
    console.log(`  💎 Jade Balance   : ${jade}`);
    console.log(`  📈 Earned Hari Ini: ${earned}`);
  }
  console.log(separator("═") + "\n");
}

function checkNodeStatusChanges(nodes) {
  const notifyOfflineEnabled  = process.env.NOTIFY_ON_OFFLINE  !== "false";
  const notifyRecoveryEnabled = process.env.NOTIFY_ON_RECOVERY !== "false";
  for (const node of nodes) {
    const id = node.nodeId || node.id || node.name;
    const status = (node.status || "unknown").toLowerCase();
    const prev = previousStatus.get(id);
    if (prev === undefined) { previousStatus.set(id, status); continue; }
    if (prev === "online" && status !== "online" && notifyOfflineEnabled) notifyOffline(node);
    if (prev !== "online" && status === "online" && notifyRecoveryEnabled) notifyRecovery(node);
    previousStatus.set(id, status);
  }
}

module.exports = { notifyOffline, notifyRecovery, notifyDailySummary, checkNodeStatusChanges, timestamp, separator };
ENDOFFILE
