var axios = require("axios");
var fs = require("fs");
var path = require("path");

var BASE_URL = process.env.ARO_API_BASE || "https://api.aro.network";
var CACHE_FILE = path.join(__dirname, "../.token_cache.json");

function saveCache(data) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

function loadTokenCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch (e) {}
  return null;
}

function isExpired(cache) {
  if (!cache || !cache.expiresAt) return true;
  return Date.now() >= cache.expiresAt - 5 * 60 * 1000;
}

var client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: "https://dashboard.aro.network",
    Referer: "https://dashboard.aro.network/",
  },
});

client.interceptors.request.use(function(config) {
  var cache = loadTokenCache();
  var token = (cache && cache.token) || process.env.ARO_TOKEN;
  if (token) config.headers["Authorization"] = "Bearer " + token;
  return config;
});

client.interceptors.response.use(
  function(res) { return res; },
  async function(error) {
    var original = error.config;
    if (error.response && error.response.status === 401 && !original._retry) {
      original._retry = true;
      console.log("Token expired, refresh otomatis...");
      var t = await refreshToken();
      if (t) {
        original.headers["Authorization"] = "Bearer " + t;
        return client(original);
      }
    }
    return Promise.reject(error);
  }
);

async function login() {
  var email = process.env.ARO_EMAIL;
  var password = process.env.ARO_PASSWORD;
  if (!email || !password) {
    throw new Error("ARO_EMAIL dan ARO_PASSWORD harus diisi di .env");
  }
  var res = await axios.post(
    BASE_URL + "/auth/login",
    { email: email, password: password },
    {
      headers: {
        "Content-Type": "application/json",
        Origin: "https://dashboard.aro.network",
      },
      timeout: 15000,
    }
  );
  var data = res.data;
  var token =
    (data && data.token) ||
    (data && data.data && data.data.token) ||
    (data && data.accessToken) ||
    (data && data.data && data.data.accessToken);
  var expiresIn =
    (data && data.expiresIn) ||
    (data && data.data && data.data.expiresIn) ||
    3600;
  if (!token) throw new Error("Token tidak ditemukan dalam response.");
  saveCache({
    token: token,
    email: email,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshedAt: new Date().toISOString(),
  });
  return token;
}

async function refreshToken() {
  try {
    return await login();
  } catch (err) {
    console.error("Gagal refresh token:", err.message);
    return null;
  }
}

async function ensureValidToken() {
  if (isExpired(loadTokenCache())) {
    console.log("Token expired, login ulang...");
    await login();
  }
}

async function getProfile() {
  var r = await client.get("/user/profile");
  return (r.data && r.data.data) || r.data;
}

async function getNodes() {
  var r = await client.get("/node/list");
  return (r.data && r.data.data) || r.data;
}

async function getRewards() {
  var r = await client.get("/reward/summary");
  return (r.data && r.data.data) || r.data;
}

module.exports = {
  login: login,
  refreshToken: refreshToken,
  ensureValidToken: ensureValidToken,
  getProfile: getProfile,
  getNodes: getNodes,
  getRewards: getRewards,
  loadTokenCache: loadTokenCache,
};
