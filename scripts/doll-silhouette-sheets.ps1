Add-Type -AssemblyName System.Drawing
$silhouetteRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/review-evidence/2026-11-03-silhouette'))
function S($name,$files,$labels){$b=New-Object System.Drawing.Bitmap (420*$files.Count),600;$g=[System.Drawing.Graphics]::FromImage($b);$g.Clear([System.Drawing.Color]::White);$font=New-Object System.Drawing.Font 'Segoe UI',12;for($i=0;$i -lt $files.Count;$i++){$g.DrawString($labels[$i],$font,[System.Drawing.Brushes]::Black,($i*420+8),9);$im=[System.Drawing.Image]::FromFile($files[$i]);$g.DrawImage($im,($i*420),35,420,560);$im.Dispose()};$b.Save((Join-Path $silhouetteRoot $name),[System.Drawing.Imaging.ImageFormat]::Png);$font.Dispose();$g.Dispose();$b.Dispose()}
function P($n){Join-Path $silhouetteRoot $n}
$source=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../app/public/body-study/reference.png'))
S 'line-comparison.png' @($source,(P 'before-line.png'),(P 'after-line.png')) @('SOURCE','PREVIOUS / LINE','CURRENT / CONTINUOUS WAIST')
S 'shape-comparison.png' @($source,(P 'before-reference.png'),(P 'after-reference.png')) @('SOURCE','PREVIOUS / 3D','CURRENT / 3D')
S 'line-four-views.png' @((P 'flow/neutral-line-front.png'),(P 'flow/neutral-line-side.png'),(P 'flow/neutral-line-back.png'),(P 'flow/neutral-line-oblique.png')) @('NEUTRAL / FRONT','SIDE','BACK','OBLIQUE')
