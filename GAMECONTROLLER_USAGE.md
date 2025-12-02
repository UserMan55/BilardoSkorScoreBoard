# GameController Kullanım Kılavuzu

## 📱 Modlar

GameController üç farklı modda çalışabilir:

### 1. **Floating Mode** (Varsayılan)
- Masaüstünde küçük, sürüklenebilir modal
- Mobilde otomatik olarak fullscreen'e dönüşür
- Ekranın sağ üstünde başlar

### 2. **Fullscreen Mode**
- Tam ekran overlay
- Arka plan blur ve karartma
- Mobil cihazlar için optimize
- Merkeze hizalı, büyük görünüm

### 3. **Embedded Mode**
- Başka komponentlere gömülebilir
- Flexbox ile hizalanabilir
- Farklı sayfalarda kullanılabilir

---

## 🎮 Kullanım Örnekleri

### Örnek 1: Varsayılan Kullanım (Floating)
```jsx
<GameController 
  onPlusRun={handlePlusRun}
  onMinusRun={handleMinusRun}
  onToggleTimer={handleToggleTimer}
  onOk={handleOk}
  onExit={handleExit}
  onUndo={handleUndo}
  isTimerRunning={isTimerRunning}
  gameEnded={gameEnded}
  currentScore={currentScore}
  runCount={runCount}
  targetScore={targetScore}
  canUndo={history.length > 0}
  isVisible={true}
/>
```

### Örnek 2: Fullscreen Mode
```jsx
<GameController 
  mode="fullscreen"
  onPlusRun={handlePlusRun}
  onMinusRun={handleMinusRun}
  onToggleTimer={handleToggleTimer}
  onOk={handleOk}
  onExit={handleExit}
  onUndo={handleUndo}
  isTimerRunning={isTimerRunning}
  gameEnded={gameEnded}
  currentScore={currentScore}
  runCount={runCount}
  targetScore={targetScore}
  canUndo={history.length > 0}
  isVisible={showController}
  
  // Opsiyonel: Menü butonları için
  onLeftMenu={() => console.log('Sol menü')}
  onRightMenu={() => console.log('Sağ menü')}
/>
```

### Örnek 3: Embedded Mode (Sidebar'da)
```jsx
<div className="sidebar">
  <h2>Kumanda</h2>
  <GameController 
    mode="embedded"
    onPlusRun={handlePlusRun}
    onMinusRun={handleMinusRun}
    onToggleTimer={handleToggleTimer}
    onOk={handleOk}
    onExit={handleExit}
    onUndo={handleUndo}
    isTimerRunning={isTimerRunning}
    gameEnded={gameEnded}
    currentScore={currentScore}
    runCount={runCount}
    targetScore={targetScore}
    canUndo={history.length > 0}
    isVisible={true}
  />
</div>
```

### Örnek 4: Mobil Tam Ekran Toggle
```jsx
const [showMobileController, setShowMobileController] = useState(false);

// Buton ile aç
<button onClick={() => setShowMobileController(true)}>
  Kumanda Aç
</button>

// Fullscreen controller
<GameController 
  mode="fullscreen"
  isVisible={showMobileController}
  onExit={() => setShowMobileController(false)}
  // ... diğer props
/>
```

---

## 📋 Props Listesi

| Prop | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|-----------|----------|
| `mode` | `'floating'` \| `'fullscreen'` \| `'embedded'` | Hayır | `'floating'` | Kumanda modu |
| `isVisible` | `boolean` | Evet | - | Kumanda görünürlüğü |
| `onPlusRun` | `function` | Evet | - | Plus butonu callback |
| `onMinusRun` | `function` | Evet | - | Minus butonu callback |
| `onToggleTimer` | `function` | Evet | - | Timer butonu callback |
| `onOk` | `function` | Evet | - | OK butonu callback |
| `onExit` | `function` | Evet | - | Exit butonu callback |
| `onUndo` | `function` | Evet | - | Undo butonu callback |
| `onLeftMenu` | `function` | Hayır | `null` | Sol menü butonu callback |
| `onRightMenu` | `function` | Hayır | `null` | Sağ menü butonu callback |
| `isTimerRunning` | `boolean` | Evet | - | Timer durumu |
| `gameEnded` | `boolean` | Evet | - | Oyun bitmiş mi? |
| `currentScore` | `number` | Evet | - | Mevcut skor |
| `runCount` | `number` | Evet | - | Run sayısı |
| `targetScore` | `number` | Evet | - | Hedef skor |
| `canUndo` | `boolean` | Evet | - | Undo yapılabilir mi? |
| `currentPlayerName` | `string` | Hayır | - | Oyuncu adı (info için) |
| `currentTurn` | `number` | Hayır | - | Oyuncu sırası (info için) |
| `onToggleVisibility` | `function` | Hayır | - | Görünürlük toggle |

---

## 🎨 Özelleştirme

### CSS Sınıfları
```css
/* Floating mode */
.remote-controller { }
.remote-body { }
.remote-body-floating { }

/* Fullscreen mode */
.remote-fullscreen-overlay { }
.remote-fullscreen-container { }
.remote-body-fullscreen { }

/* Embedded mode */
.remote-embedded { }
.remote-body-embedded { }
```

### Responsive Davranış
- **Desktop (>768px):** Floating mode aktif
- **Mobile (≤768px):** Otomatik fullscreen'e geçer
- **Tablet:** Embedded mode önerilir

---

## 🔧 İpuçları

1. **Mobil Deneyim:** Floating mode mobilde otomatik fullscreen olur
2. **Menü Butonları:** `onLeftMenu` ve `onRightMenu` sadece gerektiğinde ekleyin
3. **Numpad:** Çift tıkla aç/kapat özelliği her modda çalışır
4. **Performans:** Mode değişikliği re-render oluşturur, dikkatli kullanın

---

## 📱 Mobil Kullanım Örneği

```jsx
function MobileGameScreen() {
  const [controllerVisible, setControllerVisible] = useState(false);
  const isMobile = window.innerWidth <= 768;

  return (
    <div>
      {/* Oyun ekranı */}
      <div className="game-area">
        {/* ... oyun içeriği ... */}
      </div>

      {/* Mobilde floating buton */}
      {isMobile && (
        <button 
          className="floating-controller-btn"
          onClick={() => setControllerVisible(true)}
        >
          🎮
        </button>
      )}

      {/* Kumanda */}
      <GameController 
        mode={isMobile ? "fullscreen" : "floating"}
        isVisible={controllerVisible}
        onExit={() => setControllerVisible(false)}
        // ... diğer props
      />
    </div>
  );
}
```

---

## 🎯 En İyi Pratikler

✅ **DO:**
- Mobilde fullscreen kullan
- Desktop'ta floating kullan
- Embedded modu sidebar/panel'lerde kullan
- `isVisible` ile göster/gizle kontrol et

❌ **DON'T:**
- Mode'u sık sık değiştirme
- Birden fazla aynı mode'da kumanda açma
- Floating mode'u mobilde zorlama
