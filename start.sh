#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LuminaStage - One-Click Setup & Launch Script
# Resolves port conflicts automatically, installs dependencies, and starts the server.
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Default settings
DEFAULT_PORT=3000
PORT="${PORT:-$DEFAULT_PORT}"
MODE="dev" # 'dev' or 'prod'

# Parse optional arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    --prod|--production|--start)
      MODE="prod"
      shift
      ;;
    --dev)
      MODE="dev"
      shift
      ;;
    -h|--help)
      echo "Penggunaan: ./start.sh [OPSI]"
      echo ""
      echo "Opsi:"
      echo "  -p, --port <port>    Tentukan port server (default: 3000)"
      echo "  --dev                Jalankan dalam mode development dengan Fast Refresh (default)"
      echo "  --prod, --start      Build dan jalankan dalam mode production"
      echo "  -h, --help           Tampilkan panduan ini"
      exit 0
      ;;
    *)
      echo "Argumen tidak dikenal: $1"
      echo "Gunakan ./start.sh --help untuk panduan opsi."
      exit 1
      ;;
  esac
done

# Clean ANSI colors
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_CYAN="\033[36m"
CLR_GREEN="\033[32m"
CLR_AMBER="\033[33m"
CLR_MUTED="\033[90m"

echo ""
echo -e "${CLR_BOLD}${CLR_CYAN}✦ LUMINA STAGE - One-Click Setup & Launcher ✦${CLR_RESET}"
echo -e "${CLR_MUTED}Brand-Safe Product Staging & Multi-Channel Ad Studio${CLR_RESET}"
echo "────────────────────────────────────────────────────────────"

# 1. Pastikan file environment tersedia
if [ ! -f ".env.local" ] && [ -f ".env.example" ]; then
  echo -e "⚙️  ${CLR_AMBER}Menyiapkan .env.local dari .env.example...${CLR_RESET}"
  cp .env.example .env.local
  echo -e "✅ ${CLR_GREEN}.env.local siap (Default: MOCK_OFFLINE / Zero-Burn $0.00).${CLR_RESET}"
fi

# 2. Periksa apakah dependensi node_modules sudah terpasang
if [ ! -d "node_modules" ]; then
  echo -e "📦 ${CLR_AMBER}node_modules belum ditemukan. Menginstall dependensi (npm install)...${CLR_RESET}"
  npm install
  echo -e "✅ ${CLR_GREEN}Dependensi berhasil diinstall.${CLR_RESET}"
else
  echo -e "📦 ${CLR_GREEN}Dependensi node_modules terdeteksi.${CLR_RESET}"
fi

# 3. Port Conflict Resolution: Cek dan matikan proses jika port sudah digunakan
free_port() {
  local target_port="$1"
  local pids
  pids=$(lsof -ti :"$target_port" 2>/dev/null || true)

  if [ -n "$pids" ]; then
    echo -e "⚠️  ${CLR_AMBER}Port ${target_port} sedang digunakan oleh proses berikut:${CLR_RESET}"
    for pid in $pids; do
      local pinfo
      pinfo=$(ps -p "$pid" -o comm= 2>/dev/null || echo "process")
      echo -e "    ${CLR_MUTED}• PID $pid ($pinfo)${CLR_RESET}"
    done

    echo -e "🔄 ${CLR_AMBER}Mematikan proses pada port ${target_port} agar tidak terjadi tabrakan port...${CLR_RESET}"
    for pid in $pids; do
      kill -15 "$pid" 2>/dev/null || true
    done
    sleep 1

    # Cek kembali jika proses masih belum mati, lakukan force kill (SIGKILL)
    local pids_remaining
    pids_remaining=$(lsof -ti :"$target_port" 2>/dev/null || true)
    if [ -n "$pids_remaining" ]; then
      for pid in $pids_remaining; do
        kill -9 "$pid" 2>/dev/null || true
      done
      sleep 0.5
    fi

    echo -e "✅ ${CLR_GREEN}Port ${target_port} berhasil dibebaskan! Siap digunakan oleh LuminaStage.${CLR_RESET}"
  else
    echo -e "✅ ${CLR_GREEN}Port ${target_port} bersih dan siap digunakan.${CLR_RESET}"
  fi
}

free_port "$PORT"

# Clean shutdown handler saat user menekan Ctrl+C
cleanup() {
  echo ""
  echo -e "🛑 ${CLR_AMBER}Server LuminaStage dihentikan.${CLR_RESET}"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "────────────────────────────────────────────────────────────"
echo -e "🚀 Memulai server LuminaStage..."
echo -e "   • Local URL : ${CLR_BOLD}${CLR_CYAN}http://localhost:${PORT}${CLR_RESET}"
echo -e "   • Mode      : ${CLR_BOLD}${MODE}${CLR_RESET}"
echo -e "   • Status    : ${CLR_GREEN}Zero-Burn Active ($0.00 Spent)${CLR_RESET}"
echo -e "${CLR_MUTED}Tekan Ctrl + C kapan saja untuk menghentikan server.${CLR_RESET}"
echo "────────────────────────────────────────────────────────────"
echo ""

# 4. Jalankan server sesuai mode
if [ "$MODE" = "prod" ]; then
  if [ ! -d ".next" ]; then
    echo -e "🔨 ${CLR_AMBER}Building production bundle (.next)...${CLR_RESET}"
    npm run build
  fi
  exec npx next start -p "$PORT"
else
  exec npx next dev -p "$PORT"
fi
