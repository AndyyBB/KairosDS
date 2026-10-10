# Uso (companeros): reemplaza tu base de datos local por database\kairos_db.dump.
# Se ejecuta solo despues de "git pull" si activaste el hook (ver README), o a mano:
#   powershell -ExecutionPolicy Bypass -File scripts\restaurar-bd.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_postgres.ps1')

if (-not (Test-Path $Dump)) { throw 'No existe database\kairos_db.dump. Haz git pull primero.' }

$cfg = Leer-Env
$pgRestore = Buscar-Herramienta 'pg_restore'
$createdb = Buscar-Herramienta 'createdb'
$env:PGPASSWORD = $cfg.DB_PASSWORD

# Crea la base si no existe (si ya existe, el error se ignora).
$ErrorActionPreference = 'Continue'
& $createdb -h $cfg.DB_HOST -p $cfg.DB_PORT -U $cfg.DB_USERNAME $cfg.DB_DATABASE 2>$null

Write-Host "Restaurando $($cfg.DB_DATABASE) desde database\kairos_db.dump ..."
& $pgRestore -h $cfg.DB_HOST -p $cfg.DB_PORT -U $cfg.DB_USERNAME -d $cfg.DB_DATABASE --clean --if-exists --no-owner --no-privileges $Dump
if ($LASTEXITCODE -ne 0) { Write-Host 'pg_restore termino con advertencias (normalmente no afectan).' -ForegroundColor Yellow }

$backend = Join-Path $Raiz 'backend'
if (Get-Command php -ErrorAction SilentlyContinue) {
    Push-Location $backend
    php artisan migrate --force
    php artisan config:clear
    Pop-Location
}
Write-Host 'Base de datos actualizada.' -ForegroundColor Green
