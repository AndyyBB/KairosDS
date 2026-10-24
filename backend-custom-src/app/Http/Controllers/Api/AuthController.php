<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\Usuario;
use App\Support\Historial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    // HU-16: Autenticacion de usuarios
    public function login(LoginRequest $request)
    {
        $data = $request->validated();

        $usuario = Usuario::where('correo_electronico', $data['correo_electronico'])->first();

        if (! $usuario || ! $usuario->activo) {
            return response()->json(['message' => 'Correo o contraseña incorrectos.'], 401);
        }

        if ($usuario->bloqueado_hasta && $usuario->bloqueado_hasta->isFuture()) {
            return response()->json(['message' => 'Cuenta bloqueada temporalmente. Intente más tarde.'], 423);
        }

        if (! Hash::check($data['password'], $usuario->contrasena_hash)) {
            $usuario->increment('intentos_fallidos');

            if ($usuario->intentos_fallidos >= 5) {
                $usuario->update(['bloqueado_hasta' => now()->addMinutes(15)]);
            }

            return response()->json(['message' => 'Correo o contraseña incorrectos.'], 401);
        }

        $usuario->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
            'ultimo_acceso' => now(),
        ]);

        // HU-17: los permisos del rol quedan fijados en el token de esta sesion.
        $usuario->load('rol');
        $permisos = $usuario->permisosCodigos();
        $token = $usuario->createToken('kairos-web', array_merge(['sesion'], $permisos))->plainTextToken;
        $usuario->setAttribute('permisos', $permisos);

        // HU-27: el inicio de sesion queda en el historial de operaciones.
        Historial::registrar('Iniciar sesión', 'Sesión', 'Inicio de sesión', null, null, null, $usuario);

        return response()->json([
            'token' => $token,
            'usuario' => $usuario,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada.']);
    }

    public function me(Request $request)
    {
        $usuario = $request->user()->load('rol');
        $usuario->setAttribute('permisos', $usuario->permisosDeSesion());

        return response()->json($usuario);
    }
}
