Add-Type -AssemblyName System.Drawing
$fixedRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/review-evidence/2026-11-03-fixed-view'))
$bitmap = New-Object System.Drawing.Bitmap 1350, 640
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font 'Segoe UI', 13
$files = @('live.png','line.png','flat.png')
$labels = @('LIVE 3D / SAME ANGLE','FIXED 2.5D / LINE','FIXED 2.5D / FLAT')
for ($i = 0; $i -lt 3; $i++) {
  $graphics.DrawString($labels[$i], $font, [System.Drawing.Brushes]::Black, (450 * $i + 10), 10)
  $img = [System.Drawing.Image]::FromFile((Join-Path $fixedRoot $files[$i]))
  $graphics.DrawImage($img, (450 * $i), 36, 450, 600)
  $img.Dispose()
}
$bitmap.Save((Join-Path $fixedRoot 'style-comparison.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$font.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
