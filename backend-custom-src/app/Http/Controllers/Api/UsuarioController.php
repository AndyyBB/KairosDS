<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUsuarioRequest;
use App\Http\Requests\UpdateUsuarioRequest;
use App\Mail\CuentaCreada;
use App\Models\Role;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UsuarioController extends Controller
{
    public function index()
    {
        return Usuario::with('rol')->orderBy('nombre_completo')->get();
    }

    // Catalogo de roles disponibles, usado por el formulario de HU-15.
    public function roles()
    {
        return Role::orderBy('nombre')->get();
    }

    // HU-15: Registro de usuarios
    public function store(StoreUsuarioRequest $request)
    {
        $data = $request->validated();

        $usuario = Usuario::create([
            'nombres' => trim($data['nombres']),
            'apellidos' => trim($data['apellidos']),
            'correo_electronico' => $data['correo_electronico'],
            'contrasena_hash' => Hash::make($data['password']),
            'rol_id' => $data['rol_id'],
        ]);
        $usuario->load('rol');

        // Sprint 4 (observacion 4): se avisa al usuario por correo que se creo su cuenta.
        // Si el correo no se puede enviar, la cuenta igual queda creada y se informa.
        $correoEnviado = true;
        try {
            Mail::to($usuario->correo_electronico)->send(new CuentaCreada($usuario, $request->user()?->nombre_completo));
        } catch (\Throwable $e) {
            $correoEnviado = false;
            Log::warning('No se pudo enviar el correo de cuenta creada a '.$usuario->correo_electronico.': '.$e->getMessage());
        }

        return response()->json([
            ...$usuario->toArray(),
            'correo_enviado' => $correoEnviado,
            'message' => $correoEnviado
                ? 'Usuario registrado con éxito. Se envió un correo a '.$usuario->correo_electronico.' para avisarle que se creó su cuenta.'
                : 'Usuario registrado con éxito, pero no se pudo enviar el correo de aviso. Revisa la configuración de correo del servidor.',
        ], 201);
    }

    public function show(Usuario $usuario)
    {
        return $usuario->load('rol');
    }

    public function update(UpdateUsuarioRequest $request, Usuario $usuario)
    {
        $data = $request->validated();

        // HU-32: al desactivar una cuenta se protege la propia cuenta y al ultimo administrador activo.
        if (array_key_exists('activo', $data) && ! $data['activo'] && $usuario->activo) {
            if ($request->user()?->id === $usuario->id) {
                return response()->json([
                    'message' => 'No puedes desactivar tu propia cuenta.',
                    'errors' => ['activo' => ['No puedes desactivar tu propia cuenta.']],
                ], 422);
            }
            if ($usuario->esAdministrador()) {
                $adminsActivos = Usuario::where('activo', true)
                    ->whereHas('rol', fn ($q) => $q->where('nombre', 'administrador'))
                    ->count();
                if ($adminsActivos <= 1) {
                    return response()->json([
                        'message' => 'No se puede desactivar al único administrador activo.',
                        'errors' => ['activo' => ['No se puede desactivar al único administrador activo.']],
                    ], 422);
                }
            }
        }

        if (! empty($data['password'])) {
            $data['contrasena_hash'] = Hash::make($data['password']);
        }
        unset($data['password']);

        $usuario->update($data);

        // Un usuario desactivado pierde sus sesiones abiertas y ya no puede ingresar.
        if (array_key_exists('activo', $data) && ! $data['activo']) {
            $usuario->tokens()->delete();
        }

        return $usuario->load('rol');
    }

    // El usuario se elimina definitivamente de la base de datos. No se puede eliminar la
    // propia cuenta, ni al ultimo administrador, ni a un usuario que registro examenes,
    // habilitaciones o ingresos (esos registros quedarian sin responsable).
    public function destroy(Request $request, Usuario $usuario)
    {
        if ($request->user()?->id === $usuario->id) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta.'], 409);
        }

        if ($usuario->esAdministrador()) {
            $admins = Usuario::whereHas('rol', fn ($q) => $q->where('nombre', 'administrador'))->count();
            if ($admins <= 1) {
                return response()->json(['message' => 'No se puede eliminar al único administrador.'], 409);
            }
        }

        $registros = [
            'exámenes' => DB::table('examenes')->where('creado_por', $usuario->id)->exists(),
            'habilitaciones' => DB::table('habilitaciones')->where('registrado_por', $usuario->id)->exists(),
            'ingresos' => DB::table('ingresos')->where('usuario_id', $usuario->id)->exists()
                || DB::table('expulsiones')->where('usuario_id', $usuario->id)->exists(),
            'intentos de ingreso' => DB::table('intentos_ingreso')->where('usuario_id', $usuario->id)->exists(),
            'incidencias' => DB::table('incidencias')->where('usuario_id', $usuario->id)->exists(),
        ];
        $conRegistros = array_keys(array_filter($registros));
        if ($conRegistros) {
            return response()->json([
                'message' => 'No se puede eliminar el usuario porque registró '.implode(', ', $conRegistros).' en el sistema.',
            ], 409);
        }

        DB::transaction(function () use ($usuario) {
            DB::table('respaldos')->where('usuario_id', $usuario->id)->update(['usuario_id' => null]);
            DB::table('inscripciones_examen')->where('registrado_por', $usuario->id)->update(['registrado_por' => null]);
            $usuario->tokens()->delete();
            $usuario->delete();
        });

        return response()->json(['message' => 'Usuario eliminado con éxito.']);
    }
}
