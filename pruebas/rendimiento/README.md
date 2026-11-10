# Pruebas de rendimiento y carga (Hito 5 — Sprint 4)

Script: `prueba-carga.mjs` (solo necesita Node.js 18 o superior, que ya se usa para el frontend).

Simula varios usuarios trabajando al mismo tiempo contra la API y mide los tiempos de respuesta.
**Solo hace consultas**: no registra, no edita ni elimina datos.

## Cómo ejecutarla

1. Enciende PostgreSQL y el backend (`php artisan serve` en la carpeta `backend`).
2. Desde la carpeta `kairos-bd`:

   ```
   node pruebas/rendimiento/prueba-carga.mjs
   ```

3. El script pide el correo y la contraseña de un usuario **administrador** (no se guardan).

Para incluir la prueba de **Verificar identidad** (control de ingreso, HU-10: máximo 3 segundos),
indica un examen de HOY y el código de un estudiante HABILITADO en ese examen. En PowerShell:

```
$env:KAIROS_EXAMEN_ID="80"; $env:KAIROS_CODIGO="202111346"; node pruebas/rendimiento/prueba-carga.mjs
```

Otras opciones: `KAIROS_USUARIOS` (por defecto `1,10,25,50`), `KAIROS_SEGUNDOS` (por defecto `20`)
y `KAIROS_API` (por defecto `http://localhost:8000/api`).

## Qué mide

Por cada etapa (1, 10, 25 y 50 usuarios simultáneos) y cada escenario: peticiones, peticiones por
segundo, tiempo promedio, p50, p95, p99, máximo y porcentaje de errores.

Escenarios: sesión (`/me`), búsqueda de estudiantes, lista de exámenes, exámenes de hoy del control
de ingreso, reporte de estudiantes registrados y, si se indica, verificar identidad.

## Criterios de aceptación

- **Verificar identidad**: el 95 % de las respuestas en 3 segundos o menos (HU-10).
- **Demás consultas**: el 95 % de las respuestas en 2 segundos o menos.
- **Errores**: 1 % o menos.

## Resultados

Cada ejecución guarda un informe en `pruebas/rendimiento/resultados/` (`informe-AAAAMMDDHHMM.md`
y `.json`). Ese informe es la evidencia de la prueba para la entrega del Hito 5.

> `php artisan serve` atiende una petición a la vez: con muchos usuarios simultáneos los tiempos
> suben por esa razón. En el servidor final se recomienda Apache o Nginx con PHP-FPM.

## Ajuste de rendimiento incluido

La migración `2026_11_10_000004_indices_de_rendimiento` agrega índices para las búsquedas más
usadas durante un examen: verificar por código o documento (con o sin extensión), exámenes por
fecha y hora, exámenes por asignatura y fecha (alerta de duplicados) y antecedentes de la central de
riesgos.
