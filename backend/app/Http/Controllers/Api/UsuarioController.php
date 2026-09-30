<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUsuarioRequest;
use App\Http\Requests\UpdateUsuarioRequest;
use App\Models\Role;
use App\Models\Usuario;
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

    public function destroy(Usuario $usuario)
    {
        $usuario->update(['activo' => false]);

        return response()->json(['message' => 'Usuario desactivado.']);
    }
}
