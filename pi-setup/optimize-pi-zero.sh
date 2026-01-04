#!/bin/bash
# Pi Zero 2 W Optimization Script
# AntiGravity Agent

echo "🍓 Pi Zero 2 W Optimizasyonu Başlıyor..."

# 1. Swap'i 2048 MB Yap
echo "🔧 Swap alanı 2GB'a yükseltiliyor..."
sudo dphys-swapfile swapoff
# Eğer CONF_SWAPSIZE varsa değiştir, yoksa ekle
if grep -q "^CONF_SWAPSIZE=" /etc/dphys-swapfile; then
  sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
else
  echo "CONF_SWAPSIZE=2048" | sudo tee -a /etc/dphys-swapfile
fi
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
echo "✅ Swap tamam."

# 2. GPU Memory 64 MB Yap
echo "🔧 GPU Memory 64MB'a düşürülüyor..."
if grep -q "^gpu_mem=" /boot/config.txt; then
  sudo sed -i 's/^gpu_mem=.*/gpu_mem=64/' /boot/config.txt
else
  echo "gpu_mem=64" | sudo tee -a /boot/config.txt
fi
echo "✅ GPU Memory tamam."

# 3. Kiosk Script Güncelleme ve Chromium Optimizasyonu
echo "🔧 Kiosk script güncelleniyor..."
cat << 'EOF' > /home/pi/kiosk.sh
#!/bin/bash
xset s off
xset s noblank
xset -dpms
unclutter -idle 0.5 -root &
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences
sleep 10
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-dev-shm-usage \
  --no-sandbox \
  --disable-gpu-compositing \
  --disk-cache-size=1 \
  --media-cache-size=1 \
  --disable-software-rasterizer \
  --check-for-update-interval=31536000 \
  'https://bilardo-skor.web.app/?mode=scoreboard&table=table_1'
EOF
chmod +x /home/pi/kiosk.sh
echo "✅ Kiosk script güncellendi."

echo "🎉 İşlem tamamlandı! 5 saniye sonra Pi yeniden başlatılacak..."
sleep 5
sudo reboot
