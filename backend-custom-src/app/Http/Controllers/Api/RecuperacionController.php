<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\RecuperarContrasena;
use App\Models\Usuario;
use App\Support\Historial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

// HU-39: recuperacion de contrasena por correo (pantalla publica "Recuperar contraseña").
// Por seguridad la respuesta es SIEMPRE la misma, exista o no el correo, para no revelar
// que correos estan registrados.
class RecuperacionController extends Controller
{
    public const MENSAJE = 'Si el correo está registrado, te enviamos una contraseña temporal. Revisa tu bandeja de entrada.';

    private const ESPERA_SEGUNDOS = 300; // una solicitud cada 5 minutos por correo

    public function solicitar(Request $request)
    {
        $data = $request->validate([
            'correo_electronico' => ['bail', 'required', 'string', 'max:100', 'email'],
        ], [
            'correo_electronico.required' => 'El campo Correo electrónico es obligatorio.',
            'correo_electronico.email' => 'El correo electrónico no es válido.',
            'correo_electronico.max' => 'El correo electrónico no es válido.',
        ]);
        $correo = mb_strtolower(trim($data['correo_electronico']));

        // El limite se guarda en la tabla "cache" de la base de datos (funciona igual en
        // cualquier servidor) y se aplica a cualquier correo, este registrado o no.
        $clave = 'recuperar-contrasena:'.sha1($correo);
        try {
            $permitido = Cache::store('database')->add($clave, 1, self::ESPERA_SEGUNDOS);
        } catch (\Throwable $e) {
            report($e); // sin la tabla "cache" no se bloquea la recuperacion
            $permitido = true;
        }
        if (! $permitido) {
            return response()->json([
                'message' => 'Ya se envió una solicitud para este correo. Espera 5 minutos para solicitar otra.',
            ], 429);
        }

        $usuario = Usuario::whereRaw('lower(correo_electronico) = ?', [$correo])
            ->where('activo', true)
            ->whereNull('eliminado_en')
            ->first();

        if ($usuario) {
            $temporal = self::generarTemporal();
            try {
                // Si el correo no se puede enviar, la transaccion se revierte y la contrasena no cambia.
                DB::transaction(function () use ($usuario, $temporal) {
                    $usuario->forceFill([
                        'contrasena_hash' => Hash::make($temporal),
                        'intentos_fallidos' => 0,
                        'bloqueado_hasta' => null,
                    ])->saveQuietly();
                    $usuario->tokens()->delete();
                    Mail::to($usuario->correo_electronico)->send(new RecuperarContrasena($usuario, $temporal));
                });
            } catch (\Throwable $e) {
                report($e);
                rescue(fn () => Cache::store('database')->forget($clave), null, false);

                return response()->json(['message' => 'No se pudo enviar el correo. Intente nuevamente en unos minutos.'], 503);
            }

            // HU-27: queda la solicitud en el historial (nunca la contrasena temporal).
            Historial::registrar('Recuperar contraseña', 'Usuarios',
                "Solicitud de recuperación de contraseña de {$usuario->nombre_completo}", $usuario, null, null, $usuario);
        }

        return response()->json(['message' => self::MENSAJE]);
    }

    // Contrasena temporal de 10 caracteres (letras y numeros, sin caracteres que se confunden).
    private static function generarTemporal(): string
    {
        $mayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        $minus = 'abcdefghijkmnpqrstuvwxyz';
        $nums = '23456789';
        $todos = $mayus.$minus.$nums;
        $c = [$mayus[random_int(0, strlen($mayus) - 1)], $minus[random_int(0, strlen($minus) - 1)], $nums[random_int(0, strlen($nums) - 1)]];
        while (count($c) < 10) {
            $c[] = $todos[random_int(0, strlen($todos) - 1)];
        }
        for ($i = count($c) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$c[$i], $c[$j]] = [$c[$j], $c[$i]];
        }

        return implode('', $c);
    }
}
