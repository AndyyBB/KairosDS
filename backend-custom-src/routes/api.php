<?php

use App\Http\Controllers\Api\AmbienteController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CarreraController;
use App\Http\Controllers\Api\EstudianteController;
use App\Http\Controllers\Api\ExamenController;
use App\Http\Controllers\Api\HabilitacionController;
use App\Http\Controllers\Api\MateriaController;
use App\Http\Controllers\Api\MotivoInhabilitacionController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

// HU-16: Autenticacion de usuarios
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::apiResource('carreras', CarreraController::class);
    Route::apiResource('materias', MateriaController::class);

    // HU-01, HU-06, HU-07
    Route::apiResource('estudiantes', EstudianteController::class);

    // HU-03
    Route::apiResource('ambientes', AmbienteController::class);

    // HU-02, HU-08, HU-09
    // Laravel singulariza "examenes" como "examene"; se fuerza {examen} para que
    // el controlador reciba el examen real (show, update y cancelar dependian de esto).
    Route::apiResource('examenes', ExamenController::class)->parameters(['examenes' => 'examen']);

    // HU-04, HU-05
    Route::get('/examenes/{examen}/inscritos', [HabilitacionController::class, 'inscritos']);
    Route::get('/examenes/{examen}/habilitaciones', [HabilitacionController::class, 'index']);
    Route::post('/examenes/{examen}/habilitaciones', [HabilitacionController::class, 'store']);
    Route::get('/examenes/{examen}/habilitaciones/{estudianteId}', [HabilitacionController::class, 'show']);

    Route::get('/motivos-inhabilitacion', [MotivoInhabilitacionController::class, 'index']);
    Route::post('/motivos-inhabilitacion', [MotivoInhabilitacionController::class, 'store']);

    // HU-15
    Route::get('/roles', [UsuarioController::class, 'roles']);
    Route::apiResource('usuarios', UsuarioController::class);
});
