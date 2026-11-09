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
    // HU-16: Autenticacion de usuarios.
    // Por seguridad, ante cualquier fallo (correo inexistente, usuario inactivo, contrasena
    // incorrecta o cuenta bloqueada temporalmente) se responde SIEMPRE el mismo mensaje y el
    // mismo codigo: asi no se revela si el correo existe ni cual de los datos esta mal.
    public const MENSAJE_FALLO = 'Correo o contraseña incorrectos.';

    // Hash de relleno para comparar la contrasena aunque el correo no exista: el tiempo de
    // respuesta es el mismo en ambos casos y no permite adivinar que correos estan registrados.
    private const HASH_RELLENO = '$2y$10$x/6KnM4i81Jv3xyXruxML.BTo6GMQO1/PF37ybD6qpxNVuFqpGAA.';

    public function login(LoginRequest $request)
    {
        $data = $request->validated();

        $usuario = Usuario::where('correo_electronico', trim($data['correo_electronico']))->first();

        $passwordCorrecta = Hash::check($data['password'], $usuario?->contrasena_hash ?? self::HASH_RELLENO);

        $bloqueado = $usuario?->bloqueado_hasta && $usuario->bloqueado_hasta->isFuture();

        if (! $usuario || ! $usuario->activo || $bloqueado || ! $passwordCorrecta) {
            // Tras 5 intentos fallidos seguidos la cuenta se bloquea 15 minutos (sin avisarlo
            // en el mensaje, para no confirmar que la cuenta existe).
            if ($usuario && $usuario->activo && ! $bloqueado && ! $passwordCorrecta) {
                $usuario->increment('intentos_fallidos');
                if ($usuario->intentos_fallidos >= 5) {
                    $usuario->update(['bloqueado_hasta' => now()->addMinutes(15), 'intentos_fallidos' => 0]);
                }
            }

            return response()->json(['message' => self::MENSAJE_FALLO], 401);
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
