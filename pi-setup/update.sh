#!/bin/bash
#############################################
# Bilardo Skorboard - Pi Güncelleme Script
# Bu script Pi üzerinde çalışır
#############################################

echo "🔄 Skorboard güncellemesi kontrol ediliyor..."

INSTALL_DIR="/home/pi/skorboard"
BACKUP_DIR="/home/pi/skorboard_backup"

# Mevcut versiyonu yedekle
if [ -d "$INSTALL_DIR" ]; then
    echo "📦 Mevcut versiyon yedekleniyor..."
    rm -rf $BACKUP_DIR
    cp -r $INSTALL_DIR $BACKUP_DIR
fi

# Yeni dosyaları aç
if [ -f "/home/pi/skorboard.zip" ]; then
    echo "📂 Yeni dosyalar açılıyor..."
    rm -rf $INSTALL_DIR/*
    unzip -o /home/pi/skorboard.zip -d $INSTALL_DIR
    rm /home/pi/skorboard.zip
    
    echo "✅ Güncelleme tamamlandı!"
    echo "🔄 Tarayıcı yenileniyor..."
    
    # Chromium'u yeniden başlat
    pkill chromium
    sleep 2
    /home/pi/kiosk.sh &
    
    echo "✅ Skorboard güncellendi ve yeniden başlatıldı!"
else
    echo "❌ skorboard.zip bulunamadı!"
    echo "Önce dosyayı Pi'ye yükleyin:"
    echo "  scp skorboard.zip pi@<IP>:/home/pi/"
    exit 1
fi
