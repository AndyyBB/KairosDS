# Funciones comunes: leer backend\.env y encontrar las herramientas de PostgreSQL.

$Raiz = Split-Path $PSScriptRoot -Parent
$Dump = Join-Path $Raiz 'database\kairos_db.dump'

function Leer-Env {
    $archivo = Join-Path $Raiz 'backend\.env'
    if (-not (Test-Path $archivo)) { throw "No existe backend\.env. Copia .env.example a .env y configuralo." }
    $cfg = @{}
    Get-Content $archivo | ForEach-Object {
        if ($_ -match '^\s*(DB_[A-Z_]+)\s*=\s*(.*)\s*$') { $cfg[$matches[1]] = $matches[2].Trim('"', "'") }
    }
    if (-not $cfg.DB_HOST) { $cfg.DB_HOST = '127.0.0.1' }
    if (-not $cfg.DB_PORT) { $cfg.DB_PORT = '5432' }
    return $cfg
}

# Busca pg_dump / pg_restore / createdb del servidor PostgreSQL (nunca el de pgAdmin).
function Buscar-Herramienta($nombre) {
    $candidatos = @()
    $cmd = Get-Command "$nombre.exe" -ErrorAction SilentlyContinue
    if ($cmd) { $candidatos += $cmd.Source }
    foreach ($base in @("$env:ProgramFiles\PostgreSQL", 'C:\PostgreSQL', 'D:\PostgreSQL')) {
        if (Test-Path $base) {
            Get-ChildItem $base -Directory | Sort-Object { [int]($_.Name -replace '\D', '0') } -Descending | ForEach-Object {
                $ruta = Join-Path $_.FullName "bin\$nombre.exe"
                if (Test-Path $ruta) { $candidatos += $ruta }
            }
        }
    }
    $ok = $candidatos | Where-Object { $_ -notmatch 'pgAdmin' } | Select-Object -First 1
    if (-not $ok) { throw "No se encontro $nombre.exe de PostgreSQL. Revisa que PostgreSQL este instalado." }
    return $ok
}
