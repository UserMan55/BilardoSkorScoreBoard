param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [string[]]$Paths = @('.'),

    [switch]$Push,

    [string]$Branch = 'development',

    [switch]$DryRun,

    [switch]$SkipStatus
)

$ErrorActionPreference = 'Stop'

function Invoke-GitCommand {
    param(
        [string[]]$Arguments
    )

    Write-Host "`n> git $($Arguments -join ' ')" -ForegroundColor Cyan

    $mutatingCommands = @('add', 'commit', 'push')
    if ($DryRun -and $mutatingCommands -contains $Arguments[0]) {
        Write-Host 'DRY RUN: Komut çalıştırılmadı.' -ForegroundColor Yellow
        return
    }

    git @Arguments
}

$repoRoot = git rev-parse --show-toplevel
if (-not $repoRoot) {
    throw 'Git deposu tespit edilemedi. Lütfen scripti repo içinde çalıştırın.'
}
Set-Location $repoRoot

if (-not $SkipStatus) {
    Invoke-GitCommand -Arguments @('status', '-sb')
}

$addArgs = @('add', '--') + $Paths
Invoke-GitCommand -Arguments $addArgs

if (-not $SkipStatus) {
    Invoke-GitCommand -Arguments @('status', '-sb')
}

Invoke-GitCommand -Arguments @('commit', '-m', $Message)

if ($Push) {
    Invoke-GitCommand -Arguments @('push', 'origin', $Branch)
} else {
    Write-Host "`nPush atlandı. Origin'e göndermek için: git push origin $Branch" -ForegroundColor DarkGray
}

Write-Host "`nGit otomasyon scripti tamamlandı." -ForegroundColor Green
