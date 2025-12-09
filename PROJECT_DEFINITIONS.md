# Proje Tanımları ve Terimler

Bu dosya, proje geliştirme sürecinde kullanılan terimlerin ve bileşenlerin ortak tanımlarını içerir.

## 1. Mobil Tarafı (Mobile Side)
*   **Tanım:** Mobil cihazlar üzerinden çalıştırılan arayüz.
*   **İşlev:** Uzaktan canlı maç başlatmak, oyunu yönetmek ve "kumanda" işlevi görmek için kullanılır.

## 2. Tabela Tarafı (Scoreboard Side)
*   **Tanım:** Skor tabelası uygulamasının yürütüldüğü ana ekran.
*   **Mevcut Durum:** Test aşamasında laptop/tarayıcı üzerinde çalışmaktadır.
*   **Hedef Durum:** Raspberry Pi üzerinde çalışacaktır.
*   **İşlev:** Maç skorunu, oyuncu bilgilerini ve oyun durumunu izleyicilere gösterir.

## 3. Tabela Ana Sayfa (Scoreboard Home)
*   **Tanım:** Proje başlatıldığında Tabela Tarafında görünen ilk ekran.
*   **İçerik:** Proje logosu bulunur.
*   **İşlev:** 
    *   "Canlı Maç Başlat" komutunu bekler (Listening Mode).
    *   Manuel olarak maç başlatma seçeneği sunar.

## 4. Server
*   **Tanım:** Raspberry Pi üzerine kurulacak arka uç hizmeti.
*   **Teknoloji:** Node.js ve Express.
*   **İşlev:** Sistem haberleşmesini ve veri akışını yönetir.

---

## 5. Ekran İsimlendirme Standardı (Screen Naming Convention)

Kodlama ve prompt yazma süreçlerinde aşağıdaki kısa isimler kullanılacaktır:

### Mobil Tarafı Ekranları

| Kısa İsim | Açıklama | Dosya Yolu |
|-----------|----------|------------|
| **MobileSSPage** | Mobil StartScreen Ekranı - Maç başlatma, oyuncu/masa seçimi | `src/screens/StartScreen.js` |
| **LiveMatchControlPage** | Canlı Maç Kontrol Ekranı - Kumanda işlevi (readOnly=false) | `src/screens/MobileController.js` |
| **LiveMatchViewPage** | Canlı Maç Takip Ekranı - Sadece izleme (readOnly=true) | `src/screens/MobileController.js` |

### Tarayıcı (Pi) Tarafı Ekranları

| Kısa İsim | Açıklama | Dosya Yolu |
|-----------|----------|------------|
| **PiMainPage** | Raspberry Pi Ana Sayfa - Logo ve mod seçimi | `src/App.js` (ana router) |
| **3CscoreModeSSPage** | 3cScore Mode StartScreen - Yerel maç başlatma | `src/screens/StartScreen.js` (local mode) |
| **SurvivalModeSSPage** | Survival Mode StartScreen - Survival maç başlatma | `src/screens/StartScreen.js` (survival tab) |

### Scoreboard Uygulamaları

| Kısa İsim | Açıklama | Dosya Yolu |
|-----------|----------|------------|
| **StandardGameApp** | Standart Oyun Uygulaması (Serbest + 3cScore Mode) | `src/features/game/StandardGame.js` |
| **SurvivalApp** | Survival Mode Scoreboard Uygulaması | `src/features/game/SurvivalGame.js` |

### Notlar
- **FreeMatchApp** ve **3CscoreboardApp** aynı `StandardGame.js` dosyasını kullanır, bu yüzden birleştirildi: **StandardGameApp**
- **LiveMatchControlPage** ve **LiveMatchViewPage** aynı `MobileController.js` dosyasını kullanır, `readOnly` prop'u ile ayrılır
