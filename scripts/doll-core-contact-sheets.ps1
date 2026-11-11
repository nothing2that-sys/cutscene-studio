Add-Type -AssemblyName System.Drawing
$coreRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/review-evidence/2026-11-03-doll-core'))
function New-CoreSheet($fileName, $images, $labels, $columns) {
  $rows = [int][Math]::Ceiling($images.Count / $columns)
  $bitmap = New-Object System.Drawing.Bitmap (450 * $columns), (640 * $rows)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font 'Segoe UI', 13
  for ($i = 0; $i -lt $images.Count; $i++) {
    $x = 450 * ($i % $columns); $y = 640 * [Math]::Floor($i / $columns)
    $graphics.DrawString($labels[$i], $font, [System.Drawing.Brushes]::Black, ($x + 10), ($y + 10))
    $img = [System.Drawing.Image]::FromFile((Join-Path $coreRoot $images[$i]))
    $graphics.DrawImage($img, [int]$x, [int]($y + 36), 450, 600)
    $img.Dispose()
  }
  $bitmap.Save((Join-Path $coreRoot $fileName), [System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
New-CoreSheet 'assembly-four-views.png' @('assembly-front.png','assembly-side.png','assembly-back.png','assembly-oblique.png') @('CORE - FRONT','CORE - SIDE / inferred depth','CORE - BACK / inferred anatomy','CORE - OBLIQUE') 4
New-CoreSheet 'parts-inspection.png' @('thorax-front.png','abdomen-front.png','pelvis-front.png','thorax-oblique.png','abdomen-oblique.png','pelvis-oblique.png') @('THORAX / FRONT','ABDOMEN / FRONT','PELVIS / FRONT','THORAX / OBLIQUE','ABDOMEN / OBLIQUE','PELVIS / OBLIQUE') 3
New-CoreSheet 'core-source-comparison.png' @('reference-source-crop.png','reference.png','reference-overlay.png') @('SOURCE - CORE CROP','ACTUAL 3D - RIGID POSE PRESET','SOURCE + SILHOUETTE OVERLAY') 3
New-CoreSheet 'core-assembly-study.png' @('assembly-oblique.png','exploded-colors.png','joint-fit.png') @('ASSEMBLED SHELLS','EXPLODED / THREE PARTS','JOINT FIT TEST / not limbs') 3
