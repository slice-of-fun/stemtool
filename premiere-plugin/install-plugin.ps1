# StemTool Premiere Pro Extension - 1-Click Windows Installer
# Deploys plugin to Adobe CEP extensions folder and configures PlayerDebugMode

$ErrorActionPreference = "Stop"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  StemTool Audio Splitter - Premiere Pro Plugin" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$pluginDir = $PSScriptRoot
$cepExtensionsDir = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$targetDir = Join-Path $cepExtensionsDir "com.stemtool.premiere"

# 1. Create CEP extensions directory if not exists
if (-not (Test-Path $cepExtensionsDir)) {
    New-Item -ItemType Directory -Force -Path $cepExtensionsDir | Out-Null
}

# 2. Deploy plugin files (clean old directory if present)
if (Test-Path $targetDir) {
    Write-Host "> Updating existing installation at: $targetDir" -ForegroundColor Yellow
    Remove-Item -Recurse -Force $targetDir
} else {
    Write-Host "> Installing plugin to: $targetDir" -ForegroundColor Yellow
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

# Copy plugin contents excluding git/scripts
Copy-Item -Path (Join-Path $pluginDir "CSXS") -Destination $targetDir -Recurse -Force
Copy-Item -Path (Join-Path $pluginDir "css") -Destination $targetDir -Recurse -Force
Copy-Item -Path (Join-Path $pluginDir "js") -Destination $targetDir -Recurse -Force
Copy-Item -Path (Join-Path $pluginDir "jsx") -Destination $targetDir -Recurse -Force
Copy-Item -Path (Join-Path $pluginDir "index.html") -Destination $targetDir -Force
if (Test-Path (Join-Path $pluginDir "README.md")) {
    Copy-Item -Path (Join-Path $pluginDir "README.md") -Destination $targetDir -Force
}

# 3. Configure Adobe PlayerDebugMode in Windows Registry (CSXS 9 through 16)
Write-Host "> Enabling Adobe CEP PlayerDebugMode in Windows Registry..." -ForegroundColor Yellow
for ($v = 9; $v -le 16; $v++) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$v"
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -Force | Out-Null
}

Write-Host ""
Write-Host "SUCCESS! StemTool Premiere Pro Plugin is installed." -ForegroundColor Green
Write-Host ""
Write-Host "How to use:" -ForegroundColor White
Write-Host "1. Restart Adobe Premiere Pro." -ForegroundColor Gray
Write-Host "2. Open any sequence with an audio track." -ForegroundColor Gray
Write-Host "3. Go to top menu: Window > Extensions > StemTool Audio Splitter" -ForegroundColor Cyan
Write-Host "4. Select an audio clip on your timeline and click 'Split Selected Audio'!" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Cyan

