<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Materia;
use Illuminate\Http\Request;

class MateriaController extends Controller
{
    public function index(Request $request)
    {
        return Materia::with('carrera')
            ->when($request->query('carrera_id'), fn ($q, $v) => $q->where('carrera_id', $v))
            ->orderBy('nombre')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'sigla' => ['required', 'string', 'max:15', 'unique:materias,sigla'],
            'nombre' => ['required', 'string', 'max:100'],
            'carrera_id' => ['required', 'integer', 'exists:carreras,id'],
        ]);

        return response()->json(Materia::create($data), 201);
    }

    public function show(Materia $materia)
    {
        return $materia->load('carrera');
    }

    public function update(Request $request, Materia $materia)
    {
        $data = $request->validate([
            'sigla' => ['sometimes', 'required', 'string', 'max:15'],
            'nombre' => ['sometimes', 'required', 'string', 'max:100'],
            'carrera_id' => ['sometimes', 'required', 'integer', 'exists:carreras,id'],
            'activo' => ['sometimes', 'boolean'],
        ]);

        $materia->update($data);

        return $materia;
    }

    public function destroy(Materia $materia)
    {
        $materia->update(['activo' => false]);

        return response()->json(['message' => 'Materia desactivada.']);
    }
}
