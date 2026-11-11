Add-Type -AssemblyName System.Drawing
$galleryStudyRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/review-evidence/2026-11-03-gallery-p015'))
function Sheet($name,$files,$labels){$b=New-Object System.Drawing.Bitmap (380*$files.Count),550;$g=[System.Drawing.Graphics]::FromImage($b);$g.Clear([System.Drawing.Color]::White);$f=New-Object System.Drawing.Font 'Segoe UI',12;for($i=0;$i -lt $files.Count;$i++){$g.DrawString($labels[$i],$f,[System.Drawing.Brushes]::Black,($i*380+8),9);$im=[System.Drawing.Image]::FromFile((Join-Path $galleryStudyRoot $files[$i]));$g.DrawImage($im,($i*380),35,380,507);$im.Dispose()};$b.Save((Join-Path $galleryStudyRoot $name),[System.Drawing.Imaging.ImageFormat]::Png);$f.Dispose();$g.Dispose();$b.Dispose()}
# Only our actual model renders; the gallery PNG is never put in this sheet.
Sheet 'p015-model-comparison.png' @('front-3d.png','front-line.png','oblique-3d.png') @('P015 STUDY / ACTUAL 3D','FIXED ANGLE / MODEL LINE','SAME POSE / OBLIQUE')
Sheet 'p015-four-views.png' @('front-line.png','side-line.png','back-line.png','oblique-line.png') @('MODEL / FRONT','SIDE / INFERRED DEPTH','BACK / INFERRED SHAPE','OBLIQUE / SAME RIG')
