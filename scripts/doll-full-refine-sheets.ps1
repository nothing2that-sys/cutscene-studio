Add-Type -AssemblyName System.Drawing
$refineRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/review-evidence/2026-11-03-full-refinement'))
function Sheet($name,$files,$labels){
 $b=New-Object System.Drawing.Bitmap (360*$files.Count),520
 $g=[System.Drawing.Graphics]::FromImage($b);$g.Clear([System.Drawing.Color]::White)
 $font=New-Object System.Drawing.Font 'Segoe UI',11
 for($i=0;$i -lt $files.Count;$i++){$g.DrawString($labels[$i],$font,[System.Drawing.Brushes]::Black,($i*360+8),8);$im=[System.Drawing.Image]::FromFile($files[$i]);$g.DrawImage($im,($i*360),32,360,480);$im.Dispose()}
 $b.Save((Join-Path $refineRoot $name),[System.Drawing.Imaging.ImageFormat]::Png);$font.Dispose();$g.Dispose();$b.Dispose()
}
function P($n){Join-Path $refineRoot $n}
$src=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../app/public/body-study/reference.png'))
Sheet 'reference-comparison.png' @($src,(P 'before-reference.png'),(P 'after-reference.png'),(P 'after-reference-line.png')) @('SOURCE','BEFORE / 3D','AFTER / 3D','AFTER / FIXED LINE')
Sheet 'hand-foot-comparison.png' @((P 'before-handL.png'),(P 'after-handL.png'),(P 'before-footR.png'),(P 'after-footR.png')) @('HAND / BEFORE','HAND / AFTER','FOOT / BEFORE','FOOT / AFTER')
Sheet 'fold-comparison.png' @((P 'unprotected-hip.png'),(P 'after-hip-fold.png'),(P 'unprotected-knee.png'),(P 'after-knee-max.png')) @('HIP / GUARD OFF','HIP / CONTACT LIMIT','KNEE / GUARD OFF','KNEE / CONTACT LIMIT')
