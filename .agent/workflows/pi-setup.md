---
description: Raspberry Pi Skorboard Kurulum Rehberi
---

# 🍓 Raspberry Pi Skorboard Kurulum Rehberi

Bu rehber, Bilardo Skorboard uygulamasını Raspberry Pi üzerinde kiosk modunda çalıştırmak için tüm adımları içerir.

---

## 🎯 Pi Zero 2 W Özel Bölüm

> ⚠️ **Pi Zero 2 W kullanıyorsanız bu bölümü mutlaka okuyun!**

### Pi Zero 2 W Kısıtlamaları

| Özellik | Değer | Etki |
|---------|-------|------|
| RAM | 512MB | Chromium için sınırlı |
| WiFi | 2.4GHz only | 5GHz ağlar desteklenmiyor |
| HDMI | Mini HDMI | Adaptör gerekli |
| USB | 1x Micro USB OTG | Hub veya adaptör gerekli |

### Gerekli Ek Donanım (Pi Zero 2 W için)

- **Mini HDMI → HDMI adaptör** veya kablo
- **Micro USB OTG adaptör** (klavye/keypad için)
- **USB Hub** (birden fazla USB cihaz için)
- Güç için ayrı Micro USB kablosu

### Pi Zero 2 W Özel Optimizasyonlar

Bu rehberdeki adımları takip ederken, Pi Zero 2 W kullanıyorsanız şu ek ayarları da yapın:

#### 1. Hafif Tarayıcı Alternatifi (Önerilen)
Chromium yerine daha hafif bir tarayıcı kullanabilirsiniz:
```bash
# Midori tarayıcı (daha hafif)
sudo apt install midori -y

# Kiosk script'inde Chromium yerine:
midori -e Fullscreen -a 'https://bilardo-skor.web.app/?mode=scoreboard&table=table_1'
```

#### 2. Swap Dosyası Zorunlu (512MB RAM için)
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=1024 (1GB swap)
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### 3. GPU Memory Düşük Tut
```bash
sudo nano /boot/config.txt
# gpu_mem=64 (128 yerine 64, daha fazla RAM için)
```

#### 4. Desktop Ortamı Yerine Minimal Başlatma
```bash
sudo raspi-config
# System Options → Boot → Console Autologin
# (Desktop yerine console, sonra X manuel başlatılır)
```

Minimal X başlatma script'i:
```bash
nano ~/.xinitrc
```
```bash
#!/bin/bash
xset s off
xset s noblank
xset -dpms
unclutter -idle 0.5 -root &
exec chromium-browser --kiosk 'https://bilardo-skor.web.app/?mode=scoreboard&table=table_1'
```

```bash
# Otomatik başlatma için ~/.bash_profile'a ekle:
echo 'startx' >> ~/.bash_profile
```

#### 5. Gereksiz Servisleri Tamamen Kapat
```bash
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
sudo systemctl disable cups
sudo systemctl disable triggerhappy
sudo systemctl disable hciuart
```

#### 6. Chromium Ekstra Optimizasyonları
```bash
chromium-browser \
  --kiosk \
  --disable-gpu \
  --disable-software-rasterizer \
  --disable-dev-shm-usage \
  --no-sandbox \
  --disable-extensions \
  --disable-plugins \
  --memory-pressure-off \
  'https://bilardo-skor.web.app/?mode=scoreboard&table=table_1'
```

---

## 📦 Gerekli Donanım

| Bileşen | Önerilen | Minimum |
|---------|----------|---------|
| Raspberry Pi | Pi 4 (4GB RAM) | Pi 3B+ |
| MicroSD Kart | 32GB Class 10 | 16GB Class 10 |
| Güç Adaptörü | 5V 3A USB-C | 5V 2.5A |
| HDMI Kablosu | Micro HDMI (Pi4) / Mini HDMI (Pi3) | - |
| Ağ Bağlantısı | Ethernet | WiFi |
| (Opsiyonel) | USB Keypad/Kumanda | - |

---

## 🔧 AŞAMA 1: Raspberry Pi OS Kurulumu

### 1.1 Raspberry Pi Imager İndir
```bash
# Windows/Mac/Linux için:
# https://www.raspberrypi.com/software/
```

### 1.2 OS Seçimi ve Yazma
1. Raspberry Pi Imager'ı aç
2. **OS Seç** → Raspberry Pi OS (64-bit) - Desktop versiyonu
3. **Storage** → MicroSD kartını seç
4. **Ayarlar** (⚙️ ikonu):
   - SSH: Etkinleştir
   - Kullanıcı adı: `pi`
   - Şifre: `skorboard` (veya kendin belirle)
   - WiFi: SSID ve şifre gir
   - Locale: Europe/Istanbul, TR klavye
