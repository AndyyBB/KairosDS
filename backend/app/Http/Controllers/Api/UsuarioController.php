<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUsuarioRequest;
use App\Http\Requests\UpdateUsuarioRequest;
use App\Models\Role;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
            'nombre_completo' => $data['nombre_completo'],
            'correo_electronico' => $data['correo_electronico'],
            'contrasena_hash' => Hash::make($data['password']),
            'rol_id' => $data['rol_id'],
        ]);

        return response()->json($usuario->load('rol'), 201);
    }

    public function show(Usuario $usuario)
    {
        return $usuario->load('rol');
    }

    public function update(UpdateUsuarioRequest $request, Usuario $usuario)
    {
        $data = $request->validated();

        if (! empty($data['password'])) {
            $data['contrasena_hash'] = Hash::make($data['password']);
        }
        unset($data['password']);

        $usuario->update($data);

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
            'operaciones del historial' => DB::table('historial_operaciones')->where('usuario_id', $usuario->id)->exists(),
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
