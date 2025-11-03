# Firebase Deployment Script for Cogniview
# This script deploys your Next.js app to Firebase Hosting

Write-Host ""
Write-Host "🔥 ═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔥   Firebase Deployment - Cogniview Store      " -ForegroundColor Cyan
Write-Host "🔥 ═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "🔍 Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseInstalled) {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host "📦 Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Firebase CLI" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Firebase CLI installed" -ForegroundColor Green
} else {
    Write-Host "✅ Firebase CLI found" -ForegroundColor Green
}

# Check if logged in
Write-Host ""
Write-Host "🔐 Checking Firebase authentication..." -ForegroundColor Yellow
firebase projects:list 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "🔑 Please login to Firebase..." -ForegroundColor Yellow
    firebase login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Firebase login failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Firebase authenticated" -ForegroundColor Green

# Clean previous builds
Write-Host ""
Write-Host "🧹 Cleaning old builds..." -ForegroundColor Yellow
if (Test-Path "out") { Remove-Item -Path "out" -Recurse -Force }
if (Test-Path ".next") { Remove-Item -Path ".next" -Recurse -Force }
Write-Host "✅ Old builds cleaned" -ForegroundColor Green

# Enable static export in next.config.js
Write-Host ""
Write-Host "⚙️  Configuring Next.js for static export..." -ForegroundColor Yellow
$configContent = Get-Content "next.config.js" -Raw
$configContent = $configContent -replace "// output: 'export',", "output: 'export',"
$configContent = $configContent -replace "// images:", "images:"
$configContent = $configContent -replace "//   unoptimized: true,", "  unoptimized: true,"
$configContent = $configContent -replace "// },", "},"
Set-Content "next.config.js" -Value $configContent
Write-Host "✅ Next.js configured for static export" -ForegroundColor Green

# Build Next.js app
Write-Host ""
Write-Host "🏗️  Building Next.js app..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    
    # Restore next.config.js
    $configContent = $configContent -replace "output: 'export',", "// output: 'export',"
    $configContent = $configContent -replace "images:", "// images:"
    $configContent = $configContent -replace "  unoptimized: true,", "//   unoptimized: true,"
    Set-Content "next.config.js" -Value $configContent
    
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green

# Deploy to Firebase Hosting
Write-Host ""
Write-Host "🌐 Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    
    # Restore next.config.js
    $configContent = Get-Content "next.config.js" -Raw
    $configContent = $configContent -replace "output: 'export',", "// output: 'export',"
    $configContent = $configContent -replace "images:", "// images:"
    $configContent = $configContent -replace "  unoptimized: true,", "//   unoptimized: true,"
    Set-Content "next.config.js" -Value $configContent
    
    exit 1
}

# Restore next.config.js for local development
Write-Host ""
Write-Host "🔄 Restoring config for local development..." -ForegroundColor Yellow
$configContent = Get-Content "next.config.js" -Raw
$configContent = $configContent -replace "output: 'export',", "// output: 'export',"
$configContent = $configContent -replace "images: \{", "// images: {"
$configContent = $configContent -replace "    unoptimized: true,", "//   unoptimized: true,"
$configContent = $configContent -replace "  \},", "// },"
Set-Content "next.config.js" -Value $configContent

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Your app is live at:" -ForegroundColor Cyan
Write-Host "   https://your-project.firebaseapp.com" -ForegroundColor White
Write-Host ""
Write-Host "📊 For IBM Data Prep Kit, you'll need to:" -ForegroundColor Yellow
Write-Host "   1. Deploy Firebase Functions (see FIREBASE-DEPLOYMENT-GUIDE.md)" -ForegroundColor White
Write-Host "   2. Use function URL for IBM Data Prep Kit" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Yellow
Write-Host "   - Run 'firebase init functions' to add backend" -ForegroundColor White
Write-Host "   - See FIREBASE-DEPLOYMENT-GUIDE.md for complete setup" -ForegroundColor White
Write-Host ""