5. **Write** butonuna tıkla

### 1.3 İlk Boot
1. MicroSD'yi Pi'ye tak
2. HDMI ve güç kablosunu bağla
3. İlk açılışta otomatik kurulum tamamlanır (3-5 dakika)

---

## 🔧 AŞAMA 2: Temel Sistem Konfigürasyonu

### 2.1 SSH ile Bağlanma (Opsiyonel)
```bash
# Pi'nin IP adresini bul (router'dan veya ekrandan)
ssh pi@<PI_IP_ADRESI>
# Şifre: skorboard
```

### 2.2 Sistem Güncellemesi
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

### 2.3 Chromium Kiosk Modu için Paketler
```bash
# Unclutter: Fare imlecini gizler
sudo apt install -y unclutter

# xdotool: Klavye/mouse simülasyonu
sudo apt install -y xdotool

# Ekran koruyucuyu devre dışı bırak
sudo apt install -y x11-xserver-utils
```

---

## 🔧 AŞAMA 3: Kiosk Modu Konfigürasyonu

### 3.1 Autostart Dosyası Oluştur
```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/kiosk.desktop
```

**Dosya içeriği:**
```ini
[Desktop Entry]
Type=Application
Name=Skorboard Kiosk
Exec=/home/pi/kiosk.sh
```

### 3.2 Kiosk Script Oluştur
```bash
nano ~/kiosk.sh
```

**Script içeriği:**
```bash
#!/bin/bash

# Ekran koruyucuyu kapat
xset s off
xset s noblank
xset -dpms

# Fare imlecini gizle
unclutter -idle 0.5 -root &

# Chromium hata pencerelerini kapat (önceki oturum hatası varsa)
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences

# Birkaç saniye bekle (ağ bağlantısı için)
sleep 10

# Chromium Kiosk modunda başlat
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
  --check-for-update-interval=31536000 \
  'https://bilardo-skor.web.app/?mode=scoreboard&table=table_1'
```

### 3.3 Script'i Çalıştırılabilir Yap
```bash
chmod +x ~/kiosk.sh
```

---

## 🔧 AŞAMA 4: Ekran ve Görüntü Ayarları

### 4.1 Overscan Ayarları (TV'lerde Kenar Boşlukları)
```bash
sudo nano /boot/config.txt
```

**Şu satırları ekle/düzenle:**
```ini
# Overscan devre dışı (çoğu modern TV için)
disable_overscan=1

# Eğer kenarlar kesiliyorsa, pozitif değerler kullan:
# overscan_left=20
# overscan_right=20
# overscan_top=20
# overscan_bottom=20

# HDMI ayarları
hdmi_force_hotplug=1
hdmi_group=1
hdmi_mode=16  # 1080p 60Hz

# GPU belleği (tarayıcı için önemli)
gpu_mem=128
```

### 4.2 Ekran Rotasyonu (Dikey Ekranlar İçin - Opsiyonel)
```bash
# /boot/config.txt dosyasına ekle:
display_rotate=1  # 90 derece saat yönü
# display_rotate=3  # 90 derece saat yönü tersine
```

---

## 🔧 AŞAMA 5: Ağ ve Güvenlik Ayarları

### 5.1 Statik IP Adresi (Önerilen)
```bash
sudo nano /etc/dhcpcd.conf
```

**Dosya sonuna ekle:**
```ini
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4

# WiFi için:
# interface wlan0
# static ip_address=192.168.1.100/24
# static routers=192.168.1.1
# static domain_name_servers=8.8.8.8 8.8.4.4
```

### 5.2 Hostname Değiştir
```bash
sudo hostnamectl set-hostname skorboard-masa1
```

---

## 🔧 AŞAMA 6: Performans Optimizasyonu

### 6.1 Swap Dosyası Büyüt (RAM < 4GB ise)
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### 6.2 Gereksiz Servisleri Kapat
```bash
# Bluetooth (kullanmıyorsan)
sudo systemctl disable bluetooth
sudo systemctl stop bluetooth

# Print servisi
sudo systemctl disable cups
sudo systemctl stop cups
```

### 6.3 Memory Split
```bash
sudo raspi-config
# Advanced Options → Memory Split → 128 (veya 256)
```

---

## 🔧 AŞAMA 7: USB Keypad/Kumanda Desteği

