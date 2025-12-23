# 🎱 3cscore.com → live.3cscore.com Yönlendirme Butonu

Bu dosya 3cscore.com sitesine eklenecek "Canlı Skorboard" butonunun kodlarını içerir.

**Firebase Versiyon:** v12.5.0 (aynı versiyon)
**React Versiyon:** v19.2.0

---

## 📋 Gönderilecek Veriler

| Parametre | Zorunlu | Açıklama |
|-----------|---------|----------|
| `token` | ✅ EVET | Firebase ID Token (1 saat geçerli) |
| `userId` | ✅ EVET | Firebase User UID |

> **Not:** Diğer kullanıcı bilgileri (isim, fotoğraf vb.) live.3cscore.com tarafında Firebase'den çekilecek.

---

## 🔹 REACT COMPONENT - Kopyala Yapıştır

```jsx
// LiveScoreboardButton.js
// Bu dosyayı components klasörüne ekle ve istediğin yerde kullan

import { auth } from '../services/firebase'; // veya sizin firebase import yolunuz

function LiveScoreboardButton() {
  
  const handleClick = async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        alert('Lütfen önce giriş yapın!');
        return;
      }
      
      // Firebase ID Token al
      const idToken = await currentUser.getIdToken(true);
      
      // URL oluştur
      const params = new URLSearchParams({
        token: idToken,
        userId: currentUser.uid
      });
      
      // Yönlendir
      window.location.href = `https://live.3cscore.com?${params.toString()}`;
      
    } catch (error) {
      console.error('Yönlendirme hatası:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <button 
      onClick={handleClick}
      style={{
        backgroundColor: '#27ae60',
        color: 'white',
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      🎱 Canlı Skorboard
    </button>
  );
}

export default LiveScoreboardButton;
```

---

## 🔹 VANILLA JAVASCRIPT VERSİYONU

```html
<!-- HTML Butonu -->
<button id="liveScoreboardBtn" class="live-scoreboard-btn">
  🎱 Canlı Skorboard
</button>

<style>
.live-scoreboard-btn {
  background-color: #27ae60;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
.live-scoreboard-btn:hover {
  background-color: #219a52;
}
</style>

<script type="module">
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

document.getElementById('liveScoreboardBtn').addEventListener('click', async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      alert('Lütfen önce giriş yapın!');
      return;
    }
    
    // Firebase ID Token al
    const idToken = await currentUser.getIdToken(true);
    
    // URL parametrelerini hazırla
    const params = new URLSearchParams({
      token: idToken,
      userId: currentUser.uid
    });
    
    // Yönlendir
    window.location.href = `https://live.3cscore.com?${params.toString()}`;
    
  } catch (error) {
    console.error('Hata:', error);
    alert('Bir hata oluştu');
  }
});
</script>
```

---

## 🔹 MEVCUT FIREBASE INSTANCE KULLANARAK

Eğer 3cscore.com'da zaten Firebase auth instance'ı varsa:

```javascript
// auth zaten tanımlıysa
async function goToLiveScoreboard() {
  const currentUser = auth.currentUser; // veya firebase.auth().currentUser
  
  if (!currentUser) {
    alert('Lütfen önce giriş yapın!');
    return;
  }
  
  const idToken = await currentUser.getIdToken(true);
  
  const params = new URLSearchParams({
    token: idToken,
    userId: currentUser.uid
  });
  
  window.location.href = `https://live.3cscore.com?${params.toString()}`;
}

// Butona bağla
document.querySelector('.live-btn').onclick = goToLiveScoreboard;
```

---

## 🔹 YENİ SEKMEDE AÇMAK İSTERSENİZ

```javascript
// Aynı sayfada yönlendirme yerine yeni sekmede açmak için:
window.open(`https://live.3cscore.com?${params.toString()}`, '_blank');
```

---

## ⚠️ ÖNEMLİ NOTLAR

1. **Token Süresi:** Firebase ID Token 1 saat geçerlidir. `getIdToken(true)` her seferinde taze token alır.

2. **HTTPS Zorunlu:** Token URL'de gönderildiği için HTTPS şart (zaten live.3cscore.com HTTPS).

3. **Test:** 
   - Giriş yapmadan butona tıkla → "Lütfen giriş yapın" uyarısı
   - Giriş yapıp tıkla → live.3cscore.com açılmalı

4. **Konsol Kontrolü:** Hata durumunda tarayıcı konsolunu kontrol et.

---

## 📧 Sorularınız İçin

Entegrasyon sırasında sorun yaşarsanız bize ulaşın.

---

*Son güncelleme: 23 Aralık 2025*
