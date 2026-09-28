param(
  [switch]$OpenAndroidStudio
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

Write-Step "Checking Node.js"
$NodeVersion = node -p "process.versions.node"
$NodeMajor = [int]($NodeVersion.Split(".")[0])

Write-Host "Node.js $NodeVersion"

if ($NodeMajor -lt 22) {
  throw "Capacitor 8 requires Node.js 22 or newer. Install Node 22 LTS, reopen PowerShell, then run this script again."
}

Write-Step "Installing dashboard + Capacitor dependencies"
npm.cmd install

Write-Step "Checking Capacitor CLI"
npx.cmd cap doctor

if (-not (Test-Path (Join-Path $RepoRoot "android"))) {
  Write-Step "Creating Android native project"
  npx.cmd cap add android
} else {
  Write-Step "Android native project already exists"
}

Write-Step "Syncing plugins and Capacitor configuration"
npx.cmd cap sync android

Write-Step "Final Capacitor doctor check"
npx.cmd cap doctor

Write-Step "Git changes created by setup"
git status --short

if ($OpenAndroidStudio) {
  Write-Step "Opening Android Studio"
  npx.cmd cap open android
} else {
  Write-Host ""
  Write-Host "Android environment is ready." -ForegroundColor Green
  Write-Host "Run: npm.cmd run android:open" -ForegroundColor Yellow
}
