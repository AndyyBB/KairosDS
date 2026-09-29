# Kairos Digital Systems - Sistema de Control de Ingreso a Examenes Masivos

## Opcion rapida: un solo script

En esta carpeta esta `kairos-setup.ps1`, que automatiza casi todo:
verifica/instala PHP, Composer y revisa Node; crea el proyecto Laravel
base; instala Sanctum; configura la conexion a `kairos_db` (te pedira tu
password de Postgres una sola vez); corre las migraciones propias de
Laravel; copia encima todo el codigo de Kairos (modelos, controladores,
rutas, migraciones); marca las 22 tablas ya existentes como "migradas"; e
instala las dependencias del frontend.

Para correrlo, abre PowerShell en esta carpeta (`kairos-bd`) y ejecuta:

```
powershell -ExecutionPolicy Bypass -File kairos-setup.ps1
```

Si algo falla a mitad de camino (por ejemplo porque PHP no se pudo
instalar solo), el mensaje de error te dice que hacer; corregido eso,
vuelve a correr el mismo comando: el script detecta lo que ya esta hecho
y continua desde ahi.

Al final del script, solo falta un paso manual (crear el primer usuario
administrador) explicado en la seccion 3 mas abajo, y luego levantar los
dos servidores (seccion 1.7 y 2.2).

Si prefieres hacerlo paso a paso a mano en vez de usar el script (o el
script se traba en algo puntual), sigue las secciones siguientes.

---

# Kairos Digital Systems - Sistema de Control de Ingreso a Examenes Masivos

Este directorio contiene el codigo del backend (Laravel + PostgreSQL) y el
frontend (React + Vite) del proyecto, alineado al Sprint 1 del Sprint
Planning (HU-01, HU-02, HU-03, HU-04, HU-05, HU-15, HU-16) y al modelo de
base de datos de "Diseno de arquitectura.pdf".

La base de datos `kairos_db` ya fue creada en tu Postgres 17 (22 tablas,
triggers de updated_at y catalogos iniciales de roles y metodos de
verificacion). Este README asume que ya existe.

IMPORTANTE: por seguridad, esta sesion no puede escribir comandos en tu
terminal de Windows. Todo el codigo ya esta escrito; solo necesitas correr
tu mismo los comandos de instalacion de abajo (una sola vez).

## 1. Backend (Laravel)

### 1.1. Requisitos
- PHP 8.2 o superior con la extension `pdo_pgsql` habilitada.
- Composer (https://getcomposer.org/Composer-Setup.exe).

### 1.2. Crear el proyecto Laravel base
Desde la carpeta `kairos-bd`, en una terminal (PowerShell o CMD):

```
composer create-project laravel/laravel backend-base "^11.0"
```

Esto crea una carpeta `backend-base` con el esqueleto oficial de Laravel
(vendor/, artisan, bootstrap/, etc.), que no se puede escribir a mano.

### 1.3. Copiar el codigo ya escrito
Copia el contenido de esta carpeta `backend/` (app/Models, app/Http,
database/migrations, routes/api.php, config/cors.php) DENTRO de
`backend-base/`, reemplazando los archivos que coincidan (por ejemplo
`backend-base/routes/api.php`).

Cuando termines, renombra `backend-base` a `backend` (o borra la carpeta
`backend` original vacia de codigo Laravel y deja `backend-base` con ese
nombre). La idea es que quede una sola carpeta Laravel completa con tu
codigo adentro.

### 1.4. Instalar Sanctum (autenticacion por token para el API)
Dentro de la carpeta final de Laravel:

```
php artisan install:api
```

Esto instala `laravel/sanctum` y genera `routes/api.php` (que ya vas a
sobreescribir con el que te deje) y registra el middleware `auth:sanctum`.
Vuelve a copiar tu `routes/api.php` si el comando lo regenero vacio.

### 1.5. Configurar la conexion a kairos_db
Abre el archivo `.env` que genero `composer create-project` y reemplaza
la seccion de base de datos con el contenido de `.env.kairos.example`
(que dejamos en esta carpeta), poniendo tu password real de Postgres en
`DB_PASSWORD`.

Luego genera la llave de la aplicacion:

```
php artisan key:generate
```

### 1.6. Las tablas ya existen, no corras migrate todavia
La base de datos `kairos_db` ya tiene las 22 tablas creadas directamente.
Las migraciones que te dejamos en `database/migrations` son para que el
proyecto quede versionado (y para recrear la base en otra maquina si
hiciera falta), pero si corres `php artisan migrate` ahora va a fallar
porque las tablas ya existen. Para que Laravel las reconozca como "ya
aplicadas" corre:

```
php artisan migrate:install
php artisan migrate --pretend
```

y si prefieres simplemente que Laravel no se queje, marca las
migraciones como ejecutadas insertandolas en la tabla `migrations` (o
simplemente no vuelvas a correr `migrate` en este entorno; solo usalo si
alguna vez necesitas recrear la base desde cero con `migrate:fresh`).

### 1.7. Levantar el backend
```
php artisan serve
```

Por defecto corre en http://localhost:8000. La arquitectura del proyecto
menciona Apache como servidor web: para produccion, apunta el DocumentRoot
de un VirtualHost de Apache a la carpeta `public/` de Laravel (con
`mod_rewrite` activado). Para desarrollo, `php artisan serve` es
suficiente y mas simple.

## 2. Frontend (React + Vite)

### 2.1. Requisitos
- Node.js 18+ (`node -v` para verificar).

### 2.2. Instalar dependencias y correr
Dentro de la carpeta `frontend/`:

```
npm install
npm run dev
```

Esto levanta el frontend en http://localhost:5173, ya conectado por
Axios a `http://localhost:8000/api` (configurable con la variable
`VITE_API_URL` en un archivo `.env` dentro de `frontend/`).

## 3. Primer usuario (para poder iniciar sesion)

Como el login valida contra la tabla `usuarios` con contrasena hasheada,
necesitas crear el primer usuario administrador manualmente. La forma
mas simple es con Tinker, dentro de la carpeta de Laravel:

```
php artisan tinker
```

y luego, dentro de Tinker:

```php
App\Models\Usuario::create([
    'nombre_completo' => 'Administrador Kairos',
    'correo_electronico' => 'admin@kairos.test',
    'contrasena_hash' => Hash::make('CambiaEstaClave123'),
    'rol_id' => App\Models\Role::where('nombre', 'administrador')->first()->id,
]);
```

Con eso ya puedes iniciar sesion en el frontend con
`admin@kairos.test` / `CambiaEstaClave123`.

## 4. Que cubre este avance (Sprint 1)

Backend (API REST en `routes/api.php`) y frontend (paginas en
`frontend/src/pages`) para:

- HU-01, HU-06, HU-07: registro, edicion y baja logica de estudiantes.
- HU-02, HU-08, HU-09: programar, editar y cancelar examenes.
- HU-03: registro de ambientes.
- HU-04, HU-05: habilitar estudiantes a un examen (validando que esten
  inscritos en la materia) y consultar el motivo de inhabilitacion.
- HU-15, HU-16: registro de usuarios y autenticacion (login/logout).

Los 22 modelos Eloquent (`app/Models`) y las 22 migraciones ya cubren el
resto de las tablas del modulo de control de acceso, incidencias,
seguridad y auditoria, listos para que las siguientes HU (Sprint 2 en
adelante: verificacion de identidad, ingresos, expulsiones, incidencias,
reportes) se construyan sobre la misma base sin tener que tocar la base
de datos otra vez.
