<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExamenRequest;
use App\Http\Requests\UpdateExamenRequest;
use App\Models\Examen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamenController extends Controller
{
    public function index(Request $request)
    {
        return Examen::with([
            'materia',
            'ambiente',
            // Normas generales del examen (las que no son de un estudiante en particular).
            'normas' => fn ($q) => $q->whereNull('estudiante_id')->orderBy('id'),
        ])
            ->when($request->query('fecha'), fn ($q, $v) => $q->whereDate('fecha', $v))
            ->when($request->query('materia_id'), fn ($q, $v) => $q->where('materia_id', $v))
            // Un examen cancelado deja de aparecer en la lista (el registro se
            // conserva en la base de datos para no perder el historial).
            ->when(! $request->boolean('incluir_cancelados'), fn ($q) => $q->where('estado', '!=', 'cancelado'))
            // Los mas recientes primero: asi el examen recien programado aparece
            // arriba y no queda escondido en una pagina posterior.
            ->orderByDesc('fecha')
            ->orderByDesc('hora_inicio')
            ->paginate(min((int) $request->query('per_page', 20), 100));
    }

    // HU-02: Registro de examenes (Programar examen)
    public function store(StoreExamenRequest $request)
    {
        $data = $request->validated();
        $normas = $data['normas'] ?? [];
        unset($data['normas']);

        $examen = DB::transaction(function () use ($data, $normas, $request) {
            $examen = Examen::create([
                ...$data,
                'creado_por' => $request->user()->id,
            ]);

            foreach ($normas as $norma) {
                $examen->normas()->create($norma);
            }

            return $examen;
        });

        return response()->json($examen->load(['materia', 'ambiente', 'normas']), 201);
    }

    public function show(Examen $examen)
    {
        return $examen->load(['materia', 'ambiente', 'normas', 'habilitaciones.estudiante']);
    }

    // HU-08: Edicion de examenes
    public function update(UpdateExamenRequest $request, Examen $examen)
    {
        $examen->update($request->validated());

        return $examen->load(['materia', 'ambiente']);
    }

    // HU-09: Eliminacion de examenes (se cancela, no se borra: preserva historial de ingresos/habilitaciones)
    public function destroy(Examen $examen)
    {
        $examen->update(['estado' => 'cancelado']);

        return response()->json(['message' => 'Examen cancelado.']);
    }
}
