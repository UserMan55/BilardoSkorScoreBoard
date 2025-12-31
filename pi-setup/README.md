# 🎱 Bilardo Skorboard - Pi Kurulum Rehberi

Bu klasör, Raspberry Pi üzerinde skorboard çalıştırmak için gerekli tüm dosyaları içerir.

## 📦 İçerik

| Dosya | Açıklama |
|-------|----------|
| `skorboard.zip` | Derlenmiş web uygulaması |
| `install.sh` | Otomatik kurulum script'i |
| `README.md` | Bu dosya |

## 🚀 Hızlı Kurulum

### Adım 1: Dosyaları Pi'ye Kopyala

**Windows'tan (USB ile):**
```
1. pi-setup klasörünü USB belleğe kopyala
2. USB'yi Pi'ye tak
3. Dosyaları kopyala:
   cp -r /media/pi/USB/* /home/pi/
```

**veya SCP ile (ağ üzerinden):**
```bash
scp -r pi-setup/* pi@<PI_IP>:/home/pi/
```

### Adım 2: Kurulum Script'ini Çalıştır

```bash
cd /home/pi
chmod +x install.sh
./install.sh
```

### Adım 3: Yeniden Başlat

```bash
sudo reboot
```

## ✅ Kurulum Sonrası

Pi yeniden başladığında:
- Otomatik olarak skorboard açılacak
- Tam ekran (kiosk) modunda çalışacak
- Fare imleci gizli olacak

### URL'ler:

| Erişim | URL |
|--------|-----|
| Pi üzerinde | `http://localhost` |
| Ağdan | `http://<PI_IP>` |
| Mobil kontrol | `https://bilardo-skor.web.app` |

## 🔧 Sorun Giderme

### Ekran siyah kalıyor
```bash
# Manuel başlat
~/kiosk.sh
```

### Chromium açılmıyor
```bash
# Log kontrol
journalctl -xe
```

### Ağ bağlantısı yok
```bash
# IP kontrol
ip addr show
ping google.com
```

## 📱 Mobil Kontrol

Telefonunuzdan `https://bilardo-skor.web.app` adresine girin ve Pi ile aynı ağda olduğunuzdan emin olun.

---

**Build Tarihi:** REPLACE_DATE
**Versiyon:** Pi Build (REACT_APP_BUILD_TARGET=pi)
