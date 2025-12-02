# 🚨 BilardoSkorScoreBoard - Kritik Proje Kuralları

Bu dosya projenin geliştirilmesi sırasında **mutlaka** uyulması gereken kritik kuralları içerir.

---

## 📋 VERİ TABANI KURALLARI

### ⛔ KURAL 1: DEVELOP AŞAMASINDA VERİ TABANI YAZMA YASAĞI
**Durum:** 🔴 KRİTİK  
**Açıklama:**
- Development branch'inde **ASLA** Firebase veya herhangi bir veritabanına yazma (write/update/delete) işlemi yapılamaz
- Sadece **OKUMA (GET/READ)** işlemleri yapılabilir
- Test verisi ekleme, güncelleme veya silme işlemleri **YASAKTIR**

**İzin Verilen İşlemler:**
- ✅ `getPlayerNames()` - Oyuncu listesi okuma
- ✅ `firebase.firestore().collection('users').get()` - Veri okuma
- ✅ `firebase.database().ref('path').once('value')` - Veri okuma

**YASAK İşlemler:**
- ❌ `firebase.firestore().collection().add()` - Veri ekleme
- ❌ `firebase.firestore().collection().doc().set()` - Veri yazma
- ❌ `firebase.firestore().collection().doc().update()` - Veri güncelleme
- ❌ `firebase.firestore().collection().doc().delete()` - Veri silme
- ❌ `firebase.database().ref().set()` - Realtime DB yazma
- ❌ `firebase.database().ref().push()` - Realtime DB ekleme

**Neden:**
- Production verisini korumak
- Test verilerinin canlı veritabanına karışmasını önlemek
- Veri bütünlüğünü sağlamak

**Test İçin:**
- Local mock data kullan
- Firebase Emulator Suite kullan (gelecekte)
- Test için ayrı Firebase projesi oluştur (gelecekte)

---

## 🔒 GİT VE BRANCH KURALLARI

### KURAL 2: BRANCH YAPISI
- **main**: Production (sadece merge edilir, direkt commit edilmez)
- **development**: Geliştirme (tüm yeni özellikler burada geliştirilir)
- **feature/[feature-name]**: Büyük özellikler için ayrı branch'ler (opsiyonel)

### KURAL 3: COMMIT MESAJ FORMATI
```
<tip>: <kısa açıklama>

<detaylı açıklama (opsiyonel)>
```

**Commit Tipleri:**
- `feat:` - Yeni özellik
- `fix:` - Bug düzeltme
- `refactor:` - Kod iyileştirme (özellik değişikliği yok)
- `style:` - CSS/UI değişiklikleri
- `docs:` - Dokümantasyon
- `test:` - Test ekleme/düzeltme
- `chore:` - Bakım işleri (dependency update vb.)

**Örnek:**
```
feat: Add Survival mode player selection UI

- Added tab system to StartScreen
- Created 4 player dropdown with smart filtering
- Minimum 3 players validation
```

### KURAL 4: DEVELOPMENT'TAN MAIN'E MERGE
- Sadece stabil ve test edilmiş kod main'e merge edilir
- Merge öncesi code review yapılır
- Main branch her zaman çalışır durumda olmalıdır

---

## 💾 DOSYA VE KLASÖR KURALLARI

### KURAL 5: DOSYA ADLANDIRMA
- React Component dosyaları: **PascalCase** (örn: `StartScreen.js`)
- Utility dosyaları: **camelCase** (örn: `firebase.js`)
- CSS dosyaları: Component ile aynı isim (örn: `StartScreen.css`)
- Markdown dosyaları: **UPPERCASE** (örn: `README.md`, `TODO.md`)

### KURAL 6: DOSYA YAPISI
```
src/
├── App.js                  # Ana uygulama
├── StartScreen.js          # Başlangıç ekranı
├── GameController.js       # Kumanda komponenti
├── PenaltyScreen.js        # Penaltı ekranı
├── [Component].js          # Diğer komponentler
├── [Component].css         # Component CSS'leri
├── firebase.js             # Firebase config ve fonksiyonlar
└── index.js                # Entry point
```

### KURAL 7: IMPORT SIRASI
1. React ve React kütüphaneleri
2. Üçüncü parti kütüphaneler
3. Kendi komponentlerimiz
4. CSS dosyaları

**Örnek:**
```javascript
import React, { useState, useEffect } from 'react';
import SomeLibrary from 'some-library';
import MyComponent from './MyComponent';
import './MyComponent.css';
```

---

## 🎨 KOD YAZIM KURALLARI

### KURAL 8: STATE YÖNETİMİ
- State isimleri açıklayıcı olmalı (örn: `player1Score` değil `p1s`)
- Boolean state'ler `is`, `has`, `should` ile başlamalı (örn: `isTimerRunning`)
- Setter fonksiyonları `set` prefix'i ile başlamalı (örn: `setPlayer1Score`)

### KURAL 9: FONKSIYON ADLANDIRMA
- Event handler'lar `handle` ile başlamalı (örn: `handlePlusRun`)
- Hesaplama fonksiyonları `calculate` ile başlamalı (örn: `calculateHRStats`)
- Boolean dönen fonksiyonlar soru cümlesi gibi (örn: `isTargetReached`)

### KURAL 10: YORUM SATIRI KULLANIMI
- Karmaşık mantık için yorum ekle
- Self-explanatory kod yazmaya çalış
- TODO yorumları için format: `// TODO: [açıklama]`
- Büyük bölümleri ayırmak için: `// ========== SECTION NAME ==========`

**Örnek:**
```javascript
// Hedef skora ulaşıldı mı kontrolü
const isTargetReached = currentScore + runCount >= targetScore;

// TODO: Survival mode için skor hesaplama fonksiyonu eklenecek
```

