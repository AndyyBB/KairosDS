<?php

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
        Route::post('/verificar', [ControlIngresoController::class, 'verificar'])->middleware('permiso:control_ingreso.registrar');
        Route::post('/ingresos', [ControlIngresoController::class, 'registrarIngreso'])->middleware('permiso:control_ingreso.registrar');

        // HU-12 (9): solo el administrador puede modificar un registro de ingreso.
        Route::match(['put', 'patch'], '/ingresos/{ingreso}', [ControlIngresoController::class, 'actualizarIngreso'])->middleware('rol:administrador');
        Route::delete('/ingresos/{ingreso}', [ControlIngresoController::class, 'eliminarIngreso'])->middleware('rol:administrador');

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
});
