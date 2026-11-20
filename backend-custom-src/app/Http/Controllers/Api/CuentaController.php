<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Historial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

// HU-38: cambio de contrasena del propio usuario (pantalla "Cambiar contrasena").
// Cada usuario solo cambia SU contrasena; la de otro usuario la cambia un usuario con
// privilegios en "Editar usuario" (HU-32).
class CuentaController extends Controller
{
    public function cambiarContrasena(Request $request)
    {
        $usuario = $request->user();

        $validador = Validator::make($request->all(), [
            'actual' => ['bail', 'required', 'string'],
            'nueva' => ['bail', 'required', 'string', 'min:8'],
            'confirmacion' => ['bail', 'required', 'string'],
        ], [
            'actual.required' => 'El campo Contraseña actual es obligatorio.',
            'nueva.required' => 'El campo Nueva contraseña es obligatorio.',
            'nueva.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'confirmacion.required' => 'El campo Confirmar nueva contraseña es obligatorio.',
        ]);

        $validador->after(function ($v) use ($request, $usuario) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }
            if (! Hash::check((string) $request->input('actual'), $usuario->contrasena_hash)) {
                $v->errors()->add('actual', 'La contraseña actual es incorrecta.');

                return;
            }
            if (Hash::check((string) $request->input('nueva'), $usuario->contrasena_hash)) {
                $v->errors()->add('nueva', 'La nueva contraseña debe ser distinta de la actual.');
            }
            if ($request->input('confirmacion') !== $request->input('nueva')) {
                $v->errors()->add('confirmacion', 'Las contraseñas no coinciden.');
            }
        });
        $validador->validate();

        // Se guarda cifrada. saveQuietly evita el registro automatico de "Editar usuario":
        // el historial guarda abajo una sola operacion "Cambiar contraseña".
        $usuario->contrasena_hash = Hash::make($request->input('nueva'));
        $usuario->saveQuietly();

        // La sesion actual sigue abierta; las demas sesiones del usuario se cierran.
        $actual = $usuario->currentAccessToken();
        $usuario->tokens()->when($actual && isset($actual->id), fn ($q) => $q->where('id', '!=', $actual->id))->delete();

        Historial::registrar('Cambiar contraseña', 'Usuarios', "Usuario {$usuario->nombre_completo} cambió su contraseña", $usuario);

        return response()->json(['message' => 'Contraseña actualizada con éxito.']);
    }
}
