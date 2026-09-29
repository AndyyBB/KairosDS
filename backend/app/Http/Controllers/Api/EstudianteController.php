<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEstudianteRequest;
use App\Http\Requests\UpdateEstudianteRequest;
use App\Models\Estudiante;
use Illuminate\Http\Request;

class EstudianteController extends Controller
{
    // HU-01: Registro de estudiantes
    public function index(Request $request)
    {
        return Estudiante::with('carrera')
            ->when($request->query('buscar'), function ($q, $buscar) {
                $q->where(function ($qq) use ($buscar) {
                    $qq->where('codigo_universitario', 'ilike', "%{$buscar}%")
                        ->orWhere('documento_identidad', 'ilike', "%{$buscar}%")
                        ->orWhere('nombre_completo', 'ilike', "%{$buscar}%");
                });
            })
            ->when($request->boolean('solo_activos', true), fn ($q) => $q->where('activo', true))
            ->orderBy('nombre_completo')
            ->paginate(20);
    }

    public function store(StoreEstudianteRequest $request)
    {
        $estudiante = Estudiante::create($request->validated());

        return response()->json($estudiante->load('carrera'), 201);
    }

    public function show(Estudiante $estudiante)
    {
        return $estudiante->load('carrera', 'inscripciones.materia');
    }

    // HU-06: Edicion de estudiantes
    public function update(UpdateEstudianteRequest $request, Estudiante $estudiante)
    {
        $estudiante->update($request->validated());

        return $estudiante->load('carrera');
    }

    // HU-07: Eliminacion de estudiantes (borrado logico, preserva historial de ingresos)
    public function destroy(Estudiante $estudiante)
    {
        $estudiante->update(['activo' => false]);

        return response()->json(['message' => 'Estudiante desactivado.']);
    }
}
