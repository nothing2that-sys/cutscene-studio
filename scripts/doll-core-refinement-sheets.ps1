Add-Type -AssemblyName System.Drawing
$refineRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/review-evidence/2026-11-03-doll-core-refinement'))
function New-RefineSheet($name, $files, $labels) {
  $bitmap = New-Object System.Drawing.Bitmap (450 * $files.Count), 640
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font 'Segoe UI', 13
  for ($i = 0; $i -lt $files.Count; $i++) {
    $graphics.DrawString($labels[$i], $font, [System.Drawing.Brushes]::Black, (450 * $i + 10), 10)
    $img = [System.Drawing.Image]::FromFile((Join-Path $refineRoot $files[$i]))
    $graphics.DrawImage($img, (450 * $i), 36, 450, 600)
    $img.Dispose()
  }
  $bitmap.Save((Join-Path $refineRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
New-RefineSheet 'before-after-oblique.png' @('before-oblique.png','after-oblique.png') @('BEFORE / 46,708 triangles','AFTER / 11,600 triangles')
New-RefineSheet 'before-after-front.png' @('before-front.png','after-front.png') @('BEFORE / FRONT','AFTER / FRONT')
New-RefineSheet 'quality-modes.png' @('light-oblique.png','balanced-oblique.png','source-oblique.png') @('LIGHT / 6,200 triangles','BALANCED / 11,600 triangles','SCULPT SOURCE / 73,408 triangles')
New-RefineSheet 'improved-four-views.png' @('after-front.png','after-side.png','after-back.png','after-oblique.png') @('FRONT','SIDE / inferred depth','BACK / inferred anatomy','OBLIQUE')
New-RefineSheet 'reference-review.png' @('validation/reference-source-crop.png','after-reference.png','after-overlay.png') @('REFERENCE / CORE CROP','ACTUAL 3D / REFERENCE PRESET','SILHOUETTE OVERLAY')
