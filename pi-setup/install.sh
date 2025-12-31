#!/bin/bash
#############################################
# Bilardo Skorboard - Pi Kurulum Script
# Pi Zero 2 W için optimize edilmiştir
#############################################

echo "🎱 Bilardo Skorboard - Pi Kurulum Başlıyor..."

# Renk tanımları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Dizin oluştur
INSTALL_DIR="/home/pi/skorboard"
echo -e "${YELLOW}📁 Kurulum dizini: $INSTALL_DIR${NC}"

mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Eğer zip dosyası varsa aç
if [ -f "skorboard.zip" ]; then
    echo -e "${GREEN}📦 Dosyalar açılıyor...${NC}"
    unzip -o skorboard.zip
    rm skorboard.zip
fi

# Nginx kurulumu (hafif web server)
echo -e "${YELLOW}🌐 Nginx kurulumu...${NC}"
sudo apt update
sudo apt install -y nginx unclutter xdotool

# Nginx konfigürasyonu
echo -e "${YELLOW}⚙️ Nginx yapılandırılıyor...${NC}"
sudo tee /etc/nginx/sites-available/skorboard > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /home/pi/skorboard;
    index index.html;
    
    server_name _;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip sıkıştırma
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOF

# Nginx default siteyi devre dışı bırak, skorboard'u etkinleştir
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/skorboard /etc/nginx/sites-enabled/

# Nginx'i yeniden başlat
sudo systemctl enable nginx
sudo systemctl restart nginx

echo -e "${GREEN}✅ Web sunucusu hazır!${NC}"

# Kiosk script'i oluştur
echo -e "${YELLOW}🖥️ Kiosk modu yapılandırılıyor...${NC}"
cat > ~/kiosk.sh << 'EOF'
#!/bin/bash

# Ekran koruyucuyu kapat
xset s off
xset s noblank
xset -dpms

# Fare imlecini gizle
unclutter -idle 0.5 -root &

# Chromium hata pencerelerini temizle
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences 2>/dev/null
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null

# Ağ bağlantısı için bekle
sleep 5

# Chromium Kiosk modunda başlat (Lokal sunucu)
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --disable-translate \
  --no-first-run \
  --start-fullscreen \
  --incognito \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-gpu \
  --disable-software-rasterizer \
  --disable-dev-shm-usage \
  --memory-pressure-off \
  'http://localhost/?mode=scoreboard&table=table_1'
EOF

chmod +x ~/kiosk.sh

# Autostart yapılandırması
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/kiosk.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Skorboard Kiosk
Exec=/home/pi/kiosk.sh
EOF

# Watchdog script'i (Chromium crash recovery)
cat > ~/watchdog.sh << 'EOF'
#!/bin/bash
while true; do
  if ! pgrep -x "chromium-browse" > /dev/null; then
    echo "$(date): Chromium yeniden başlatılıyor..."
    /home/pi/kiosk.sh &
  fi
  sleep 30
done
EOF

chmod +x ~/watchdog.sh

cat > ~/.config/autostart/watchdog.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Chromium Watchdog
Exec=/home/pi/watchdog.sh
EOF

# Swap dosyası ayarla (512MB RAM için önemli)
echo -e "${YELLOW}💾 Swap yapılandırılıyor...${NC}"
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Gereksiz servisleri kapat
echo -e "${YELLOW}🔧 Gereksiz servisler kapatılıyor...${NC}"
sudo systemctl disable bluetooth 2>/dev/null
sudo systemctl disable cups 2>/dev/null
sudo systemctl disable avahi-daemon 2>/dev/null

# Ekran koruyucu ve güç yönetimi kapat
echo -e "${YELLOW}⚡ Güç ayarları yapılandırılıyor...${NC}"
if ! grep -q "consoleblank=0" /boot/cmdline.txt; then
    sudo sed -i '$ s/$/ consoleblank=0/' /boot/cmdline.txt
fi

# Boot config ayarları
echo -e "${YELLOW}📺 Ekran ayarları yapılandırılıyor...${NC}"
sudo tee -a /boot/config.txt > /dev/null << 'EOF'

# ===== Skorboard Ayarları =====
# GPU Memory (düşük tutarak RAM'e yer aç)
gpu_mem=64

# HDMI ayarları
hdmi_force_hotplug=1
disable_overscan=1

# Watchdog
dtparam=watchdog=on
EOF

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ KURULUM TAMAMLANDI!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "📍 Skorboard: ${YELLOW}http://localhost${NC}"
echo -e "📍 Ağdan erişim: ${YELLOW}http://$(hostname -I | awk '{print $1}')${NC}"
echo ""
echo -e "${YELLOW}⚠️ Değişikliklerin aktif olması için yeniden başlatın:${NC}"
echo -e "   ${GREEN}sudo reboot${NC}"
echo ""
