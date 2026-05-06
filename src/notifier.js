var prevStatus = {};

function sep(c, n) {
  c = c || "-";
  n = n || 50;
  var s = "";
  for (var i = 0; i < n; i++) s += c;
  return s;
}

function ts() {
  return new Date().toLocaleString("id-ID");
}

function notifyOffline(node) {
  var name = node.name || node.nodeId || "Unknown";
  console.log("\n" + sep("="));
  console.log("  [ALERT] NODE OFFLINE: " + name);
  console.log("  ID    : " + (node.nodeId || "-"));
  console.log("  Waktu : " + ts());
  console.log("  Segera periksa koneksi node kamu!");
  console.log(sep("=") + "\n");
}

function notifyRecovery(node) {
  var name = node.name || node.nodeId || "Unknown";
  console.log("\n" + sep("="));
  console.log("  [OK] NODE ONLINE KEMBALI: " + name);
  console.log("  ID    : " + (node.nodeId || "-"));
  console.log("  Waktu : " + ts());
  console.log(sep("=") + "\n");
}

function notifyDailySummary(profile, nodes, rewards) {
  var online = nodes.filter(function(n) { return n.status === "online"; }).length;
  console.log("\n" + sep("="));
  console.log("  RINGKASAN HARIAN ARO NETWORK");
  console.log("  Akun   : " + ((profile && profile.email) || "-"));
  console.log("  Waktu  : " + ts());
  console.log(sep("-"));
  console.log("  Total  : " + nodes.length + " | Online: " + online + " | Offline: " + (nodes.length - online));
  if (rewards) {
    console.log("  Jade   : " + (rewards.jade || rewards.totalJade || rewards.balance || "-"));
    console.log("  Hari ini: " + (rewards.todayEarned || rewards.dailyEarned || "-"));
  }
  console.log(sep("=") + "\n");
}

function checkNodeStatusChanges(nodes) {
  var offEn = process.env.NOTIFY_ON_OFFLINE !== "false";
  var recEn = process.env.NOTIFY_ON_RECOVERY !== "false";
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var id = node.nodeId || node.id || node.name;
    var status = (node.status || "unknown").toLowerCase();
    var p = prevStatus[id];
    if (p === undefined) { prevStatus[id] = status; continue; }
    if (p === "online" && status !== "online" && offEn) notifyOffline(node);
    if (p !== "online" && status === "online" && recEn) notifyRecovery(node);
    prevStatus[id] = status;
  }
}

module.exports = {
  notifyOffline,
  notifyRecovery,
  notifyDailySummary,
  checkNodeStatusChanges,
  sep,
  ts,
};
