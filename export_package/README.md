# LiveScoreboard Modülü Entegrasyon Rehberi

Bu paket, Bilardo Skor Tablosu (Scoreboard) ve Canlı Skor Yönetimi için geliştirilmiş modüler bir React yapısıdır. `3cscore.com` projesine entegre edilmek üzere hazırlanmıştır.

## 📂 Klasör Yapısı

Paket içeriği aşağıdaki gibidir:

```
src/
  LiveScoreboard/
    ├── components/       # Ortak UI bileşenleri (Skor paneli, oyuncu isimleri vb.)
    ├── features/         # Oyun mantığı (Standart maç, Survival modu vb.)
    ├── screens/          # Ana ekranlar (Başlangıç, Oyun ekranı, Bekleme ekranı)
    └── services/         # Firebase bağlantısı ve veri yönetimi
```

## 🚀 Kurulum ve Entegrasyon

### 1. Dosyaları Kopyalama
`src/LiveScoreboard` klasörünü kendi projenizin `src/` dizini altına kopyalayın.

### 2. Bağımlılıklar
Projenizde `firebase` paketinin kurulu olduğundan emin olun. Eğer kurulu değilse:

```bash
npm install firebase
```

### 3. Firebase Konfigürasyonu
`src/LiveScoreboard/services/firebase.js` dosyası Firebase bağlantısını yönetir. Bu dosya içerisindeki `firebaseConfig` objesini kendi Firebase proje ayarlarınızla güncellemeniz gerekebilir veya mevcut projenizdeki Firebase instance'ını buraya import edebilirsiniz.

## 💻 Kullanım

Ana uygulamanızda (örneğin `App.js`), `StartScreen` bileşenini çağırarak sistemi başlatabilirsiniz.

```javascript
import StartScreen from './LiveScoreboard/screens/StartScreen';
import GameController from './LiveScoreboard/GameController'; // Veya ilgili oyun ekranı
import { useState } from 'react';

function App() {
  const [gameMode, setGameMode] = useState(null);
  const [gameData, setGameData] = useState(null);

  // Standart Maç Başlatma
  const handleStart = (p1, p2, score, rack, penalty, aso) => {
    setGameData({ p1, p2, score, rack, penalty, aso });
    setGameMode('standard');
  };

  // Survival Maç Başlatma
  const handleSurvivalStart = (players) => {
    setGameData({ players });
    setGameMode('survival');
  };

  if (gameMode === 'standard') {
    return <GameController {...gameData} onBack={() => setGameMode(null)} />;
  }
  
  // ... Survival modu için ilgili component ...

  return (
    <StartScreen 
      onStart={handleStart} 
      onSurvivalStart={handleSurvivalStart} 
    />
  );
}
```

## 📡 Uzaktan Kontrol (Remote Control) Özelliği

Bu modül, bir cihazın (cep telefonu) kumanda, diğer cihazın (Raspberry Pi / TV) ise scoreboard olarak çalışmasını sağlayan bir yapı içerir.

### Nasıl Çalışır?
1.  **Scoreboard Modu (Alıcı):**
    *   `StartScreen` üzerinde sağ üstteki **"📺 Scoreboard Moduna Geç"** butonuna basılır.
    *   Cihaz `live_matches/table_1` verisini dinlemeye başlar.
    *   Komut geldiğinde otomatik olarak ilgili oyun modunu açar.

2.  **Kumanda Modu (Gönderici):**
    *   Telefondan `StartScreen` açılır.
    *   Oyuncular ve ayarlar seçilir.
    *   **"📡 Uzaktan Başlat"** butonuna basılır.
    *   Firebase üzerinden komut gönderilir ve Scoreboard cihazı maçı başlatır.

### Teknik Detay
*   **Dinleyici:** `src/LiveScoreboard/screens/ScoreboardReceiver.js`
*   **Servis:** `src/LiveScoreboard/services/firebase.js` -> `listenForMatchCommands` ve `sendRemoteStartCommand` fonksiyonları.

## ⚠️ Önemli Notlar
*   **Firebase İzinleri:** Firestore veritabanınızda `live_matches` koleksiyonuna okuma/yazma izni olduğundan emin olun.
*   **Stiller:** Bileşenler kendi CSS dosyalarını import eder (`.css`). Projenizdeki global stillerle çakışma olursa `className` öneklerini kontrol edebilirsiniz.

İyi çalışmalar!
