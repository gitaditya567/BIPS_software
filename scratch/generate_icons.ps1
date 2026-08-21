Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\Final Full project website\School_ERP\frontend\public\bips-logo.png"
$outDir = "c:\Final Full project website\School_ERP\frontend\public\icons"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$srcImg = [System.Drawing.Image]::FromFile($sourcePath)

$sizes = @(72, 96, 128, 144, 152, 180, 192, 384, 512)

foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($srcImg, 0, 0, $s, $s)
    $dest = Join-Path $outDir ("icon-" + $s + "x" + $s + ".png")
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $dest"
}

# Maskable icons (with 15% safe-zone margin and dark navy background #1e3a5f)
$maskableSizes = @(192, 512)
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#1e3a5f")

foreach ($s in $maskableSizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear($bgColor)
    
    $padding = [int]($s * 0.15)
    $innerSize = $s - ($padding * 2)
    $g.DrawImage($srcImg, $padding, $padding, $innerSize, $innerSize)
    
    $dest = Join-Path $outDir ("icon-maskable-" + $s + "x" + $s + ".png")
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created maskable: $dest"
}

# Badge icon (72x72)
$badgeBmp = New-Object System.Drawing.Bitmap 72, 72
$gBadge = [System.Drawing.Graphics]::FromImage($badgeBmp)
$gBadge.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gBadge.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gBadge.Clear([System.Drawing.Color]::Transparent)
$gBadge.DrawImage($srcImg, 0, 0, 72, 72)
$badgeDest = Join-Path $outDir "badge-72x72.png"
$badgeBmp.Save($badgeDest, [System.Drawing.Imaging.ImageFormat]::Png)
$gBadge.Dispose()
$badgeBmp.Dispose()
Write-Host "Created badge: $badgeDest"

$srcImg.Dispose()
Write-Host "All icons generated successfully!"
