# Copia habit-rpg.html -> deploy/index.html
# Ejecuta este script antes de subir a Vercel

Copy-Item "$PSScriptRoot\habit-rpg.html" "$PSScriptRoot\deploy\index.html" -Force
Write-Host "Deploy actualizado. Archivos listos en deploy/"
Write-Host "Ahora sube la carpeta 'deploy' a Vercel."
