# Uso (Andy): guarda tu base de datos en database\kairos_db.dump para subirla con git.
#   powershell -ExecutionPolicy Bypass -File scripts\exportar-bd.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_postgres.ps1')

$cfg = Leer-Env
$pgDump = Buscar-Herramienta 'pg_dump'
$env:PGPASSWORD = $cfg.DB_PASSWORD

Write-Host "Exportando $($cfg.DB_DATABASE) con $pgDump ..."
& $pgDump -h $cfg.DB_HOST -p $cfg.DB_PORT -U $cfg.DB_USERNAME -d $cfg.DB_DATABASE -F c --no-owner --no-privileges -f $Dump
if ($LASTEXITCODE -ne 0) { throw 'pg_dump fallo.' }

Write-Host "Listo: database\kairos_db.dump ($([math]::Round((Get-Item $Dump).Length / 1KB)) KB)" -ForegroundColor Green
Write-Host 'Ahora: git add . ; git commit -m "..." ; git push'
