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

Write-Step "Checking Java for Android Gradle"
$JavaVersionOutput = & java -version 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
  throw "Java was not found. Install JDK 21 and set JAVA_HOME before running this script."
}

if ($JavaVersionOutput -notmatch 'version "21[\.]') {
  Write-Host $JavaVersionOutput
  throw "This Capacitor 8 Android project must run Gradle with JDK 21. Android Studio may bundle a newer JBR that is not compatible with Gradle 8.14.3. Set JAVA_HOME to a JDK 21 installation and run the script again."
}

Write-Host "JDK 21 detected"

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