---

## 🧪 TEST VE KALİTE KURALLARI

### KURAL 11: TEST ÖNCESİ KONTROL LİSTESİ
Commit öncesi aşağıdaki kontroller yapılmalı:
- [ ] Kod derleniyor mu? (`npm start` çalışıyor mu?)
- [ ] Console'da hata var mı?
- [ ] Tüm butonlar ve özellikler çalışıyor mu?
- [ ] Firebase read işlemleri çalışıyor mu?
- [ ] Firebase write işlemi VAR MI? (OLMAMALI!)
- [ ] TODO.md güncel mi?

### KURAL 12: PERFORMANS
- Gereksiz re-render'ları önle (useMemo, useCallback kullan)
- Büyük listeler için virtualization kullan
- State'i gereksiz yere global tutma
- useEffect dependency array'lerini doğru kullan

### KURAL 13: RESPONSIVE TASARIM
- Mobil first yaklaşım
- Tüm ekranlar 320px-1920px arası test edilmeli
- Touch-friendly buton boyutları (minimum 44x44px)
- Yatay/dikey ekran desteği

---

## 🔐 GÜVENLİK KURALLARI

### KURAL 14: FIREBASE CONFIG
- Firebase config bilgileri `.env` dosyasında (gelecekte)
- API Key'ler asla hardcoded olmamalı
- `.gitignore` dosyası güncel tutulmalı

### KURAL 15: KULLANICI VERİSİ
- Kullanıcı verisi localStorage'da saklanabilir
- Hassas bilgiler encrypt edilmeli
- GDPR uyumlu veri işleme

---

## 📚 DOKÜMANTASYON KURALLARI

### KURAL 16: ZORUNLU DOSYALAR
Projede mutlaka bulunması gereken dosyalar:
- ✅ `README.md` - Proje tanıtımı
- ✅ `TODO.md` - Yapılacaklar listesi
- ✅ `PROJECT_RULES.md` - Bu dosya
- ⏳ `CHANGELOG.md` - Versiyon değişiklikleri (gelecekte)
- ⏳ `API_DOCS.md` - API dokümantasyonu (backend hazır olunca)

### KURAL 17: README.md GÜNCEL TUTMA
- Yeni özellik eklendikçe README güncellenmeli
- Kurulum adımları her zaman güncel olmalı
- Ekran görüntüleri güncel tutulmalı

### KURAL 18: TODO.md GÜNCEL TUTMA
- Her yeni görev TODO.md'ye eklenmeli
- Tamamlanan görevler ✅ işaretlenmeli
- Devam eden görevler 🔄 işaretlenmeli
- İptal edilen görevler ❌ işaretlenmeli

---

## 🚀 DEPLOYMENT KURALLARI

### KURAL 19: PRODUCTION'A GEÇİŞ ÖNCESİ
- Tüm console.log'lar temizlenmeli
- Test kodları kaldırılmalı
- Build başarılı olmalı (`npm run build`)
- Lighthouse score kontrol edilmeli (Performance, Accessibility, Best Practices, SEO)
- Farklı tarayıcılarda test edilmeli (Chrome, Firefox, Safari, Edge)

### KURAL 20: VERSIYON NUMARALARI
Semantic Versioning kullanılmalı: `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes
- **MINOR**: Yeni özellik (backward compatible)
- **PATCH**: Bug fix

**Örnek:** `v1.2.3`

---

## ⚠️ KURAL İHLALİ DURUMLARI

### 🚨 KRİTİK İHLAL (Derhal düzeltilmeli)
- Development'ta veritabanına yazma işlemi
- Main branch'e direkt commit
- Production verisi ile test yapma
- Hassas bilgileri commit etme

### ⚠️ ÖNEM DERECESİ YÜKSEK (En kısa sürede düzeltilmeli)
- Kod derleme hatası
- Broken main branch
- Güncel olmayan dokümantasyon
- Test edilmemiş kod

### ℹ️ ÖNEM DERECESİ ORTA (Fırsat bulunca düzeltilmeli)
- Kod formatı tutarsızlığı
- Eksik yorum satırları
- Performans optimizasyonu gereken yerler

---

## 📞 İLETİŞİM VE DESTEK

**Proje Sahipleri:**
- GitHub: UserMan55
- Repository: BilardoSkorScoreBoard

**Sorun Bildirimi:**
- GitHub Issues kullanılmalı
- Bug report template'i takip edilmeli
- Ekran görüntüsü ve log eklenmeli

---

## 📋 KURALLAR KONTROL LİSTESİ

Her commit öncesi bu kontrol listesini gözden geçir:

- [ ] **KURAL 1**: Veritabanına yazma işlemi yapmadım ✅
- [ ] **KURAL 3**: Commit mesajı format uygun ✅
- [ ] **KURAL 11**: Test kontrol listesini tamamladım ✅
- [ ] **KURAL 18**: TODO.md güncelledim ✅
- [ ] Console'da hata yok ✅
- [ ] Kod derleniyor ✅
- [ ] Tüm özellikler çalışıyor ✅

---

**Son Güncelleme:** 18 Kasım 2025  
**Versiyon:** 1.0.0

---

## 🎯 ÖNEMLİ NOT

Bu kurallar projenin kalitesini, güvenliğini ve sürdürülebilirliğini sağlamak için belirlenmiştir. 

**Bu kurallar tavsiye değil, ZORUNLULUKTUR!** ⚠️

Herhangi bir kural değişikliği önerisi için GitHub Issues'a bildirin.

---

*"Kaliteli kod, disiplinli geliştirmenin sonucudur."* 💻
