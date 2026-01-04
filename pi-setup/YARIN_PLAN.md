# 🛠️ Raspberry Pi Kiosk - Yarın İçin Kurtarma Planı

Bu belge, Raspberry Pi Zero 2 W üzerindeki "siyah ekran" ve performans sorunlarını kesin olarak çözmek için izlenecek adımları içerir.

## 1. Hazırlık ve Kurulum (Sizin Yapacağınız)

Yarın bilgisayar başına geçtiğinizde lütfen **Raspberry Pi Imager** kullanarak SD karta şu işletim sistemini yazdırın:

*   **Cihaz Seçimi:** Raspberry Pi Zero 2 W
*   **İşletim Sistemi:** `Raspberry Pi OS (Legacy, 32-bit) Desktop` veya bulamazsanız `Raspberry Pi OS (32-bit) with Desktop`.
    *   *Önemli:* **Lite** sürüm değil, **Desktop** sürüm seçin.
    *   *Önemli:* **64-bit** değil, **32-bit** seçin (RAM tasarrufu için).
*   **Ayarlar (Çark Simgesi):**
    *   Hostname: `skorboard.local`
    *   Kullanıcı: `pi` / Şifre: `skorboard`
    *   WiFi: Ev ağınızı (veya hotspot) girin.
    *   SSH: Etkinleştirin.

## 2. Yapılandırma (Benim Yapacağım)

Siz kartı takıp Pi'yi açtıktan sonra, Masaüstü otomatik olarak gelecektir (Siyah ekran sorunu kökten çözüldü). Ardından ben bağlanıp şunları yapacağım:

1.  **Gereksiz Servisleri Kapatma:** Masaüstü sürümü biraz ağır olduğu için yazıcı, bluetooth vb. servisleri kapatıp sistemi hafifleteceğim.
2.  **ZRAM Kurulumu:** 512MB RAM'i verimli kullanmak için bellek sıkıştırma modülünü kuracağım.
3.  **Midori Tarayıcı Kurulumu:** Chromium yerine çok daha hafif olan Midori'yi kuracağım.
4.  **Otomatik Başlatma:** Tarayıcıyı `~/.config/autostart` klasörüne ekleyerek her açılışta tam ekran gelmesini sağlayacağım.
5.  **İnce Ayarlar:** Fare imlecini gizleme (`unclutter`) ve ekran koruyucuyu kapatma.

Bu yöntemle, grafik arayüzü ile boğuşmak zorunda kalmadan doğrudan çalışan bir sisteme sahip olacağız.
