const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.ARO_API_BASE || "https://api.aro.network";
const TOKEN_CACHE_FILE = path.join(__dirname, "../.token_cache.json");

// ─── Token Cache ────────────────────────────────────────────────────────────
function saveTokenCache(data) {
  fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(data, null, 2));
}

function loadTokenCache() {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, "utf-8"));
    }
  } catch (_) {}
  return null;
}

function isTokenExpired(cache) {
  if (!cache || !cache.expiresAt) return true;
  // Anggap expired 5 menit sebelum waktu sebenarnya (buffer)
  return Date.now() >= cache.expiresAt - 5 * 60 * 1000;
}

// ─── Axios Instance ──────────────────────────────────────────────────────────
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: "https://dashboard.aro.network",
    Referer: "https://dashboard.aro.network/",
    "User-Agent":
      "Mozilla/5.0 (ARO-Monitor-Bot/1.0)",
  },
});

// Inject token ke setiap request
client.interceptors.request.use((config) => {
  const cache = loadTokenCache();
  const token = cache?.token || process.env.ARO_TOKEN;
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh saat dapat 401
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      console.log("⚠️  Token expired — mencoba refresh otomatis...");
      const newToken = await refreshToken();
      if (newToken) {
        original.headers["Authorization"] = `Bearer ${newToken}`;
        return client(original);
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth Functions ──────────────────────────────────────────────────────────
async function login() {
  const email = process.env.ARO_EMAIL;
  const password = process.env.ARO_PASSWORD;

  if (!email || !password) {
    throw new Error("ARO_EMAIL dan ARO_PASSWORD harus diisi di file .env untuk auto-refresh.");
  }

  try {
    // Endpoint login — sesuaikan jika berbeda
    const res = await axios.post(
      `${BASE_URL}/auth/login`,
      { email, password },
      {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://dashboard.aro.network",
          Referer: "https://dashboard.aro.network/",
        },
        timeout: 15000,
      }
    );

    const data = res.data;
    // Ambil token dari berbagai kemungkinan struktur response
    const token =
      data?.token ||
      data?.data?.token ||
      data?.accessToken ||
      data?.data?.accessToken;

    const expiresIn = data?.expiresIn || data?.data?.expiresIn || 3600; // default 1 jam

    if (!token) {
      throw new Error("Token tidak ditemukan dalam response login.");
    }

    // Simpan ke cache
    saveTokenCache({
      token,
      email,
      expiresAt: Date.now() + expiresIn * 1000,
      refreshedAt: new Date().toISOString(),
    });

    return token;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Login gagal: ${msg}`);
  }
}

async function refreshToken() {
  try {
    // Coba endpoint refresh token dulu
    const cache = loadTokenCache();
    if (cache?.refreshToken) {
      const res = await axios.post(`${BASE_URL}/auth/refresh`, {
        refreshToken: cache.refreshToken,
      });
      const newToken = res.data?.token || res.data?.accessToken;
      if (newToken) {
        saveTokenCache({ ...cache, token: newToken, refreshedAt: new Date().toISOString() });
        console.log("✅ Token berhasil di-refresh via refresh token.");
        return newToken;
      }
    }
    // Fallback: login ulang
    const token = await login();
    console.log("✅ Token berhasil di-refresh via login ulang.");
    return token;
  } catch (err) {
    console.error("❌ Gagal refresh token:", err.message);
    return null;
  }
}

async function ensureValidToken() {
  const cache = loadTokenCache();
  if (isTokenExpired(cache)) {
    console.log("🔄 Token expired atau belum ada — login ulang...");
    await login();
  }
}

// ─── API Endpoints ───────────────────────────────────────────────────────────
async function getProfile() {
  const res = await client.get("/user/profile");
  return res.data?.data || res.data;
}

async function getNodes() {
  const res = await client.get("/node/list");
  return res.data?.data || res.data;
}

async function getNodeDetail(nodeId) {
  const res = await client.get(`/node/${nodeId}`);
  return res.data?.data || res.data;
}

async function getRewards() {
  const res = await client.get("/reward/summary");
  return res.data?.data || res.data;
}

async function getNetworkStats() {
  const res = await client.get("/network/stats");
  return res.data?.data || res.data;
}

module.exports = {
  login,
  refreshToken,
  ensureValidToken,
  getProfile,
  getNodes,
  getNodeDetail,
  getRewards,
  getNetworkStats,
  loadTokenCache,
};
