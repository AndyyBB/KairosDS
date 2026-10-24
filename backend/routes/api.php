<?php

use App\Http\Controllers\Api\ConsultaController;
use App\Http\Controllers\Api\HistorialController;
use App\Http\Controllers\Api\IncidenciaController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\AmbienteController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CarreraController;
use App\Http\Controllers\Api\ControlIngresoController;
use App\Http\Controllers\Api\EstudianteController;
use App\Http\Controllers\Api\ExamenController;
use App\Http\Controllers\Api\HabilitacionController;
use App\Http\Controllers\Api\InscripcionController;
use App\Http\Controllers\Api\MateriaController;
use App\Http\Controllers\Api\MotivoInhabilitacionController;
use App\Http\Controllers\Api\PermisoController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

// HU-16: Autenticacion de usuarios
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::apiResource('carreras', CarreraController::class);
    Route::apiResource('materias', MateriaController::class);

    // HU-17: cada accion de un modulo exige el permiso "<modulo>.<accion>" del rol
    // (ver = listar/consultar, registrar = crear, editar = modificar, eliminar = borrar/cancelar).
    $recurso = function (string $uri, string $controller, string $modulo, string $parametro) {
        Route::get($uri, [$controller, 'index'])->middleware("permiso:$modulo.ver");
        Route::post($uri, [$controller, 'store'])->middleware("permiso:$modulo.registrar");
        Route::get("$uri/{{$parametro}}", [$controller, 'show'])->middleware("permiso:$modulo.ver");
        Route::match(['put', 'patch'], "$uri/{{$parametro}}", [$controller, 'update'])->middleware("permiso:$modulo.editar");
        Route::delete("$uri/{{$parametro}}", [$controller, 'destroy'])->middleware("permiso:$modulo.eliminar");
    };

    // HU-01, HU-06, HU-07
    Route::get('/estudiantes-anios', [EstudianteController::class, 'anios'])->middleware('permiso:estudiantes.ver');
    $recurso('estudiantes', EstudianteController::class, 'estudiantes', 'estudiante');

    // HU-03
    $recurso('ambientes', AmbienteController::class, 'ambientes', 'ambiente');

    // HU-02, HU-08, HU-09
    $recurso('examenes', ExamenController::class, 'examenes', 'examen');

    // HU-04, HU-05
    Route::get('/examenes/{examen}/inscritos', [HabilitacionController::class, 'inscritos'])->middleware('permiso:habilitaciones.ver');
    Route::get('/examenes/{examen}/habilitaciones', [HabilitacionController::class, 'index'])->middleware('permiso:habilitaciones.ver');
    Route::post('/examenes/{examen}/habilitaciones', [HabilitacionController::class, 'store'])->middleware('permiso:habilitaciones.registrar,habilitaciones.editar');
    Route::get('/examenes/{examen}/habilitaciones/{estudianteId}', [HabilitacionController::class, 'show'])->middleware('permiso:habilitaciones.ver');

    // Inscripcion de estudiantes en la materia del examen (requisito previo de HU-04).
    Route::get('/examenes/{examen}/inscripciones', [InscripcionController::class, 'index'])->middleware('permiso:habilitaciones.ver');
    Route::post('/examenes/{examen}/inscripciones', [InscripcionController::class, 'store'])->middleware('permiso:habilitaciones.registrar');
    Route::delete('/examenes/{examen}/inscripciones/{estudiante}', [InscripcionController::class, 'destroy'])->middleware('permiso:habilitaciones.editar');

    Route::get('/motivos-inhabilitacion', [MotivoInhabilitacionController::class, 'index'])->middleware('permiso:habilitaciones.ver');
    Route::post('/motivos-inhabilitacion', [MotivoInhabilitacionController::class, 'store'])->middleware('permiso:habilitaciones.registrar');

    // HU-10, HU-11, HU-12, HU-13, HU-26: Control de ingreso
    Route::prefix('control-ingreso')->group(function () {
        Route::get('/examenes', [ControlIngresoController::class, 'examenes'])->middleware('permiso:control_ingreso.ver');
        Route::get('/examenes/{examen}/ingresos', [ControlIngresoController::class, 'ingresos'])->middleware('permiso:control_ingreso.ver');
        Route::get('/examenes/{examen}/intentos', [ControlIngresoController::class, 'intentos'])->middleware('permiso:control_ingreso.ver');
        // Pantallas "Editar ingreso" y "Eliminar ingreso": todos los ingresos del examen.
        Route::get('/examenes/{examen}/ingresos/todos', [ControlIngresoController::class, 'todosLosIngresos'])->middleware('permiso:control_ingreso.editar,control_ingreso.eliminar');
        Route::post('/verificar', [ControlIngresoController::class, 'verificar'])->middleware('permiso:control_ingreso.registrar');
        Route::post('/ingresos', [ControlIngresoController::class, 'registrarIngreso'])->middleware('permiso:control_ingreso.registrar');

        // HU-12 (9): modificar o eliminar un ingreso requiere el permiso Editar / Eliminar de
        // Control de ingreso (el administrador los tiene siempre; los demas roles solo si el
        // administrador se los otorga en Roles y permisos).
        Route::get('/ambientes', [ControlIngresoController::class, 'ambientes'])->middleware('permiso:control_ingreso.ver');
        Route::match(['put', 'patch'], '/ingresos/{ingreso}', [ControlIngresoController::class, 'actualizarIngreso'])->middleware('permiso:control_ingreso.editar');
        Route::delete('/ingresos/{ingreso}', [ControlIngresoController::class, 'eliminarIngreso'])->middleware('permiso:control_ingreso.eliminar');

        // HU-26 (9): los intentos registrados no se pueden modificar ni eliminar.
        Route::match(['put', 'patch', 'delete'], '/intentos/{intento}', [ControlIngresoController::class, 'intentoInmutable']);
    });

    // HU-15: catalogo de roles (formulario de usuarios y pantalla de permisos)
    Route::get('/roles', [PermisoController::class, 'roles']);

    // HU-17: Roles y permisos (solo el administrador)
    Route::middleware('rol:administrador')->group(function () {
        Route::get('/roles/{rol}/permisos', [PermisoController::class, 'show']);
        Route::put('/roles/{rol}/permisos', [PermisoController::class, 'update']);
    });

    // HU-15
    $recurso('usuarios', UsuarioController::class, 'usuarios', 'usuario');

    // ---------------- Sprint 3 ----------------
    // HU-05 y HU-18: Consultas.
    Route::get('/consultas/examenes', [ConsultaController::class, 'examenes']);
    Route::post('/consultas/motivo', [ConsultaController::class, 'motivo'])->middleware('permiso:control_ingreso.ver');
    // HU-18: Administrador, Docente o roles con permiso sobre Control de ingreso (se valida en el controlador).
    Route::get('/consultas/examenes/{examen}/ingresados', [ConsultaController::class, 'ingresados']);

    // HU-24 y HU-25: Incidencias (permiso "Registrar" de Control de ingreso).
    Route::middleware('permiso:control_ingreso.registrar')->prefix('incidencias')->group(function () {
        Route::post('/expulsiones/buscar', [IncidenciaController::class, 'buscarParaExpulsion']);
        Route::post('/expulsiones', [IncidenciaController::class, 'registrarExpulsion']);
        Route::get('/tipos', [IncidenciaController::class, 'tipos']);
        Route::post('/estudiante', [IncidenciaController::class, 'buscarEstudiante']);
        Route::post('/situaciones', [IncidenciaController::class, 'registrarSituacion']);
    });

    // HU-19, HU-20, HU-21 y HU-22: Reportes (roles Administrador y Docente).
    Route::middleware('rol:administrador,docente')->prefix('reportes')->group(function () {
        Route::get('/examenes', [ReporteController::class, 'examenes']);
        Route::get('/asistencia/{examen}', [ReporteController::class, 'asistencia']);
        Route::get('/ausentismo/{examen}', [ReporteController::class, 'ausentismo']);
        Route::get('/intentos', [ReporteController::class, 'intentos']);
        Route::get('/registrados', [ReporteController::class, 'registrados']);
    });

    // HU-27: Historial de operaciones (solo el administrador; solo consulta).
    Route::middleware('rol:administrador')->group(function () {
        Route::get('/historial', [HistorialController::class, 'index']);
        Route::get('/historial/filtros', [HistorialController::class, 'filtros']);
    });
});
