<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// HU-17: valida que el usuario tenga (al menos uno de) los permisos "modulo.accion"
// indicados. Los permisos son los que el rol tenia cuando el usuario inicio sesion.
class VerificarPermiso
{
    public const MENSAJE = 'No tiene permisos para realizar esta acción.';

    public function handle(Request $request, Closure $next, string ...$permisos): Response
    {
        $usuario = $request->user();

        if (! $usuario || ! array_intersect($permisos, $usuario->permisosDeSesion())) {
            return response()->json(['message' => self::MENSAJE], 403);
        }

        return $next($request);
    }
}
