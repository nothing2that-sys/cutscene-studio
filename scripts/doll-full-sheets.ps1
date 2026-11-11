Add-Type -AssemblyName System.Drawing
$fullRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/review-evidence/2026-11-03-full-doll'))
function New-FullSheet($name, $files, $labels) {
  $bitmap = New-Object System.Drawing.Bitmap (450 * $files.Count), 640
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::White)
  $font = New-Object System.Drawing.Font 'Segoe UI', 13
  for ($i = 0; $i -lt $files.Count; $i++) {
    $graphics.DrawString($labels[$i], $font, [System.Drawing.Brushes]::Black, (450 * $i + 10), 10)
    $img = [System.Drawing.Image]::FromFile($files[$i])
    $graphics.DrawImage($img, (450 * $i), 36, 450, 600)
    $img.Dispose()
  }
  $bitmap.Save((Join-Path $fullRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
function Full-Path($name) { Join-Path $fullRoot $name }
$referencePath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../app/public/body-study/reference.png'))
New-FullSheet 'full-reference-comparison.png' @($referencePath,(Full-Path 'reference-3d.png'),(Full-Path 'reference-line.png')) @('SOURCE / PROVIDED DRAWING','FULL DOLL / ACTUAL 3D','FIXED ANGLE / 2.5D LINE')
New-FullSheet 'full-neutral-four-views.png' @((Full-Path 'neutral-front.png'),(Full-Path 'neutral-side.png'),(Full-Path 'neutral-back.png'),(Full-Path 'neutral-oblique.png')) @('NEUTRAL / FRONT','SIDE / INFERRED DEPTH','BACK / INFERRED ANATOMY','OBLIQUE / ACTUAL 3D')
New-FullSheet 'full-line-four-views.png' @((Full-Path 'neutral-line-front.png'),(Full-Path 'neutral-line-side.png'),(Full-Path 'neutral-line-back.png'),(Full-Path 'neutral-line-oblique.png')) @('LINE / FRONT','LINE / SIDE','LINE / BACK','LINE / OBLIQUE')
New-FullSheet 'full-pose-examples.png' @((Full-Path 'pose-reference.png'),(Full-Path 'pose-raised.png'),(Full-Path 'pose-step.png'),(Full-Path 'pose-squat.png')) @('REFERENCE PRESET','BOTH ARMS RAISED','STEP','SQUAT')
New-FullSheet 'hand-foot-details.png' @((Full-Path 'detail-handL.png'),(Full-Path 'hand-curled.png'),(Full-Path 'detail-footR.png')) @('HAND / SEPARATE PHALANGES','HAND / CURLED','FOOT / HEEL, INSTEP, TOES')
