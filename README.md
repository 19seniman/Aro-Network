# ARO Network Node Monitor

Monitor node ARO kamu secara otomatis dengan fitur:
- ✅ Auto-refresh token (login ulang otomatis saat token expired)
- 🔔 Notifikasi saat node offline / kembali online
- 📊 Ringkasan harian rewards & status node
- 🔐 Kredensial aman tersimpan di file `.env`

---

## 📦 Instalasi

```bash
# 1. Install dependencies
npm install

# 2. Salin file konfigurasi
cp .env.example .env
```

---

## ⚙️ Konfigurasi `.env`

Edit file `.env` dan isi:

```env
# Token dari browser (opsional jika pakai email+password)
ARO_TOKEN=token_dari_browser

# Untuk auto-refresh token otomatis
ARO_EMAIL=email@kamu.com
ARO_PASSWORD=password_kamu

# Interval cek node (menit)
MONITOR_INTERVAL_MINUTES=5

# Jam kirim ringkasan harian (24 jam)
DAILY_SUMMARY_HOUR=8
```

### Cara ambil Token dari Browser:
1. Login di https://dashboard.aro.network
2. Tekan **F12** → tab **Network** → filter **Fetch/XHR**
3. Refresh halaman → klik salah satu request API
4. Tab **Headers** → cari `Authorization: Bearer xxxxx`
5. Copy token (tanpa kata "Bearer")

---

## 🚀 Menjalankan

```bash
# Mode normal
npm start

# Mode development (auto-restart saat file berubah) — Node.js 18+
npm run dev
```

---

## 📁 Struktur File

```
aro-monitor/
├── index.js          # Entry point utama
├── .env              # Konfigurasi (JANGAN di-commit ke git)
├── .env.example      # Template konfigurasi
├── .token_cache.json # Cache token (dibuat otomatis)
├── package.json
└── src/
    ├── api.js        # Client API + auto-refresh token
    ├── monitor.js    # Logika monitoring & scheduler
    └── notifier.js   # Notifikasi status node
```

---

## ⚠️ Catatan

- File `.env` dan `.token_cache.json` **jangan** di-upload ke GitHub
- Token browser biasanya berlaku beberapa jam — gunakan email+password untuk auto-refresh
- Endpoint API ARO bisa berubah saat masih fase Testnet — pantau docs resmi

---

## 🔒 Keamanan

Script ini hanya untuk akun milik kamu sendiri.
Jangan bagikan file `.env` atau token ke siapapun.
