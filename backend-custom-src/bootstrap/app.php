<?php

use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // HU-17: control de acceso por permisos y por rol.
        $middleware->alias([
            'permiso' => \App\Http\Middleware\VerificarPermiso::class,
            'rol' => \App\Http\Middleware\VerificarRol::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Seguridad: los errores de la base de datos (conexion rechazada, consultas fallidas)
        // nunca se envian a la pantalla. El detalle tecnico queda solo en
        // storage/logs/laravel.log y el usuario ve un mensaje general.
        $exceptions->render(function (QueryException|\PDOException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'No se pudo completar la operación. Intente nuevamente en unos minutos.',
                ], 503);
            }
        });
    })->create();
