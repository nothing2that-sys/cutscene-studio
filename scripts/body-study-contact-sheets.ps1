Add-Type -AssemblyName System.Drawing
$studyRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/review-evidence/2026-11-03-body-study'))
function New-StudySheet($name, $files, $labels) {
  $bitmap = New-Object System.Drawing.Bitmap (480 * $files.Count), 690
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font 'Segoe UI', 14
  for ($i = 0; $i -lt $files.Count; $i++) {
    $img = [System.Drawing.Image]::FromFile($files[$i])
    $graphics.DrawString($labels[$i], $font, [System.Drawing.Brushes]::Black, (480 * $i + 12), 12)
    $graphics.DrawImage($img, (480 * $i), 45, 480, 640)
    $img.Dispose()
  }
  $bitmap.Save((Join-Path $studyRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
New-StudySheet 'neutral-four-views.png' @((Join-Path $studyRoot 'neutral-front.png'),(Join-Path $studyRoot 'neutral-side.png'),(Join-Path $studyRoot 'neutral-back.png'),(Join-Path $studyRoot 'neutral-oblique.png')) @('FRONT - inferred neutral','SIDE - inferred depth','BACK - inferred anatomy','OBLIQUE - actual 3D')
New-StudySheet 'reference-comparison.png' @([IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../app/public/body-study/reference.png')),(Join-Path $studyRoot 'reference-clay.png'),(Join-Path $studyRoot 'reference-overlay.png')) @('SOURCE - provided drawing','PROTOTYPE - actual 3D','OVERLAY - source + silhouette')
