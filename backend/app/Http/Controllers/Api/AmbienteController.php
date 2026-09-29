<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use Illuminate\Http\Request;

class AmbienteController extends Controller
{
    // HU-03: Registro de ambientes
    public function index(Request $request)
    {
        return Ambiente::when($request->boolean('solo_activos', true), fn ($q) => $q->where('activo', true))
            ->orderBy('nombre')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:50', 'unique:ambientes,nombre'],
            'capacidad_maxima' => ['required', 'integer', 'min:1'],
            'ubicacion' => ['required', 'string', 'max:100'],
        ]);

        return response()->json(Ambiente::create($data), 201);
    }

    public function show(Ambiente $ambiente)
    {
        return $ambiente;
    }

    public function update(Request $request, Ambiente $ambiente)
    {
        $data = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:50'],
            'capacidad_maxima' => ['sometimes', 'required', 'integer', 'min:1'],
            'ubicacion' => ['sometimes', 'required', 'string', 'max:100'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $ambiente->update($data);

        return $ambiente;
    }

    public function destroy(Ambiente $ambiente)
    {
        $ambiente->update(['activo' => false]);

        return response()->json(['message' => 'Ambiente desactivado.']);
    }
}
