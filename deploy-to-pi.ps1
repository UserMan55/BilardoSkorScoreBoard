# Pi Güncelleme Script'i
# Bu script Windows'ta çalıştırılır ve Pi'yi otomatik günceller
#
# Kullanım: .\deploy-to-pi.ps1 -PiIP "192.168.1.X"
#
# Parametreler:
#   -PiIP: Pi'nin IP adresi (zorunlu)
#   -PiUser: Pi kullanıcı adı (varsayılan: pi)
#   -PiPassword: Pi şifresi (varsayılan: skorboard)

param(
    [Parameter(Mandatory=$true)]
    [string]$PiIP,
    
    [string]$PiUser = "pi",
    [string]$PiPassword = "skorboard"
)

$ErrorActionPreference = "Stop"

Write-Host "🎱 Bilardo Skorboard - Pi Güncelleme" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Build oluştur
Write-Host "`n📦 Pi build oluşturuluyor..." -ForegroundColor Yellow
npm run build:pi
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build başarısız!" -ForegroundColor Red
    exit 1
}

# 2. ZIP oluştur
Write-Host "`n📁 ZIP dosyası oluşturuluyor..." -ForegroundColor Yellow
$zipPath = "pi-skorboard-build.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path "build\*" -DestinationPath $zipPath

# 3. Pi'ye yükle
Write-Host "`n📤 Dosya Pi'ye yükleniyor ($PiIP)..." -ForegroundColor Yellow
scp $zipPath "${PiUser}@${PiIP}:/home/pi/skorboard.zip"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Dosya yükleme başarısız!" -ForegroundColor Red
    exit 1
}

# 4. Pi'de güncelleme script'ini çalıştır
Write-Host "`n🔄 Pi'de güncelleme uygulanıyor..." -ForegroundColor Yellow
ssh "${PiUser}@${PiIP}" "chmod +x /home/pi/update.sh && /home/pi/update.sh"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Güncelleme başarısız!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Pi başarıyla güncellendi!" -ForegroundColor Green
Write-Host "🌐 Skorboard: http://$PiIP" -ForegroundColor Cyan
