# ============================================================
# Kairos Digital Systems - Setup automatico de backend + frontend
# Correr desde PowerShell, parado en la carpeta kairos-bd:
#   powershell -ExecutionPolicy Bypass -File kairos-setup.ps1
# Se puede volver a correr si algo falla a mitad de camino.
# ============================================================

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machine;$user"
}

function Test-Cmd($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Paso($texto) {
    Write-Host ""
    Write-Host "== $texto ==" -ForegroundColor Cyan
}

try {
    Paso "1. Verificando PHP y Composer"

    if (-not (Test-Cmd "php")) {
        Write-Host "PHP no encontrado. Intentando instalar con winget..." -ForegroundColor Yellow
        try { winget install --id PHP.PHP -e --accept-package-agreements --accept-source-agreements } catch {}
        Refresh-Path
    }

    if (-not (Test-Cmd "php")) {
        Write-Host "PHP sigue sin encontrarse automaticamente." -ForegroundColor Red
        Write-Host "Instalalo manualmente: https://windows.php.net/download/ (elige 'Thread Safe' x64)," -ForegroundColor Red
        Write-Host "agrega la carpeta de PHP a tu variable PATH, abre una terminal NUEVA y vuelve a correr este script." -ForegroundColor Red
        exit 1
    }

    if (-not (Test-Cmd "composer")) {
        Write-Host "Composer no encontrado. Intentando instalar con winget..." -ForegroundColor Yellow
        try { winget install --id Composer.Composer -e --accept-package-agreements --accept-source-agreements } catch {}
        Refresh-Path
    }

    if (-not (Test-Cmd "composer")) {
        Write-Host "Composer sigue sin encontrarse automaticamente." -ForegroundColor Red
        Write-Host "Instalalo manualmente: https://getcomposer.org/Composer-Setup.exe" -ForegroundColor Red
        Write-Host "Abre una terminal NUEVA despues de instalar y vuelve a correr este script." -ForegroundColor Red
        exit 1
    }

    Write-Host "PHP:      $((php -v | Select-Object -First 1))" -ForegroundColor Green
    Write-Host "Composer: $((composer -V))" -ForegroundColor Green

    if (-not (Test-Cmd "node")) {
        Write-Host "Node.js no encontrado. Instala https://nodejs.org/ (version LTS) y vuelve a correr este script." -ForegroundColor Red
        exit 1
    }
    Write-Host "Node:     $((node -v))" -ForegroundColor Green

    Paso "2. Preparando carpetas"

    if ((Test-Path "$Root\backend") -and -not (Test-Path "$Root\backend-custom-src")) {
        Rename-Item "$Root\backend" "backend-custom-src"
        Write-Host "Codigo propio movido temporalmente a backend-custom-src" -ForegroundColor Green
    }

    if (-not (Test-Path "$Root\backend")) {
        Paso "3. Creando proyecto Laravel base (composer create-project)"
        composer create-project laravel/laravel backend "^11.0"
    } else {
        Write-Host "La carpeta backend ya existe; se omite composer create-project." -ForegroundColor Yellow
    }

    Set-Location "$Root\backend"

    Paso "4. Instalando Laravel Sanctum (php artisan install:api)"
    if (-not (Test-Path "$Root\backend\routes\api.php")) {
        php artisan install:api --no-interaction
    } else {
        Write-Host "routes/api.php ya existe; se omite install:api." -ForegroundColor Yellow
    }

    Paso "5. Configurando conexion a kairos_db en .env"
    $envPath = "$Root\backend\.env"
    $envContent = Get-Content $envPath -Raw
    $envContent = $envContent -replace 'DB_CONNECTION=.*', 'DB_CONNECTION=pgsql'
    $envContent = $envContent -replace 'DB_HOST=.*', 'DB_HOST=127.0.0.1'
    $envContent = $envContent -replace 'DB_PORT=.*', 'DB_PORT=5432'
    $envContent = $envContent -replace 'DB_DATABASE=.*', 'DB_DATABASE=kairos_db'
    $envContent = $envContent -replace 'DB_USERNAME=.*', 'DB_USERNAME=postgres'
    if ($envContent -notmatch 'FRONTEND_URL=') {
        $envContent += "`nFRONTEND_URL=http://localhost:5173`n"
    }
    Set-Content $envPath $envContent -NoNewline

    $pgPasswordSecure = Read-Host "Ingresa tu password de PostgreSQL (usuario 'postgres')" -AsSecureString
    $pgPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPasswordSecure))
    (Get-Content $envPath) -replace 'DB_PASSWORD=.*', "DB_PASSWORD=$pgPassword" | Set-Content $envPath

    php artisan key:generate --force

    Paso "6. Creando tablas propias de Laravel (users, sessions, personal_access_tokens...)"
    php artisan migrate --force

    Paso "7. Copiando el codigo del proyecto Kairos (modelos, controladores, rutas, migraciones)"
    $src = "$Root\backend-custom-src"
    if (Test-Path $src) {
        Copy-Item "$src\app\Models\*" "$Root\backend\app\Models\" -Force
        Copy-Item "$src\app\Http\Controllers\Api" "$Root\backend\app\Http\Controllers\" -Recurse -Force
        Copy-Item "$src\app\Http\Requests\*" "$Root\backend\app\Http\Requests\" -Force
        Copy-Item "$src\database\migrations\*" "$Root\backend\database\migrations\" -Force
        Copy-Item "$src\database\seeders\MarkKairosMigrationsSeeder.php" "$Root\backend\database\seeders\" -Force
        Copy-Item "$src\routes\api.php" "$Root\backend\routes\api.php" -Force
        Copy-Item "$src\config\cors.php" "$Root\backend\config\cors.php" -Force
        Write-Host "Codigo copiado." -ForegroundColor Green
    } else {
        Write-Host "No se encontro backend-custom-src; se asume que el codigo ya esta en backend/." -ForegroundColor Yellow
    }

    Paso "8. Marcando las 22 migraciones del modelo Kairos como ya aplicadas"
    php artisan db:seed --class="Database\Seeders\MarkKairosMigrationsSeeder" --force

    Paso "9. Instalando dependencias del frontend (npm install)"
    Set-Location "$Root\frontend"
    npm install

    Set-Location $Root

    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Green
    Write-Host " Listo. Para levantar el sistema (en dos terminales distintas):" -ForegroundColor Green
    Write-Host "   1) cd backend ; php artisan serve" -ForegroundColor Green
    Write-Host "   2) cd frontend ; npm run dev" -ForegroundColor Green
    Write-Host "   3) Abre http://localhost:5173" -ForegroundColor Green
    Write-Host "" -ForegroundColor Green
    Write-Host " Para crear el primer usuario administrador, dentro de backend/:" -ForegroundColor Green
    Write-Host "   php artisan tinker" -ForegroundColor Green
    Write-Host "   (ver el paso 3 del README.md para el codigo exacto)" -ForegroundColor Green
    Write-Host "==============================================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Puedes corregir el problema y volver a correr este mismo script; ya detecta lo que esta hecho y continua." -ForegroundColor Red
    exit 1
}
