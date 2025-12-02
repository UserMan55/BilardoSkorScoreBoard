# Raspberry Pi Yönetim ve Bakım Yol Haritası

Bu belge, Raspberry Pi üzerinde çalışan Bilardo Skor Tabela uygulamasının uzaktan yönetimi, güncellenmesi ve olası sorunların giderilmesi için bir rehber niteliğindedir.

## 1. Uzaktan Erişim (Remote Access)

Raspberry Pi'ye fiziksel erişim olmadan müdahale edebilmek için aşağıdaki yöntemler kullanılabilir:

### A. VNC Viewer (Görsel Arayüz)
Raspberry Pi'nin masaüstünü uzaktan görmek ve kontrol etmek için en kolay yöntemdir.
- **Gereksinim:** Raspberry Pi üzerinde VNC Server etkinleştirilmelidir (`sudo raspi-config` -> Interface Options -> VNC).
- **Bağlantı:** Bilgisayarınızda veya telefonunuzda VNC Viewer uygulamasını kullanarak Pi'nin IP adresine bağlanın.

### B. SSH (Komut Satırı)
Daha hızlı ve düşük bant genişliği gerektiren işlemler için terminal erişimi sağlar.
- **Gereksinim:** SSH etkinleştirilmelidir (`sudo raspi-config` -> Interface Options -> SSH).
- **Bağlantı:** `ssh pi@<IP_ADRESI>` komutu ile bağlanabilirsiniz.

### C. AnyDesk / TeamViewer
Eğer Pi farklı bir ağdaysa (internet üzerinden erişim gerekiyorsa), AnyDesk veya TeamViewer'ın Raspberry Pi sürümü kurulabilir.

## 2. Güncelleme İşlemleri

Uygulamada yapılan değişikliklerin (yeni özellikler, hata düzeltmeleri) Pi'ye aktarılması için:

### Yöntem 1: Git ile Otomatik Çekme (Önerilen)
Eğer proje bir Git deposunda (GitHub/GitLab) tutuluyorsa:
1. Pi üzerinde proje klasörüne gidin: `cd /home/pi/BilardoSkorScoreBoard`
2. Değişiklikleri çekin: `git pull origin main`
3. Bağımlılıkları güncelleyin: `npm install`
4. Uygulamayı yeniden derleyin: `npm run build`
5. Servisi yeniden başlatın (eğer servis olarak çalışıyorsa).

### Yöntem 2: Export Paketi ile Manuel Güncelleme
1. Geliştirme bilgisayarında `npm run sync-export` çalıştırın.
2. `export_package` klasörünü bir USB belleğe veya ağ üzerinden Pi'ye kopyalayın.
3. Pi üzerindeki çalışan klasörün içeriğini bu yeni dosyalarla değiştirin.

## 3. Wi-Fi Şifresi Değişikliği

Eğer salonun Wi-Fi şifresi değişirse, Pi ağa bağlanamayacağı için uzaktan erişim kesilebilir. Bu durumda:

### A. Masaüstü Arayüzünden (Klavye/Mouse ile)
Pi'ye bir klavye ve mouse bağlayarak sağ üst köşedeki Wi-Fi simgesinden yeni ağa bağlanın.

### B. SD Kart Üzerinden (Bilgisayar ile)
1. Pi'nin SD kartını çıkarıp bilgisayara takın.
2. `boot` bölümünün içine `wpa_supplicant.conf` adında bir dosya oluşturun.
3. İçeriğine şunu yazın:
   ```
   country=TR
   ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
   update_config=1

   network={
       ssid="YENI_WIFI_ADI"
       psk="YENI_WIFI_SIFRESI"
   }
   ```
4. Kartı Pi'ye takıp başlatın. Pi otomatik olarak yeni ağa bağlanacaktır.

## 4. Hata Yönetimi ve Sorun Giderme

### Uygulama Açılmıyor
- Tarayıcıyı yenileyin (F5).
- Terminalden `pm2 status` veya `systemctl status` ile servis durumunu kontrol edin.
- Logları inceleyin: `pm2 logs` veya `journalctl -u <servis-adi>`.

### Ekran Taşması / Görüntü Bozukluğu
- Tarayıcı zoom seviyesini kontrol edin (Ctrl + 0).
- Ekran çözünürlüğünü `raspi-config` üzerinden ayarlayın.

## 5. Gelecek Yol Haritası (Roadmap)

Uzaktan yönetimi daha profesyonel hale getirmek için planlanan geliştirmeler:

1.  **Yönetim Paneli:** Uygulama içine sadece adminlerin erişebileceği bir "Ayarlar" sayfası eklenerek Wi-Fi, IP sabitleme gibi ayarların buradan yapılması.
2.  **Otomatik Güncelleme Scripti:** Pi açılışta belirli bir URL'yi kontrol edip yeni versiyon varsa otomatik indirip kurması.
3.  **Watchdog Servisi:** Uygulama çökerse veya internet koparsa otomatik olarak yeniden başlatan veya modemi resetleyen bir servis yazılması.
4.  **Uzaktan Log İzleme:** Logların buluta (Firebase vb.) gönderilerek uzaktan hata takibi yapılması.
