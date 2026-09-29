<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\Usuario;
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
            return response()->json(['message' => 'Credenciales invalidas.'], 401);
        }

        if ($usuario->bloqueado_hasta && $usuario->bloqueado_hasta->isFuture()) {
            return response()->json(['message' => 'Cuenta bloqueada temporalmente. Intente mas tarde.'], 423);
        }

        if (! Hash::check($data['password'], $usuario->contrasena_hash)) {
            $usuario->increment('intentos_fallidos');

            if ($usuario->intentos_fallidos >= 5) {
                $usuario->update(['bloqueado_hasta' => now()->addMinutes(15)]);
            }

            return response()->json(['message' => 'Credenciales invalidas.'], 401);
        }

        $usuario->update([
            'intentos_fallidos' => 0,
            'bloqueado_hasta' => null,
            'ultimo_acceso' => now(),
        ]);

        $token = $usuario->createToken('kairos-web')->plainTextToken;

        return response()->json([
            'token' => $token,
            'usuario' => $usuario->load('rol'),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesion cerrada.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('rol'));
    }
}
