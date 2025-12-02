# Otomatik Export Senkronizasyon Script'i
# Her değişiklikte çalıştırın veya file watcher ile otomatikleştirin

Write-Host "Export Package senkronizasyonu basliyor..." -ForegroundColor Cyan

# Dosya yollarını tanımla
$sourceBase = "src"
$exportBase = "export_package/src/LiveScoreboard"

# Senkronize edilecek dosyalar
$filesToSync = @(
    @{ Source = "$sourceBase/services/firebase.js"; Dest = "$exportBase/services/firebase.js" },
    @{ Source = "$sourceBase/screens/StartScreen.js"; Dest = "$exportBase/screens/StartScreen.js" },
    @{ Source = "$sourceBase/screens/StartScreen.css"; Dest = "$exportBase/screens/StartScreen.css" },
    @{ Source = "$sourceBase/screens/ScoreboardReceiver.js"; Dest = "$exportBase/screens/ScoreboardReceiver.js" },
    @{ Source = "$sourceBase/screens/MobileController.js"; Dest = "$exportBase/screens/MobileController.js" },
    @{ Source = "$sourceBase/screens/MobileController.css"; Dest = "$exportBase/screens/MobileController.css" },
    @{ Source = "$sourceBase/screens/PenaltyScreen.js"; Dest = "$exportBase/screens/PenaltyScreen.js" },
    @{ Source = "$sourceBase/features/game/StandardGame.js"; Dest = "$exportBase/features/game/StandardGame.js" }
)

$successCount = 0
$failCount = 0

foreach ($file in $filesToSync) {
    try {
        if (Test-Path $file.Source) {
            Copy-Item -Path $file.Source -Destination $file.Dest -Force
            Write-Host "  [OK] $($file.Source) -> $($file.Dest)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  [UYARI] Kaynak dosya bulunamadi: $($file.Source)" -ForegroundColor Yellow
            $failCount++
        }
    } catch {
        Write-Host "  [HATA] $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "Sonuc: $successCount basarili, $failCount hatali" -ForegroundColor Cyan
Write-Host "Senkronizasyon tamamlandi!" -ForegroundColor Green
