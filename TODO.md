# BilardoSkorScoreBoard - TODO Listesi

Bu dosya projenin yapılacaklar listesini içerir. Her görev tamamlandığında ilgili madde işaretlenmelidir.

---
## 🚨🚨🚨 SONRAKİ OTURUM İÇİN KRİTİK GÖREVLER 🚨🚨🚨
**Tarih:** 19 Aralık 2025 - Oturum Sonu

### ✅ BU OTURUMDA TAMAMLANANLAR:
1. ✅ Firebase CLI kuruldu (v15.1.0) ve Service Account ile çalışıyor
2. ✅ Mobil build ayrıştırması yapıldı (`npm run build:mobile`)
3. ✅ Firebase Hosting'e deploy edildi (bilardo-skor.web.app)
4. ✅ Token tabanlı güvenlik sistemi eklendi (3cscore.com'dan authentication)
5. ✅ StartScreen'de `isMobileOnly` prop desteği eklendi
6. ✅ Masaüstü algılama useEffect'i mobil build'de devre dışı bırakıldı
7. ✅ Entegrasyon talimatları dosyası güncellendi (v3.0)
8. ✅ MobileController'da çıkış onay modalı eklendi

### ⏳ YAPILAMAYAN / BEKLEYEN GÖREVLER:
1. ⏳ **Firebase CLI Tam Login (2FA)** - Telefon gerekli
2. ⏳ **Cloud Functions Deploy** - Service Account izinleri yetersiz, tam login gerekli
3. ⏳ **VAPID Key Aktivasyonu** - Firebase Console erişimi için login gerekli
4. ⏳ **Firebase Custom Domain (live.3cscore.com)** - Console erişimi gerekli

### 🔴 SONRAKİ OTURUMDA İLK YAPILACAKLAR:

- [ ] **1. Firebase Tam Login (TELEFON GELİNCE):**
  ```powershell
  firebase login
  # 2FA kodu gir
  ```

- [ ] **2. Cloud Functions Deploy:**
  ```powershell
  cd functions
  npm install
  firebase deploy --only functions
  ```

- [ ] **3. Firebase Custom Domain Ayarı:**
  - Firebase Console > Hosting > Add custom domain
  - `live.3cscore.com` ekle
  - DNS doğrulamasını bekle

- [ ] **4. VAPID Key Aktivasyonu:**
  - Firebase Console > Project Settings > Cloud Messaging
  - Web Push certificates > Generate key pair
  - Key'i `src/services/firebase.js` içine yapıştır

- [ ] **5. Token Sistemini Test Et:**
  - 3cscore.com'dan gerçek Firebase token ile test
  - Şu an yapay test token kullanılıyor

---

## 📋 BU OTURUMUN ÖZETİ (19 Aralık 2025)

### 🎯 HEDEF:
3cscore.com sitesi ile entegrasyon için subdomain (live.3cscore.com) üzerinden
skorboard uygulamasına güvenli erişim sağlamak.

### 🏗️ MİMARİ KARARLAR:

1. **Subdomain Yaklaşımı:** 
   - 3cscore.com → live.3cscore.com yönlendirmesi
   - Firebase Hosting: bilardo-skor.web.app
   - DNS CNAME: live → bilardo-skor.web.app

2. **İki Ayrı Build:**
   - `npm run build:mobile` → Firebase'e deploy (mobil kullanıcılar için)
   - `npm run build:pi` → Raspberry Pi'de localhost'ta çalışır

3. **Token Güvenliği:**
   - 3cscore.com'dan Firebase ID Token alınır
   - Token URL parametresi olarak gönderilir
   - Skorboard uygulaması token'ı doğrular
   - Token olmadan erişim ENGELLENİR

### 🔧 TEKNİK DEĞİŞİKLİKLER:

| Dosya | Değişiklik |
|-------|------------|
| `App.js` | `isPiMode` kontrolü, token doğrulama, `AccessDenied` ve `AuthLoading` componentleri |
| `StartScreen.js` | `isMobileOnly` prop, cihaz algılama bypass |
| `firebase.js` | `verifyIdToken()` fonksiyonu eklendi |
| `package.json` | `build:mobile`, `build:pi`, `deploy:mobile` scriptleri |
| `firebase.json` | `functions` bölümü eklendi |
| `functions/index.js` | `verifyToken`, `verifyTokenHttp` Cloud Functions (deploy bekleniyor) |
| `3CSCORE_ENTEGRASYON_TALIMATI.txt` | v3.0 - Token zorunluluğu, kod örnekleri |

### 🧪 TEST BİLGİLERİ:

**Test Token (20 Aralık 2025'e kadar geçerli):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXJfMTIzIiwiYXVkIjoiYmlsYXJkby1za29yIiwiZXhwIjoxNzY2MjM2ODAwLCJlbWFpbCI6InRlc3RAM2NzY29yZS5jb20iLCJuYW1lIjoiVGVzdCBLdWxsYW5pY2kifQ.dGVzdF9zaWduYXR1cmU
```

**Test URL:**
```
https://bilardo-skor.web.app?token=<yukarıdaki_token>&v=2
```

### 🐛 ÇÖZÜLEN SORUNLAR:

1. **LISTENING ekranı görünüyordu** → `isMobileOnly` prop ile çözüldü
2. **useEffect deviceMode sıfırlıyordu** → `isMobileOnly` kontrolü eklendi
3. **MobileController açılıyordu** → `getInitialScreen()` düzeltildi

### 📁 ARKADAŞA GÖNDERİLECEK DOSYA:
`3CSCORE_ENTEGRASYON_TALIMATI.txt` - DNS ayarı ve token entegrasyonu talimatları

---

### 🔥 FIREBASE CLI LOGIN & VAPID KEY İŞLEMLERİ (19 Aralık 2025)
**Durum:** ⏳ Telefon gelince tamamlanacak

Firebase CLI kuruldu (v15.1.0) ve Service Account ile geçici olarak çalışıyor.
Ancak **tam login** için telefon (2FA) gerekiyor. Telefon geldiğinde:

```powershell
# 1. Firebase CLI'a giriş yap
firebase login

# 2. Giriş başarılı olduktan sonra VAPID Key al:
#    Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
#    "Generate key pair" tıkla ve key'i kopyala

# 3. VAPID key'i koda ekle:
#    - src/services/firebase.js → VAPID_KEY değişkenine yapıştır
#    - export_package/src/LiveScoreboard/services/firebase.js → aynı key

# 4. Cloud Functions deploy et:
cd functions
npm install
firebase deploy --only functions

# 5. Test et - Push notification çalışıyor mu?
```

**NOT:** Service Account ile `firebase deploy --only hosting` çalışıyor.
Ancak `firebase deploy --only functions` için tam login gerekebilir.

---

- [ ] **🔴 FCM VAPID Key Aktivasyonu:** Firebase Console'dan VAPID key al ve push notification sistemini aktifleştir:
  1. Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
  2. "Generate key pair" tıkla
  3. VAPID key'i `src/services/firebase.js` dosyasındaki `VAPID_KEY` yerine yaz
  4. `export_package/.../firebase.js` dosyasına da aynı key'i ekle
  5. Cloud Functions deploy et: `cd functions && npm install && firebase deploy --only functions`
  6. Kullanıcı girişinde `registerFCMToken(userId)` çağrısı ekle (StartScreen veya App.js)
  
- [ ] **Sanal Klavye Devamı:** Inline klavye davranışlarını finalize et (tuş dizilimi, fokus, ekstra kısayollar).
- [ ] **QR Hatırlatması:** Her oturum başında `npm run generate-qr -- --host <IP> --port <PORT>` komutunu çalıştırarak güncel yerel IP/port için `public/qr-current.png` dosyasını yenile.

**1. Survival Modu Düzeltmeleri:**
- [ ] **İsim Hatası:** Survival modunda oyuncu isimleri hala hatalı görünüyor (muhtemelen ID basıyor), düzeltilmeli.
- [ ] **Zoom/Layout Hatası:** Chrome %100 zoom ayarında açılış ekranı ve oyun ekranı çok büyük ve hatalı görünüyor. CSS düzenlemeleri yapılmalı.
- [ ] **Mekanizma Testleri:** Survival modu oyun mekanizması (skor hesaplama, sıra geçişi, timeout vb.) detaylı test edilecek.
- [x] **Maç Başlangıcı:** Yeni maç başlatıldığında eski maç verilerinin sıfırlanması (gameKey ile çözüldü).
- [x] **Istaka Sayısı:** Başlangıçta 0 olarak ayarlandı.
- [x] **Oyuncu Fotoğrafları:** 2x büyütüldü ve isimler fotoğrafların altına alındı.
- [x] **Skor Konumu:** Yukarı alındı.
- [x] **RUN Paneli:** Küçültüldü.

**2. Mobil Canlı Maç (Live Match) UI Düzenlemeleri:**
- [x] **Açılış Görseli:** "Canlı Maç Başlat" denildiğinde ekrana gelen kumanda görseli/overlay kesinlikle kaldırılmalı.
- [x] **Alt Kumanda Tasarımı:** Canlı maç ekranının altındaki kumanda tasarımı hatalı ve görsel olarak kötü. Yeniden tasarlanmalı ve düzgün çalışır hale getirilmeli.
- [x] **Oyuncu Profil Resimleri:** Oyuncuların profil resimleri Firebase Storage/Firestore'dan getirilecek ve hem scoreboard oyun ekranlarında hem de canlı maç takip ve kontrol ekranında oyuncu panellerinde görüntülenecek.
- [ ] **Multi-User Maç Erişimi:** Uzaktan başlat butonu ile maç başlatan kullanıcının yanı sıra, maça oyuncu olarak eklenen (3CSCORE kayıtlı) kullanıcılar da kendi cihazlarından canlı maç takip ve kontrol ekranına erişebilmeli ve maçı yönetebilmeli (Firebase auth entegrasyonu, kullanıcı ID'sine göre maç erişim kontrolü).

**3. Kiosk (Tabela) 3CSCORE Modu:**
- [ ] **Fiziksel Kumanda Navigasyonu:** 3CSCORE modu açıldığında fiziksel kumanda ile elementler arasında gezinme (navigasyon) çalışmıyor. Yeniden ele alınmalı ve tam kontrol sağlanmalı.

**4. Kumanda Senkronizasyonu (Fiziksel & Dijital):**
- [x] **Tuş Atamaları Güncellendi (11 Aralık 2025):**
  - Play/Pause (`MediaPlayPause`) → Timer başlat/durdur
  - Backspace → Undo (geri al)
  - Space tuşu → Sadece StartScreen aramada (oyunlarda kaldırıldı)
  - ContextMenu → Menü aç/kapat
  - AudioVolumeMute → Ses aç/kapa
- [ ] **Fonksiyonel Eşitleme:** Mobil tarafta yeniden tasarlanacak dijital kumanda, fiziksel kumandanın tuş takımı ve işlevleriyle (Ana sayfa, Scoreboard, Seçim ekranları) birebir uyumlu olmalı. Her iki kumanda da aynı sayfalarda aynı işlevleri yerine getirmeli.

---

**🔄 ŞU AN ÜZERİNDE ÇALIŞILAN GÖREV:**
**Multi-User Canlı Maç Erişimi** - Push Notification sistemi hazır, VAPID key aktivasyonu bekleniyor.

---

## 📱 MULTİ-USER CANLI MAÇ ERİŞİMİ (AKTİF GELİŞTİRME)
**Durum:** 🚧 Geliştiriliyor (18 Aralık 2025)
**Açıklama:** Terminal veya mobil'den maç başlatıldığında, maçta oyuncu olarak eklenen 3CSCORE kullanıcılarının "Canlı Maç Takip ve Kontrol" ekranına erişebilmesi.

### Faz 1: Maç Verisine Player ID Ekleme ✅
- [x] `sendRemoteStartCommand` fonksiyonuna `playerIds[]` dizisi ekle
- [x] `updateTableStatus` fonksiyonuna `matchMeta` parametresi ekle
- [x] `startedBy` alanı ekle (maçı başlatan kullanıcı)
- [x] `allowedControllers[]` listesi ekle

### Faz 2: Kullanıcı Kimliği Sistemi (Kısmi ✅)
- [x] `loggedInUser` prop'unu aktif kullan (MobileController)
- [x] `currentUser` state kullanımı (StartScreen)
- [ ] Firebase Anonymous Auth ile geçici kimlik oluştur (opsiyonel)
- [ ] localStorage ile oturum devam ettir

### Faz 3: Erişim Kontrolü ✅
- [x] MobileController'da `allowedControllers[]` kontrolü
- [x] Yetkisiz kullanıcılara `readonly` badge gösterimi
- [x] `canControl` useMemo ile yetki hesaplama

### Faz 4: Push Notification Sistemi (VAPID KEY BEKLİYOR ⏳)
- [x] Firebase Cloud Messaging (FCM) fonksiyonları (`firebase.js`)
- [x] Service Worker (`public/firebase-messaging-sw.js`) oluşturuldu
- [x] Cloud Function (`functions/index.js`) oluşturuldu - `notification_queue` dinler
- [x] `sendRemoteStartCommand` notification_queue'ya otomatik yazar
- [x] startedBy hariç diğer oyunculara bildirim gönderme mantığı
- [ ] **⏳ VAPID Key alma ve ekleme (Firebase Console)**
- [ ] **⏳ Cloud Functions deploy (`firebase deploy --only functions`)**
- [ ] **⏳ `registerFCMToken(userId)` çağrısı ekleme**
- [ ] Deep link desteği: `/?mode=controller&table=table_1`

### Güvenlik
- [ ] Firebase Security Rules güncelle
- [ ] `live_matches` ve `notification_queue` için yazma kısıtlamaları

---

## 📦 PROJE BÖLÜMLERİ

Proje 4 ana bölüme ayrılmıştır. Her görev ilgili bölümün altında listelenmiştir.

### 🎯 Bölüm 1: Mobil Frontend (StartScreen + Kumanda)
**Kapsam:** Mobilde çalışacak olan front-end kısmının (StartScreen ile mobil kumanda) tasarımı ve kodlanması

### 🖥️ Bölüm 2: Kiosk Backend + WebSocket + Database
**Kapsam:** Tarayıcıda çalışacak (kiosk modunda) backend tasarımı ve kodlaması, server kodlaması ve kurulumu, WebSocket/Express kurulumları, kumanda entegrasyonu, maç skorlarının veritabanına kaydedilmesi, sunucu tarafında maç başlatma ekranları ve kodları

### 🔧 Bölüm 3: Raspberry Pi Donanım Kurulumu
**Kapsam:** Raspberry donanım ihtiyaçlarının sağlanması, kurulumların ve diğer ayarların yapılması

### 🌐 Bölüm 4: Domain + Yayımlama + Network Erişimi
**Kapsam:** Uygulamaya diğer ağlar üzerinden erişimin sağlanması, projenin yayımlanması, domain işlemleri, uygulamaya (StartScreen ve mobil kumanda) entegrasyon

**⏳ Yapılacaklar:**
- [x] **Export Package Entegrasyonu:** `export_package` ana React projesine entegre edildiğinde, `StartScreen` giriş yapan kullanıcının bilgilerine (İl, Salon) göre otomatik yapılandırılacak.
  - [x] Ana projeden kullanıcı bilgisinin (user context) `StartScreen` bileşenine prop olarak geçilmesi.
  - [x] `StartScreen` içinde `currentUser` bilgisinin prop'tan alınması.
  - [x] Kullanıcının iline göre oyuncu listesinin filtrelenmesi.
  - [x] Kullanıcının salon bilgisine göre başlık ve salon bilgisinin gösterilmesi.

---

## 🎱 MASA (TABLE) ENTEGRASYONU
**Durum:** 🔄 Devam Ediyor
**Açıklama:**
- Masa tanımlarının yapılması ve yönetimi
- Masa durumlarının (BUSY/IDLE) gerçek zamanlı takibi
- Mobil ve Tabela taraflarının masa ID'sine göre eşleşmesi

**✅ Tamamlanan:**
- [x] Firebase 'table_status' koleksiyonu oluşturuldu
- [x] Mobil tarafta masa durumu göstergesi (Müsait/Dolu)
- [x] Masa doluyken yeni maç başlatmanın engellenmesi
- [x] Maç başladığında/bittiğinde masa durumunun güncellenmesi
- [x] Otomatik IP tespiti ve Firebase senkronizasyonu
- [x] Ağ durumu göstergesi (Aynı Ağ / Uzaktan)

**⏳ Yapılacaklar:**
- [ ] Masa ID'sinin dinamik hale getirilmesi (URL parametresi veya ayar)
- [ ] Çoklu masa desteği altyapısı
- [ ] Masa bazlı istatistikler

---

## 📱 BÖLÜM 1: MOBİL FRONTEND (StartScreen + Kumanda)

### 1.1. StartScreen UI/UX İyileştirmeleri
**Durum:** 🔄 Kısmen Tamamlandı  
**Açıklama:**
- StartScreen tasarımı ve kullanıcı deneyimi iyileştirmeleri

**✅ Tamamlanan:**
- [x] Tab sistemi (2'li Karşılaşma vs Survival)
- [x] Oyuncu seçim dropdown'ları
- [x] Hedef skor/istaka ayarlayıcıları
- [x] Penaltı ve ASO checkbox'ları
- [x] StartScreen UI: "Canlı Maçlar" ve "Canlı Maç Başlat" panelleri ayrıldı
- [x] StartScreen UI: "Salon Bilgisi" (Venue Info) alanı eklendi
- [x] StartScreen UI: Kontrol butonları ve inputlar küçültüldü (Compact Design)
- [x] StartScreen UI: "Canlı Maç Başlat" paneli akordiyon yapısına çevrildi
- [x] Salon (Venue) kavramı eklendi (Test Verisi: SALON 3CSCORE, Samsun)
- [x] **Review Card UI:** Maç başlat butonu odaklandığında form yerine özet kartı (Neon Blue) gösterimi.
- [x] **Player Panel Redesign:** Seçim kutuları küçültüldü, isim giriş alanları büyütüldü.
- [x] **Dynamic Coloring:** Seçilen oyuncu tipine göre panel arka plan rengi değişimi (3CSCORE: Dark Slate, OTHER: Light Grey).
- [x] **Input Interaction:** Textbox'lar önce seçilir (highlight), Enter/Click ile yazma moduna geçer. Navigasyon tuşları yazma modunda değilken çalışır.
- [x] **Sanal Klavye Profil Kontrolü:** `deviceProfile.enableVirtualKeyboard` sadece terminal/Pi skorboard profilinde aktif, export package'de kapalı.

**⏳ Yapılacaklar:**
- [ ] Oyun geçmişi görüntüleme
- [ ] Son oyun ayarlarını otomatik yükleme
- [ ] Favori oyuncu listesi
- [ ] Dark/Light mode toggle
- [ ] Salon bilgisinin dinamik hale getirilmesi (Firebase/Config)

---

### 1.2. GameController (Mobil Kumanda) İyileştirmeleri
**Durum:** 🔄 Devam Ediyor
**Açıklama:**
- Mobil kumanda tasarımı ve fonksiyonellik iyileştirmeleri.
- **ÖNCELİKLİ:** Canlı maç başlatıldığında, maçı başlatan kullanıcının (veya 3cscore oyuncusu olmayanların) kullanacağı dijital kumanda arayüzü.

**✅ Tamamlanan:**
- [x] TV kumandası tarzı tasarım (İlk versiyon)
- [x] Directional pad (Plus, Minus, OK, Timer)
- [x] Floating/Fullscreen/Embedded modlar
- [x] UNDO butonu eklendi

**⏳ Yapılacaklar:**
- [ ] **Canlı Maç Dijital Kumandası:** Maçı başlatan kullanıcı için özel kontrol arayüzü (ScoreboardReceiver ile senkronize).
- [ ] Haptic feedback (titreşim) desteği
- [ ] Gesture control (swipe, pinch)
- [ ] Keyboard shortcuts (mobil Bluetooth klavye için)
- [ ] Sesli komutlar (opsiyonel)
- [ ] Kumanda kişiselleştirme (buton konumları)

---

## 🎮 FİZİKSEL KONTROLCÜ ENTEGRASYONU (Kiosk Modu)
**Durum:** ✅ Tamamlandı
**Açıklama:**
- USB/Bluetooth fiziksel kumanda veya klavye ile oyun kontrolü.

**✅ Tamamlanan:**
- [x] **Zero-Latency Input:** `keydown` event listener ile gecikmesiz tepki.
- [x] **Tuş Atamaları:**
  - Yön Tuşları: Skor (Sağ/Sol), Timer (Yukarı/Aşağı)
  - Enter: OK / Sıra Geç
  - Backspace: Geri Al (Undo)
  - Escape: Çıkış
  - Menu (ContextMenu): Oyun Menüsü
  - Mute (AudioVolumeMute / M): Ses Aç/Kapa
- [x] **Menu Overlay:** Oyun sırasında "Vazgeç" ve "Maçtan Çık" seçeneklerini içeren overlay.
- [x] **Ses Kontrolü:** Ses açma/kapama ve görsel bildirim (🔊/🔇).
- [x] **Navigasyon:** Modal ve overlay'ler içinde fiziksel tuşlarla gezinme.
- [x] **Güvenlik:** Tarayıcı sağ tık menüsünün engellenmesi.
- [x] **UI Temizliği:** Kiosk modunda dijital butonların gizlenmesi.

---

### 1.3. Oyun Bitimi Seçenekleri
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Oyun bittiğinde kullanıcıya iki seçenek sunulsun:
  - **"Aynı Maçı Tekrar Ayarla"**: Önceki ayarlarla maçı yeniden başlat
  - **"Yeni Maç"**: StartScreen'e dön
- Oyun sonu overlay'ine butonlar ekle
- Önceki maç ayarlarını state'te sakla

---

### 1.4. ASO Yok Senaryosu Test ve Düzeltme
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- ASO olmadığında oyun kurallarının doğru çalıştığını test et ve düzelt

**Test Senaryoları:**
- [ ] 1. oyuncu hedef skora ulaşır, ASO yok → Oyun biter
- [ ] 1. oyuncu hedef istakaya ulaşır, ASO yok → Oyun biter
- [ ] 2. oyuncu hedef skora ulaşır, ASO yok → Oyun biter

---

### 1.5. Penaltı Senaryosu Kodlaması
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Maç berabere bittiğinde penaltı atışları mekanizması

**Alt Görevler:**
- [ ] Penaltı ekranı komponenti (PenaltyScreen.js)
- [ ] Penaltı atış sırası belirleme
- [ ] Skor takibi (her oyuncu için kaç vuruş, kaç isabet)
- [ ] Sudden death (ani ölüm) mekanizması
- [ ] ASO var/yok durumlarında penaltı mantığı
- [ ] Penaltı kazananı belirleme ve oyun sonu

---

### 1.6. SURVIVAL Oyun Modu
**Durum:** 🔄 Devam Ediyor (18 Kasım 2025)  
**Açıklama:**
- Survival (Hayatta Kalma) oyun modu ekle
- Yeni oyun modu seçim ekranı

**✅ Tamamlanan:**
- [x] StartScreen'e Tab sistemi eklendi ("2'li Karşılaşma" ve "Survival")
- [x] Survival tab tasarımı (4 oyuncu seçim combobox'ı)
- [x] Oyuncu seçimi kuralları:
  - Minimum 3 oyuncu (zorunlu)
  - Maksimum 4 oyuncu (4. oyuncu opsiyonel)
  - Seçilen oyuncular diğer dropdown'larda görünmez
- [x] Oyun kuralları belirlendi: 2 set üzerinden 45'er dakika
- [x] "Survival Maçını Başlat" butonu (3+ oyuncu seçilince aktif)

**🎯 SURVIVAL OYUN KURALLARI (Detaylı Mekanik):**

**Oyuncu Sayısı:**
- Minimum: 3 oyuncu (zorunlu)
- Maksimum: 4 oyuncu

**StartScreen Ayarları:**
- **Timeout Hakları**: Default 3, StartScreen'de ayarlanabilir
- **Set Sayısı**: Default 2, ayarlanabilir (1, 2, 3, 4)
- **Set Süresi**: Default 45 dk, seçenekler: 15, 30, 45, 60 dakika
- **Başlangıç Puanları**: Default 30, ayarlanabilir (+5/-5, min: 15, max: 45)

**Oyun Başlangıcı:**
- Oyuncu sıraları RANDOM olarak belirlenir
- İlk oyuncu BEYAZ top → panel arka planı beyaz
- İkinci oyuncu SARI top → panel arka planı sarı
- Sıra: BEYAZ → SARI → BEYAZ → SARI (dönüşümlü)
- Her oyuncu için 30 saniye vuruş süresi

**Skor Hesaplama (ÖNEMLİ!):**
```javascript
// FORMÜL
Oyuncu Skoru = Başlangıç Puanı + Tüm Seri Kazançları
Her Seri Kazancı = Run × (Oyuncu Sayısı - 1)

// Bir oyuncu sayı aldığında:
Aktif Oyuncu:
  → Run +1
  → RunPoint = Run × (Oyuncu_Sayısı - 1)  // Geçici gösterim, sıra geçince sıfırlanır
  → Score += RunPoint

Diğer Oyuncular:
  → Score -= 1 (her biri)
  → Ekranda geçici "-1" gösterimi (1-2 saniye sonra kaybolur)

// RunPoint Davranışı
- Oyuncu seri yapıyor: RunPoint = Run × (Oyuncu_Sayısı - 1)
- Sıra başka oyuncuya geçince: RunPoint = 0 (sıfırlanır)
```

**🎮 ÖRNEK OYUN SENARYOSU (4 Oyuncu, Başlangıç: 30 puan):**

```
📍 OYUN BAŞLANGICI
─────────────────────────────────────────────
Oyuncu1 | Run:0 | RunPoint:0 | Score:30 | ⚪BEYAZ
Oyuncu2 | Run:0 | RunPoint:0 | Score:30 | 
Oyuncu3 | Run:0 | RunPoint:0 | Score:30 | 
Oyuncu4 | Run:0 | RunPoint:0 | Score:30 | 

📍 OYUNCU1 1 SAYI ALDI
─────────────────────────────────────────────
Oyuncu1 | Run:1 | RunPoint:+3 | Score:33 | ⚪BEYAZ
         └─ (1 × (4-1) = +3)
         └─ HR:1 TotalRun:1 Avg:1.000

Oyuncu2 | Run:0 | [-1] ⚡ | Score:29 | 🟡SARI (sırada)
Oyuncu3 | Run:0 | [-1] ⚡ | Score:29 |
Oyuncu4 | Run:0 | [-1] ⚡ | Score:29 |
         └─ [-1] 1-2 saniye sonra kaybolur

📍 OYUNCU1 SIRA BAŞKA OYUNCUYA GEÇTİ
─────────────────────────────────────────────
Oyuncu1 | Run:1 | RunPoint:0 | Score:33 | ⚪
         └─ RunPoint sıfırlandı (sıra geçti)

Oyuncu2 | Run:0 | RunPoint:0 | Score:29 | 🟡SARI (aktif)

📍 OYUNCU2 2 SAYI ALDI (peş peşe)
─────────────────────────────────────────────
Oyuncu2 | Run:2 | RunPoint:+6 | Score:35 | 🟡SARI
         └─ 1.sayı: +3 (Score:32)
         └─ 2.sayı: +3 (Score:35)
         └─ RunPoint = 2 × 3 = +6

Oyuncu1 | Run:1 | [-1][-1] | Score:31 | ⚪BEYAZ (sırada)
Oyuncu3 | Run:0 | [-1][-1] | Score:27 |
Oyuncu4 | Run:0 | [-1][-1] | Score:27 |
```

**Oyuncu Panel Tasarımı (Yukarıdan Aşağıya):**
```
┌─────────────────────────────────┐
│  [Oyuncu İsmi]  (en üstte)     │ ← Normal punto
├─────────────────────────────────┤
│      33        (SKOR)           │ ← Büyük punto (dinamik hesaplanan)
├─────────────────────────────────┤
│  [🟢][🟢][🟢]  (Timeout)       │ ← Yeşil diktörtgenler
├─────────────────────────────────┤
│  RunPoint: +3    Run: 1         │ ← Küçük punto
│     (geçici)    (kalıcı)        │    (RunPoint sıra geçince sıfırlanır)
├─────────────────────────────────┤
│  HR: 1  TotalRun: 1  Avg: 1.00  │ ← İstatistikler
└─────────────────────────────────┘

Diğer Oyuncularda (pasif):
┌─────────────────────────────────┐
│  [Oyuncu2 İsmi]                 │
├─────────────────────────────────┤
│      29    [-1] ⚡              │ ← Geçici -1 gösterimi
└─────────────────────────────────┘
```

**Ekran Düzeni:**
- 3 oyuncu → 3 bölüm yan yana
- 4 oyuncu → 4 bölüm yan yana (2x2 grid veya 1x4 row)

**Set Zamanlayıcı:**
- Her set için belirtilen süre (örn: 45 dk)
- Süre dolduğunda:
  - Tüm oyuncular atış yapmadıysa → Atış yapmayan oyuncular atış hakkı alır
  - Atış sırası tamamlandıktan sonra set biter

**Oyun Sonu:**
- Belirlenen set sayısı tamamlanınca
- En yüksek skora sahip oyuncu kazanır

**⏳ Devam Eden Görevler:**
- [ ] StartScreen'e Survival ayarları ekle:
  - [ ] Timeout hakları seçimi (default: 3)
  - [ ] Set sayısı seçimi (1/2/3/4, default: 2)
  - [ ] Set süresi seçimi (15/30/45/60 dk, default: 45)
  - [ ] Başlangıç puanı ayarı (+5/-5, min:15, max:45, default:30)
- [ ] SurvivalGame.js komponenti oluştur
- [ ] Random oyuncu sıralama algoritması
- [ ] Oyuncu panelleri tasarımı (beyaz/sarı renklendirme)
- [ ] Skor hesaplama sistemi (run × oyuncu_sayısı - runPoint)
- [ ] 30 saniye vuruş zamanlayıcısı
- [ ] Set zamanlayıcısı (15/30/45/60 dk)
- [ ] Set sonu ve oyun sonu mantığı
- [ ] GameController entegrasyonu (embedded mode)
- [ ] İstatistik hesaplama (HR, Score, Avg)

**📋 Sonraki Adımlar:**
1. StartScreen Survival tab'ına ayar kontrolleri ekle
2. SurvivalGame.js dosyası oluştur
3. Random sıralama ve renklendirme algoritması
4. Oyuncu panel tasarımı (responsive 3-4 bölüm)
5. Skor hesaplama ve güncelleme mekaniği

---

### 1.7. Offline-First LocalStorage Sistemi
**Durum:** ❌ Yapılmadı  
**Öncelik:** 🔴 Yüksek  
**Açıklama:**
- İnternet olmadan da uygulama çalışabilmeli
- Maçlar önce local'de saklanmalı, internet gelince Firebase'e sync

**Alt Görevler:**

**Faz 1: Local Storage Infrastructure**
- [ ] LocalStorageManager.js oluştur
  - [ ] `saveUserCache(users)` - Kullanıcı listesi cache
  - [ ] `getUserCache()` - Cache'den kullanıcı oku
  - [ ] `savePendingMatch(matchData)` - Bekleyen maç kaydet
  - [ ] `getPendingMatches()` - Bekleyen maçları oku
  - [ ] `removePendingMatch(matchId)` - Sync sonrası sil
  - [ ] `saveLastMatchSettings(settings)` - Son ayarları sakla

**Faz 2: Connection Manager**
- [ ] ConnectionManager.js oluştur
  - [ ] `isOnline()` - Bağlantı kontrolü
  - [ ] `onConnectionChange(callback)` - Bağlantı dinle
  - [ ] `waitForConnection()` - Promise ile bağlantı bekle

**Faz 3: UI Göstergeleri**
- [ ] StatusBar'a bağlantı durumu ekle (🟢 Online / 🔴 Offline / 🟡 Syncing)
- [ ] Pending maç sayısı badge'i
- [ ] Manuel sync butonu

---

### 1.8. Responsive Tasarım ve Mobil Optimizasyon
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Tüm ekranlar mobil cihazlarda optimize edilmeli

**Alt Görevler:**
- [ ] iPhone SE (375px) desteği
- [ ] iPad portrait/landscape desteği
- [ ] Android tabletler (600px-960px)
- [ ] Touch gesture optimizasyonu
- [ ] Font size adjustments (okuma kolaylığı)
- [ ] Button size minimum 44x44px (Apple HIG)

---

## 🖥️ BÖLÜM 2: KİOSK BACKEND + WEBSOCKET + DATABASE

### 2.1. Backend Mimari Tasarımı
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Backend teknolojileri ve mimari kararları

**Karar Verilecek Konular:**
- [ ] Backend teknolojisi: Node.js/Express vs Firebase Functions
- [ ] Database: PostgreSQL vs MongoDB vs Firestore
- [ ] Authentication: Firebase Auth vs JWT
- [ ] API yapısı: REST API vs GraphQL
- [ ] Realtime updates: WebSocket vs Firebase Realtime Database

**API Endpoints (Taslak):**
```
POST   /api/matches          - Yeni maç başlat
GET    /api/matches/:id      - Maç detayları
PUT    /api/matches/:id      - Maç güncelle
DELETE /api/matches/:id      - Maç sil
GET    /api/players          - Oyuncular listesi
POST   /api/players          - Yeni oyuncu ekle
GET    /api/statistics       - İstatistikler
```

---

### 2.2. Node.js/Express Server Kurulumu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Backend server kurulumu ve yapılandırması

**Alt Görevler:**
- [ ] Node.js projesi başlat (`npm init`)
- [ ] Express framework kurulumu
- [ ] CORS yapılandırması
- [ ] Environment variables (.env setup)
- [ ] Error handling middleware
- [ ] Logging sistemi (Winston/Morgan)
- [ ] API versioning stratejisi

---

### 2.3. WebSocket Sunucu Kurulumu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Gerçek zamanlı skor güncellemeleri için WebSocket

**Alt Görevler:**
- [ ] Socket.IO kurulumu
- [ ] WebSocket event yapısı tasarımı
- [ ] Room-based messaging (her maç için ayrı room)
- [ ] Connection/Disconnection handling
- [ ] Broadcast stratejisi (kumanda → kiosk ekranı)
- [ ] Heartbeat/Ping-Pong mekanizması

**WebSocket Events (Taslak):**
```javascript
// Client → Server
'join-match'     - Maça katıl
'score-update'   - Skor güncelle
'timer-update'   - Timer güncelle
'end-match'      - Maçı bitir

// Server → Client
'score-changed'  - Skor değişti
'timer-changed'  - Timer değişti
'match-ended'    - Maç bitti
'player-turn'    - Sıra değişti
```

---

### 2.4. Kiosk Ekranı (Display Screen) Tasarımı
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Büyük ekranda (TV/Projeksiyon) gösterilecek skor ekranı

**Alt Görevler:**
- [ ] KioskDisplay.js komponenti
- [ ] Fullscreen layout (1920x1080 optimize)
- [ ] Realtime skor güncellemeleri (WebSocket ile)
- [ ] Animasyonlu geçişler (skor değişimi, sıra değişimi)
- [ ] QR kod gösterimi (mobil kumanda bağlantısı için)
- [ ] Reklam/Sponsor alanı (opsiyonel)
- [ ] Maç istatistikleri sidebar
- [ ] Auto-refresh mekanizması

---

### 2.5. Sunucu Tarafı Maç Başlatma Ekranı
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Sunucu (kiosk bilgisayar) tarafından maç başlatma arayüzü

**Alt Görevler:**
- [ ] ServerMatchStart.js komponenti
- [ ] Maç ID oluşturma ve QR kod generate etme
- [ ] Mobil cihazlar için bağlantı yönergeleri
- [ ] Maç ayarları önizleme
- [ ] Başlatma onay ekranı
- [ ] Hata durumları handling

---

### 2.6. Database Schema ve Modelleme
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Veritabanı şema tasarımı ve model oluşturma

**Collections/Tables:**
```javascript
// matches
{
  matchId: UUID,
  createdAt: Timestamp,
  startedAt: Timestamp,
  endedAt: Timestamp,
  status: 'pending|active|completed',
  gameMode: '2vs2|survival',
  players: [
    { 
      name: String,
      finalScore: Number,
      innings: Number,
      runs: Array,
      timeouts: Number,
      HR1: Number,
      HR2: Number,
      AVG: Number
    }
  ],
  settings: {
    targetScore: Number,
    targetInning: Number,
    penaltyEnabled: Boolean,
    asoEnabled: Boolean
  },
  result: {
    winner: String,
    winType: 'score|inning|penalty|forfeit',
    finalScores: Object,
    duration: Number // seconds
  }
}

// players
{
  playerId: UUID,
  fullName: String,
  email: String (optional),
  phone: String (optional),
  avatar: URL (optional),
  stats: {
    totalMatches: Number,
    wins: Number,
    losses: Number,
    draws: Number,
    totalScore: Number,
    avgHR1: Number,
    avgHR2: Number,
    avgAVG: Number
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}

// statistics (aggregated)
{
  date: Date,
  totalMatches: Number,
  totalPlayers: Number,
  avgMatchDuration: Number,
  topPlayers: Array
}
```

**Alt Görevler:**
- [ ] Schema validation rules
- [ ] Indexes oluşturma (performance için)
- [ ] Migration scripts
- [ ] Seed data (test için)

---

### 2.7. Maç Kaydı API Endpoints
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Maç verilerini kaydetmek için API endpoints

**Alt Görevler:**
- [ ] `POST /api/matches` - Yeni maç oluştur
- [ ] `GET /api/matches/:id` - Maç detayları getir
- [ ] `PUT /api/matches/:id` - Maç güncelle (skor, durum)
- [ ] `DELETE /api/matches/:id` - Maç sil
- [ ] `POST /api/matches/:id/complete` - Maçı tamamla
- [ ] Input validation (Joi/Yup)
- [ ] Authorization checks
- [ ] Rate limiting

---

### 2.8. Mobil Kumanda Entegrasyonu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Mobil kumanda ile kiosk ekranı arasında bağlantı

**Alt Görevler:**
- [ ] QR kod okuma (mobil tarafta)
- [ ] WebSocket bağlantı kurma
- [ ] Match ID ile eşleştirme
- [ ] Kumanda komutlarını WebSocket ile gönderme
- [ ] Bağlantı kopma durumları handling
- [ ] Reconnection stratejisi
- [ ] Multiple kumanda desteği (2 oyuncu için 2 telefon)

---

## 🔧 BÖLÜM 3: RASPBERRY Pi DONANIM KURULUMU

### 3.1. Raspberry Pi Donanım Alımı ve Hazırlık
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Gerekli donanımların temin edilmesi

**Alınacak Ekipmanlar:**
- [ ] Raspberry Pi 4 Model B (4GB veya 8GB RAM)
- [ ] MicroSD Kart (32GB minimum, Class 10)
- [ ] Raspberry Pi Resmi Güç Adaptörü (5V 3A)
- [ ] HDMI Kablo (Micro HDMI to HDMI)
- [ ] Raspberry Pi Case (soğutmalı)
- [ ] (Opsiyonel) Klavye ve Mouse (ilk kurulum için)
- [ ] (Opsiyonel) Fan veya Heatsink (soğutma için)

---

### 3.2. Raspberry Pi OS Kurulumu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- İşletim sistemi kurulumu ve temel yapılandırma

**Alt Görevler:**
- [ ] Raspberry Pi Imager ile OS yükleme
- [ ] OS seçimi: Raspberry Pi OS (64-bit) with Desktop
- [ ] İlk boot ve setup wizard
- [ ] Wi-Fi/Ethernet bağlantısı kurma
- [ ] SSH enable etme
- [ ] VNC enable etme (uzaktan erişim için)
- [ ] Sistem güncellemeleri (`sudo apt update && sudo apt upgrade`)

---

### 3.3. Chromium Browser Kiosk Modu Kurulumu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Tarayıcıyı kiosk modunda çalıştırma

**Alt Görevler:**
- [ ] Chromium kurulumu
- [ ] Autostart script oluşturma
- [ ] Kiosk mode parametreleri:
  - `--kiosk` (tam ekran)
  - `--no-first-run` (ilk çalıştırma dialogları yok)
  - `--disable-infobars` (bilgilendirme barları kapat)
  - `--disable-translate` (çeviri önerileri kapat)
  - `--disable-session-crashed-bubble` (crash dialogları kapat)
- [ ] Screensaver/sleep mode'u disable etme
- [ ] Auto-refresh script (bağlantı kopması için)

**Örnek Autostart Komutu:**
```bash
chromium-browser --kiosk --no-first-run \
  --disable-infobars --disable-translate \
  --disable-session-crashed-bubble \
  http://192.168.1.100:3000/kiosk-display
```

---

### 3.4. Node.js ve Uygulama Kurulumu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Backend ve frontend uygulamalarının Raspberry Pi'ye kurulması

**Alt Görevler:**
- [ ] Node.js kurulumu (v18 LTS)
- [ ] npm/yarn kurulumu
- [ ] Git kurulumu
- [ ] Proje repository clone etme
- [ ] Dependencies yükleme (`npm install`)
- [ ] Production build (`npm run build`)
- [ ] PM2 kurulumu (process manager)
- [ ] PM2 ile uygulamayı başlatma
- [ ] PM2 autostart yapılandırması

---

### 3.5. Ağ Yapılandırması
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Network ayarları ve güvenlik

**Alt Görevler:**
- [ ] Static IP adresi atama
- [ ] Port forwarding (gerekirse)
- [ ] Firewall kuralları (ufw)
- [ ] Sadece gerekli portları açma (80, 443, 3000, WebSocket port)
- [ ] Local network discovery enable
- [ ] mDNS/Avahi yapılandırması (scoreboard.local gibi)

---

### 3.6. Güvenlik ve Optimizasyon
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Sistem güvenliği ve performans optimizasyonu

**Alt Görevler:**
- [ ] Default şifre değiştirme
- [ ] SSH key-based authentication
- [ ] Gereksiz servisleri disable etme
- [ ] Automatic security updates
- [ ] Backup stratejisi (SD kart image)
- [ ] Overclock ayarları (dikkatli)
- [ ] Swap memory ayarları
- [ ] Log rotation

---

### 3.7. Monitoring ve Maintenance
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Sistem izleme ve bakım araçları

**Alt Görevler:**
- [ ] CPU/RAM/Temperature monitoring
- [ ] Disk space monitoring
- [ ] Application health check
- [ ] Automatic restart on crash
- [ ] Log collection ve analysis
- [ ] Remote access setup (TeamViewer/AnyDesk)
- [ ] Backup automation (günlük/haftalık)

---

## 🌐 BÖLÜM 4: DOMAIN + YAYIMLAMA + NETWORK ERİŞİMİ

### 4.1. Domain Satın Alma ve Yapılandırma
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- 3cscore.com domain işlemleri

**Alt Görevler:**
- [ ] Domain satın alma (Godaddy, Namecheap, vb.)
- [ ] DNS yönetimi
- [ ] A record yapılandırması
- [ ] CNAME record yapılandırması
- [ ] SSL sertifikası (Let's Encrypt)
- [ ] SSL otomatik yenileme
- [ ] HTTPS yönlendirme

---

### 4.2. Hosting ve Deployment
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Uygulamanın hosting edilmesi

**Hosting Seçenekleri:**
- [ ] **Seçenek 1: Cloud Hosting**
  - Vercel/Netlify (Frontend)
  - Heroku/Railway (Backend)
  - Firebase Hosting
  
- [ ] **Seçenek 2: VPS**
  - DigitalOcean Droplet
  - AWS EC2
  - Google Cloud Compute Engine
  
- [ ] **Seçenek 3: Hybrid**
  - Frontend: Vercel
  - Backend: Raspberry Pi (local)
  - Tunnel: ngrok/Cloudflare Tunnel

**Alt Görevler:**
- [ ] Hosting seçimi
- [ ] Production environment setup
- [ ] Environment variables configuration
- [ ] Build optimization
- [ ] CDN setup (static assets için)

---

### 4.3. CI/CD Pipeline Kurulumu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Otomatik deployment pipeline

**Alt Görevler:**
- [ ] GitHub Actions workflow oluşturma
- [ ] Automated testing (unit, integration)
- [ ] Automated build
- [ ] Automated deployment (production/staging)
- [ ] Rollback stratejisi
- [ ] Deployment notifications (Slack/Discord)

**GitHub Actions Workflow (Taslak):**
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Install dependencies
      - Run tests
      - Build production
      - Deploy to Vercel/Firebase
      - Notify team
```

---

### 4.4. Diğer Ağlardan Erişim (Tunnel/Proxy)
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Local Raspberry Pi'ye internet üzerinden erişim

**Seçenekler:**
- [ ] **ngrok** - Ücretsiz tunnel servisi
- [ ] **Cloudflare Tunnel** - Ücretsiz, güvenli
- [ ] **localtunnel** - Open source alternatif
- [ ] **Port Forwarding** - Router üzerinde manual setup

**Alt Görevler:**
- [ ] Tunnel servis seçimi
- [ ] Tunnel setup ve test
- [ ] Custom subdomain yapılandırması (kiosk.3cscore.com)
- [ ] SSL sertifikası (tunnel servisi genelde sağlar)
- [ ] Automatic reconnection on disconnect
- [ ] Bandwidth ve connection monitoring

---

### 4.5. StartScreen ve Kumanda Entegrasyonu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Mobil uygulamaların cloud backend'e bağlanması

**Alt Görevler:**
- [ ] API base URL yapılandırması (production vs local)
- [ ] WebSocket connection URL yapılandırması
- [ ] Environment detection (local vs production)
- [ ] QR kod generate etme (match join için)
- [ ] Deep linking setup (QR kod scan sonrası)
- [ ] Error handling (connection timeout, server unreachable)
- [ ] Fallback stratejisi (local-only mode)

**Environment Config:**
```javascript
const config = {
  development: {
    API_URL: 'http://localhost:3001',
    WS_URL: 'ws://localhost:3001'
  },
  production: {
    API_URL: 'https://api.3cscore.com',
    WS_URL: 'wss://api.3cscore.com'
  }
};
```

---

### 4.6. Performance ve SEO Optimizasyonu
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Uygulama performansı ve SEO iyileştirmeleri

**Alt Görevler:**
- [ ] Lighthouse audit (Performance, Accessibility, SEO)
- [ ] Image optimization (WebP format, lazy loading)
- [ ] Code splitting ve lazy loading
- [ ] Bundle size optimization
- [ ] Caching stratejisi (Service Worker)
- [ ] Meta tags (title, description, og:image)
- [ ] Sitemap oluşturma
- [ ] robots.txt yapılandırması
- [ ] Google Search Console setup

**Performance Targets:**
- [ ] Lighthouse Performance Score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] Cumulative Layout Shift < 0.1

---

### 4.7. Monitoring, Logging ve Analytics
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Uygulama izleme ve analitik

**Alt Görevler:**

**Error Tracking:**
- [ ] Sentry kurulumu (frontend + backend)
- [ ] Error reporting configuration
- [ ] Source maps upload
- [ ] Alert rules (critical errors)

**Application Monitoring:**
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Server metrics (CPU, RAM, Disk)
- [ ] API response time tracking
- [ ] Database query performance

**User Analytics:**
- [ ] Google Analytics setup
- [ ] Event tracking (match start, match end, button clicks)
- [ ] User flow analysis
- [ ] Conversion tracking
- [ ] (Opsiyonel) Mixpanel/Amplitude advanced analytics

**Logging:**
- [ ] Centralized logging (Papertrail, Loggly)
- [ ] Log levels (info, warn, error)
- [ ] Log rotation ve archiving
- [ ] Search ve filtering tools

---

### 4.8. Güvenlik ve Compliance
**Durum:** ❌ Yapılmadı  
**Açıklama:**
- Uygulama güvenliği ve yasal uyumluluk

**Alt Görevler:**

**Security:**
- [ ] HTTPS enforcement
- [ ] CORS yapılandırması
- [ ] Rate limiting
- [ ] Input sanitization (XSS prevention)
- [ ] SQL injection prevention (parametrized queries)
- [ ] API authentication (JWT)
- [ ] API key rotation
- [ ] Security headers (Helmet.js)
- [ ] DDoS protection (Cloudflare)

**Compliance:**
- [ ] Privacy Policy sayfası
- [ ] Terms of Service sayfası
- [ ] Cookie consent banner
- [ ] GDPR uyumluluğu (veri işleme)
- [ ] KVKK uyumluluğu (Türkiye için)
- [ ] User data export/delete fonksiyonları

---

## ✅ Tamamlanan Görevler

### ✓ Timeout Sistemini Eski Haline Döndür
**Tamamlanma Tarihi:** 18 Kasım 2025  
**Açıklama:**
- ✅ isInTimeout state'i ve kontrollerini kaldırdık
- ✅ Her 40 sn bittiğinde timeout hakkı varsa otomatik kullanılıyor
- ✅ Her oyuncunun oyun boyunca toplam 2 timeout hakkı var
- ✅ Aynı seri içinde 2 timeout da kullanılabilir (2x40=80 saniye)
- ✅ App.js ve PenaltyScreen.js güncellendiş

**Değiştirilen Dosyalar:**
- ✅ App.js - handleTimerFinished fonksiyonu basitleştirildi
- ✅ App.js - isInTimeout state'i kaldırıldı
- ✅ PenaltyScreen.js - isInTimeout state'i kaldırıldı

---

### ✓ Timeout Mantığını Düzelt
**Tamamlanma Tarihi:** 18 Kasım 2025  
**Açıklama:** (ESKİ VERSİYON - GERİ ALINACAK)
- İlk 40 sn bitince timeout hakkı varsa kullanılıyor
- Timeout'taki 40 sn bitince direkt faul + sıra değişimi
- Her oyuncunun oyun boyunca toplam 2 timeout hakkı var
- Bir serinin ilk 40 sn'sinde maksimum 1 timeout kullanılabiliyor

### ✓ Overlay Mesajları Container Düzeltmesi
**Tamamlanma Tarihi:** 18 Kasım 2025  
**Açıklama:**
- Overlay mesajları için ayrı container oluşturuldu
- Uzun mesajlarda ekran yapısı bozulmuyor
- Responsive ve kullanıcı dostu

### ✓ Hedef İstaka Kontrolü Düzeltmesi
**Tamamlanma Tarihi:** 18 Kasım 2025  
**Açıklama:**
- Hedef istaka kontrolü 2. oyuncu OK'ladıktan sonra yapılıyor
- İstaka uyarıları doğru zamanda gösteriliyor
- 1. oyuncu için istaka uyarısı 2. oyuncu OK'ladıktan sonra görünüyor

### ✓ ASO Vuruşu Gösterimi
**Tamamlanma Tarihi:** 18 Kasım 2025  
**Açıklama:**
- ASO durumunda "ASO VURUŞU" mesajı gösteriliyor
- Skor nedeniyle ASO ve istaka nedeniyle ASO ayrımı yapılıyor
- ASO olmayan son seri durumları için "SON SERİ" mesajı

### ✓ Oyun Bitimi Seçenekleri
**Tamamlanma Tarihi:** 18 Kasım 2025  
**Açıklama:**
- Oyun bittiğinde iki seçenek sunuluyor:
  - 🔄 Aynı Maçı Tekrar Oyna (önceki ayarlarla)
  - 🆕 Yeni Maç (StartScreen'e dön)
- Önceki maç ayarları (oyuncu isimleri, hedef skor/istaka, penaltı, ASO) kaydediliyor
- Modern gradient buton tasarımları

### ✓ ASO'da Timeout Kuralı
**Tamamlanma Tarihi:** 18 Kasım 2025  
**Açıklama:**
- ASO vuruşunda 2. oyuncu timeout kullanırsa:
  - Mevcut run count skoruna eklenir
  - Sıra 1. oyuncuya geçmez
  - Maç mevcut skorlarla biter
- Normal vuruşlarda timeout her zamanki gibi çalışır

---

### ✓ Oyun Modu Seçimi ve Kayıt Onayı
**Tamamlanma Tarihi:** 24 Kasım 2025
**Açıklama:**
- ✅ StartScreen'e "Oyun Modu" seçeneği eklendi (Serbest Mod / Standart Mod / Survival).
- ✅ Standart Mod (3cscore Modu) seçili iken maç bitiminde "Maç Sonucu Kaydedilsin mi?" onayı eklendi.
- ✅ Serbest Mod'da maç sonuçları veritabanına kaydedilmiyor.
- ✅ StartScreen "Yükleniyor..." hatası giderildi (Timeout mekanizması eklendi).

### ✓ Fiziksel Enter Öneri Seçimi
**Tamamlanma Tarihi:** 3 Aralık 2025
**Açıklama:**
- ✅ Fiziksel kumanda/klavye Enter tuşu, combo öneri modundayken seçili öneriyi snapshot üzerinden onaylıyor.
- ✅ ArrowDown ile öneri listesine girildiğinde mevcut öneriler snapshot'a alınarak sıfırlanma sorunları engellendi.
- ✅ Sanal klavye ENTER davranışı ile fiziksel kumanda davranışı hizalandı (aynı tab geçişleri ve uyarılar).

---

## 📊 PROJE İLERLEME ÖZETİ

### 📱 Bölüm 1: Mobil Frontend
**İlerleme:** 🟢🟢🟢⚪⚪⚪⚪⚪ 35%
- ✅ Temel StartScreen ve GameController
- ✅ Tab sistemi (2vs2 vs Survival)
- ✅ UNDO fonksiyonu
- ⏳ Survival mode geliştirme
- ❌ Offline-first sistem
- ❌ Responsive optimizasyon

### 🖥️ Bölüm 2: Kiosk Backend
**İlerleme:** ⚪⚪⚪⚪⚪⚪⚪⚪ 0%
- ❌ Backend mimari
- ❌ WebSocket server
- ❌ Kiosk display ekranı
- ❌ Database schema
- ❌ API endpoints

### 🔧 Bölüm 3: Raspberry Pi
**İlerleme:** ⚪⚪⚪⚪⚪⚪⚪⚪ 0%
- ❌ Donanım tedarik
- ❌ OS kurulumu
- ❌ Kiosk mode setup
- ❌ Network yapılandırma

### 🌐 Bölüm 4: Domain + Deployment
**İlerleme:** ⚪⚪⚪⚪⚪⚪⚪⚪ 0%
- ❌ Domain alımı
- ❌ Hosting setup
- ❌ CI/CD pipeline
- ❌ Monitoring
- ❌ Security

**GENEL İLERLEME:** 🟢⚪⚪⚪⚪⚪⚪⚪ 9%

---

## 📝 Notlar

- **Geliştirme Branch:** development
- **Ana Branch:** main (production)
- **React Version:** 18.x
- **Node Version:** 16.x+
- **Proje Kuralları:** `PROJECT_RULES.md` - **MUTLAKA UYULMALI!**

---

## 🚀 Öncelikli Sonraki Adımlar

### Kısa Vadeli (1-2 Hafta)
1. ✅ Survival mode player selection UI (Tamamlandı)
2. ⏳ Survival mode game screen (Devam ediyor)
3. ASO yok senaryosu test
4. Oyun bitimi seçenekleri (Tekrar Oyna / Yeni Maç)
5. Offline-first LocalStorage sistemi

### Orta Vadeli (1-2 Ay)
1. Backend mimari tasarımı ve karar alma
2. WebSocket server kurulumu
3. Kiosk display ekranı geliştirme
4. Database schema ve API endpoints
5. Raspberry Pi donanım tedarik ve kurulum

### Uzun Vadeli (3-6 Ay)
1. Production deployment
2. Domain ve hosting setup
3. CI/CD pipeline
4. Monitoring ve analytics
5. Security hardening
6. Performance optimization

---

## 🎯 Kilometre Taşları (Milestones)

- [ ] **Milestone 1:** Mobil Frontend Beta (Bölüm 1 %80) - Target: Aralık 2025
- [ ] **Milestone 2:** Backend MVP (Bölüm 2 %50) - Target: Ocak 2026
- [ ] **Milestone 3:** Raspberry Pi Prototype (Bölüm 3 %100) - Target: Şubat 2026
- [ ] **Milestone 4:** Production Release (Bölüm 4 %100) - Target: Mart 2026

---

## 🌍 EKOSİSTEM & REZERVASYON (Gelecek Vizyonu)
**Kapsam:** Kullanıcıların şehir/salon bazlı arama yapması, salonların doluluk oranlarını görmesi ve rezervasyon yapabilmesi.

**⏳ Yapılacaklar:**
- [ ] **Veri Yapısı Dönüşümü:**
  - [ ] `Salons` koleksiyonu oluşturulması (İl, İlçe, Adres, Partner Durumu).
  - [ ] `Tables` yapısının Salon altına taşınması veya ilişkilendirilmesi.
- [ ] **Kullanıcı Arayüzü (Explorer):**
  - [ ] Kullanıcının il seçebileceği ve o ildeki salonları listeleyebileceği ekran.
  - [ ] Salon detay sayfasında masaların anlık durumunun (Canlı/Boş) görselleştirilmesi.
- [ ] **Rezervasyon Sistemi (Partner Salonlar İçin):**
  - [ ] Takvim ve Saat Dilimi (Time Slot) altyapısı.
  - [ ] Rezervasyon oluşturma, onaylama ve iptal akışları.
  - [ ] "Randevum Var" butonu ile masayı rezerve eden kişinin QR ile masayı açması.

---

**Son Güncelleme:** 23 Kasım 2025  
**Versiyon:** 2.1.0 (Ekosistem Vizyonu Eklendi)

---

## 💡 ÖNERİLER

### 1. Performans İçin Küçük Bir Ayar
- Sakın Pi üzerinde geliştirme modunda (`npm start`) çalıştırma. Bu RAM'i sömürür ve cihazı ısındırır.
- Mutlaka Production Build (`npm run build`) alıp, bu statik dosyaları `serve` paketiyle veya hafif bir web sunucusuyla (NGINX gibi) sunmalısın. Pi bu şekilde çalışırken işlemci %5 bile yorulmaz, buz gibi çalışır.

### 2. Otomatik Güncelleme Sistemi
Pi her açıldığında (veya her gece belirli bir saatte) çalışacak basit bir bash scripti yazmalısın. Bu script şunu yapmalı:
1. İnternet var mı diye bakar.
2. Varsa, GitHub (veya GitLab) repona gidip "Değişiklik var mı?" (`git pull`) diye sorar.
3. Değişiklik varsa kodu çeker, `npm run build` alır ve sayfayı yeniler.
4. Yoksa aynen devam eder.
Böylece sen İstanbul'dan (veya ofisinden) kodu "push"ladığında, Türkiye'nin dört bir yanındaki skorbordlar sabah açıldığında kendini sessizce günceller.

### 3. Wi-Fi Ayarı İçin "USB Anahtarı" Yöntemi
Ağ ayarlarıyla uğraşmak istemiyorsan, en kodsuz ve sağlam çözüm budur.
- **Mantık:** Pi'ye bir script yazarsın. Bu script sürekli USB portlarını dinler.
- **Senaryo:** Wi-Fi değiştiğinde salon sahibine WhatsApp'tan bir dosya (`wifi.txt`) atarsın. "Abi bu dosyayı bir USB belleğe at, cihazın USB girişine tak." dersin.
- **İşleyiş:** Script, USB takıldığı an içindeki `wifi.txt`'yi okur, Pi'nin Wi-Fi ayarlarını (`wpa_supplicant.conf`) günceller ve cihaza reset atar.
- **Avantajı:** Arayüz yok, telefondan bağlanma derdi yok. Fiziksel müdahale ile kesin çözüm.

---

## 🧠 FİKİR ALIŞVERİŞİ & AR-GE (Gelecek Vizyonu)
**Not:** Bu bölüm, henüz uygulamaya geçirilmemiş ancak üzerinde tartışılan ve ileride tekrar değerlendirilecek fikirleri içerir.

### 1. Veritabanı Hiyerarşisi Dönüşümü (Firestore)
Mevcut "Tek Salon" yapısından "Çoklu Şehir/Salon" yapısına geçiş için önerilen yapı:
- **cities (Collection):** `id: "samsun"`, `districts: [...]`
- **salons (Collection):** 
  - `id`, `name`, `cityId`, `location: {lat, lng}`
  - `isPartner: true` (Rezervasyon alabilir mi?)
  - **tables (Sub-collection):** `id`, `name`, `status` (BUSY/IDLE/RESERVED), `currentMatchId`
- **reservations (Collection):** `salonId`, `tableId`, `userId`, `startTime`, `endTime`, `status`

### 2. Kullanıcı Deneyimi (User Journey)
- **Explorer (Keşfet):** Kullanıcının il/ilçe bazlı salon arayabilmesi.
- **Salon Detay:** 
  - Masaların anlık durumunun (Kırmızı/Yeşil/Sarı) görsel harita üzerinde gösterimi.
  - "Ahmet vs Mehmet" gibi canlı maç bilgilerinin balonucuk (tooltip) ile gösterimi.
- **Rezervasyon Akışı:**
  - Partner salonlar için saat aralığı seçimi.
  - Ödeme entegrasyonu veya "Kapıda Ödeme".
  - **QR Kod ile Masa Açma:** Rezervasyon sahibinin salona gidip QR okutarak masayı ve ışıkları otomatik açması (IoT).

### 3. Teknik Zorluklar & Çözümler
- **Anlık Senkronizasyon:** Salon detay sayfasında `onSnapshot` ile milisaniyelik masa durumu takibi.
- **Double Booking (Çifte Rezervasyon):** Firebase Transactions kullanılarak aynı saniyedeki rezervasyon çakışmalarının önlenmesi.
- **Admin Paneli:** Salon sahiplerinin rezervasyonları yönetmesi ve masaları manuel "Bakımda" moduna alabilmesi.

---

## 🧹 TEMİZLİK VE REFACTORING (Yayın Öncesi)
**Durum:** ⏳ Beklemede
**Açıklama:** Geliştirme sürecinde test amaçlı eklenen kodların temizlenmesi ve projenin canlıya hazırlanması.

**⏳ Yapılacaklar:**
- [ ] **Dijital Kumanda Temizliği (Kiosk):** `src/features/game/StandardGame.js` ve diğer oyun dosyalarındaki dijital kumanda (GameController) kodları, Kiosk sürümünden tamamen kaldırılacak veya sadece `export_package` (Mobil) derlemesinde aktif olacak şekilde ayrıştırılacak.
- [ ] **Test Kodları:** `isMobile` gibi geliştirme ortamında test kolaylığı sağlayan geçici mantıklar ana projeden temizlenecek.
- [ ] **Console Log:** Canlıya çıkmadan önce tüm `console.log` ifadeleri temizlenecek.
