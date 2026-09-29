<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use Illuminate\Http\Request;

class CarreraController extends Controller
{
    public function index()
    {
        return Carrera::orderBy('nombre')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:10', 'unique:carreras,codigo'],
            'nombre' => ['required', 'string', 'max:100'],
        ]);

        return response()->json(Carrera::create($data), 201);
    }

    public function show(Carrera $carrera)
    {
        return $carrera;
    }

    public function update(Request $request, Carrera $carrera)
    {
        $data = $request->validate([
            'codigo' => ['sometimes', 'required', 'string', 'max:10'],
            'nombre' => ['sometimes', 'required', 'string', 'max:100'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $carrera->update($data);

        return $carrera;
    }

    public function destroy(Carrera $carrera)
    {
        $carrera->update(['activo' => false]);

        return response()->json(['message' => 'Carrera desactivada.']);
    }
}
