cat > src/api.js << 'ENDOFFILE'
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.ARO_API_BASE || "https://api.aro.network";
const TOKEN_CACHE_FILE = path.join(__dirname, "../.token_cache.json");

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
  return Date.now() >= cache.expiresAt - 5 * 60 * 1000;
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Origin: "https://dashboard.aro.network",
    Referer: "https://dashboard.aro.network/",
  },
});

client.interceptors.request.use((config) => {
  const cache = loadTokenCache();
  const token = cache?.token || process.env.ARO_TOKEN;
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

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

async function login() {
  const email = process.env.ARO_EMAIL;
  const password = process.env.ARO_PASSWORD;
  if (!email || !password) throw new Error("ARO_EMAIL dan ARO_PASSWORD harus diisi di .env");
  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password }, {
    headers: { "Content-Type": "application/json", Origin: "https://dashboard.aro.network" },
    timeout: 15000,
  });
  const data = res.data;
  const token = data?.token || data?.data?.token || data?.accessToken || data?.data?.accessToken;
  const expiresIn = data?.expiresIn || data?.data?.expiresIn || 3600;
  if (!token) throw new Error("Token tidak ditemukan dalam response login.");
  saveTokenCache({ token, email, expiresAt: Date.now() + expiresIn * 1000, refreshedAt: new Date().toISOString() });
  return token;
}

async function refreshToken() {
  try {
    const token = await login();
    console.log("✅ Token berhasil di-refresh.");
    return token;
  } catch (err) {
    console.error("❌ Gagal refresh token:", err.message);
    return null;
  }
}

async function ensureValidToken() {
  const cache = loadTokenCache();
  if (isTokenExpired(cache)) {
    console.log("🔄 Token expired — login ulang...");
    await login();
  }
}

async function getProfile() {
  const res = await client.get("/user/profile");
  return res.data?.data || res.data;
}

async function getNodes() {
  const res = await client.get("/node/list");
  return res.data?.data || res.data;
}

async function getRewards() {
  const res = await client.get("/reward/summary");
  return res.data?.data || res.data;
}

module.exports = { login, refreshToken, ensureValidToken, getProfile, getNodes, getRewards, loadTokenCache };
ENDOFFILE
