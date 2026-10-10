<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Restringe una ruta a uno o mas roles por nombre (por ejemplo "administrador").
class VerificarRol
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $usuario = $request->user();

        if (! $usuario || ! in_array($usuario->rol?->nombre, $roles, true)) {
            return response()->json(['message' => VerificarPermiso::MENSAJE], 403);
        }

        return $next($request);
    }
}