### 7.1 Keypad Test
```bash
# USB keypad'i tak ve test et
cat /dev/input/event0
# veya
sudo evtest
```

### 7.2 Özel Key Mapping (Opsiyonel)
Uygulama zaten standart tuşları destekliyor:
- `↑` / `→` / `+` : Seri artır
- `↓` / `←` / `-` : Seri azalt
- `Enter` : Onay (Sıra geç)
- `Backspace` / `Ctrl+Z` : Geri al
- `Escape` : Menü

---

## 🔧 AŞAMA 8: Watchdog ve Otomatik Kurtarma

### 8.1 Hardware Watchdog Etkinleştir
```bash
sudo nano /boot/config.txt
# Ekle:
dtparam=watchdog=on
```

### 8.2 Watchdog Servisi Kur
```bash
sudo apt install watchdog
sudo nano /etc/watchdog.conf
```

**Dosyayı düzenle:**
```ini
watchdog-device = /dev/watchdog
watchdog-timeout = 15
max-load-1 = 24
```

```bash
sudo systemctl enable watchdog
sudo systemctl start watchdog
```

### 8.3 Chromium Crash Recovery Script
```bash
nano ~/watchdog-chromium.sh
```

**Script:**
```bash
#!/bin/bash
# Her 30 saniyede Chromium'un çalışıp çalışmadığını kontrol et
while true; do
  if ! pgrep -x "chromium-browser" > /dev/null; then
    echo "Chromium çökmüş, yeniden başlatılıyor..."
    /home/pi/kiosk.sh &
  fi
  sleep 30
done
```

```bash
chmod +x ~/watchdog-chromium.sh
```

**Autostart'a ekle:**
```bash
nano ~/.config/autostart/watchdog.desktop
```

```ini
[Desktop Entry]
Type=Application
Name=Chromium Watchdog
Exec=/home/pi/watchdog-chromium.sh
```

---

## 🔧 AŞAMA 9: Son Test ve Yeniden Başlatma

### 9.1 Tüm Değişiklikleri Uygula
```bash
sudo reboot
```

### 9.2 Test Kontrol Listesi
- [ ] Pi açıldığında otomatik olarak skorboard açılıyor mu?
- [ ] Tam ekran (kiosk) modunda mı?
- [ ] Fare imleci gizli mi?
- [ ] USB keypad çalışıyor mu?
- [ ] Mobil cihazdan kontrol edebiliyor musunuz?
- [ ] WiFi/Ethernet bağlantısı stabil mi?

---

## 📱 AŞAMA 10: Mobil Cihazdan Erişim

### URL Formatları:

**Skorboard (Pi/TV üzerinde):**
```
https://bilardo-skor.web.app/?mode=scoreboard&table=table_1
```

**Mobil Kontrol (Telefon):**
```
https://bilardo-skor.web.app/
```

### QR Kod Oluştur
Onboading için mobil URL'in QR kodunu oluştur ve masaya as.

---

## 🔧 Sorun Giderme

### Chromium Açılmıyor
```bash
# Log kontrol
journalctl -xe

# Manuel başlat ve hataları gör
~/kiosk.sh
```

### Ekran Siyah Kalıyor
```bash
# HDMI ayarlarını kontrol et
tvservice -s

# Çözünürlüğü değiştir
tvservice -p  # Tercih edilen modu kullan
```

### Ağ Bağlantısı Yok
```bash
# IP kontrol
ip addr show

# Ping test
ping -c 3 google.com

# WiFi yeniden bağlan
sudo wpa_cli reconfigure
```

### Yavaş Performans
```bash
# CPU/RAM kullanımı
htop

# Sıcaklık kontrol
vcgencmd measure_temp
```

---

## 📝 Bakım Notları

### Günlük Yeniden Başlatma (Opsiyonel)
```bash
sudo crontab -e
# Ekle (her gece 04:00'da yeniden başlat):
0 4 * * * /sbin/reboot
```

### Uzaktan Güncelleme
```bash
ssh pi@skorboard-masa1.local
# veya IP ile
ssh pi@192.168.1.100
```

### Log Temizleme
```bash
sudo journalctl --vacuum-time=7d
```

---

## ✅ Hazır!

Pi artık skorboard olarak kullanıma hazır. Herhangi bir sorun için bu rehbere başvurabilirsiniz.

**Bağlantılar:**
- Skorboard: https://bilardo-skor.web.app/?mode=scoreboard&table=table_1
- Mobil: https://bilardo-skor.web.app/
- GitHub: https://github.com/UserMan55/BilardoSkorScoreBoard
