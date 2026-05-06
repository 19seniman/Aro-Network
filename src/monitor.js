var cron = require("node-cron");
var api = require("./api");
var notifier = require("./notifier");

function printNodes(nodes) {
  console.log("\n  STATUS NODE");
  console.log(notifier.sep("-"));
  if (!nodes || nodes.length === 0) {
    console.log("  Tidak ada node ditemukan.");
    return;
  }
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    var status = (n.status || "unknown").toLowerCase();
    var icon = status === "online" ? "[ON] " : "[OFF]";
    console.log(
      "  " + icon + " " + (n.name || n.nodeId || "Unknown") +
      " | Tipe: " + (n.type || "-") +
      " | Uptime: " + (n.uptime || "-") +
      " | NAT: " + (n.natType || "-")
    );
  }
  console.log("");
}

function printRewards(rewards) {
  if (!rewards) return;
  console.log("  REWARDS");
  console.log(notifier.sep("-"));
  console.log("  Jade Balance   : " + (rewards.jade || rewards.totalJade || rewards.balance || "-"));
  console.log("  Earned Hari Ini: " + (rewards.todayEarned || rewards.dailyEarned || "-"));
  console.log("  Total Earned   : " + (rewards.totalEarned || "-"));
  console.log("");
}

async function runCycle(isFirst) {
  try {
    await api.ensureValidToken();
    var results = await Promise.all([
      api.getNodes().catch(function() { return null; }),
      api.getRewards().catch(function() { return null; }),
    ]);
    var nodes = results[0];
    var rewards = results[1];

    console.log("\n" + notifier.sep("="));
    console.log("  ARO NETWORK MONITOR  -  " + notifier.ts());
    console.log(notifier.sep("="));

    var list = Array.isArray(nodes) ? nodes : (nodes && nodes.list) || (nodes && nodes.nodes) || [];
    printNodes(list);
    printRewards(rewards);
    notifier.checkNodeStatusChanges(list);

    if (isFirst) {
      console.log("  Monitoring aktif. Notifikasi akan muncul jika node berubah status.\n");
    }
  } catch (err) {
    console.error("  Error monitoring:", err.message);
  }
}

async function startMonitor() {
  var min = parseInt(process.env.MONITOR_INTERVAL_MINUTES || "5", 10);
  var hour = parseInt(process.env.DAILY_SUMMARY_HOUR || "8", 10);

  console.log("  +==================================+");
  console.log("  |   ARO NETWORK NODE MONITOR       |");
  console.log("  +==================================+");
  console.log("  Interval : setiap " + min + " menit");
  console.log("  API URL  : " + (process.env.ARO_API_BASE || "https://api.aro.network"));

  if (process.env.NOTIFY_DAILY_SUMMARY !== "false") {
    cron.schedule("0 " + hour + " * * *", async function() {
      try {
        await api.ensureValidToken();
        var p = await api.getProfile().catch(function() { return null; });
        var n = await api.getNodes().catch(function() { return null; });
        var r = await api.getRewards().catch(function() { return null; });
        var list = Array.isArray(n) ? n : (n && n.list) || [];
        notifier.notifyDailySummary(p, list, r);
      } catch (e) {
        console.error("Daily summary error:", e.message);
      }
    });
    console.log("  Daily summary jam " + hour + ":00 aktif.");
  }

  await runCycle(true);
  cron.schedule("*/" + min + " * * *", function() { runCycle(false); });
  console.log("  Monitor berjalan... (Ctrl+C untuk berhenti)\n");
}

module.exports = { startMonitor };
