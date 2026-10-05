<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHabilitacionRequest;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Habilitacion;
use App\Models\Inscripcion;
use Illuminate\Validation\ValidationException;

class HabilitacionController extends Controller
{
    // Listado de habilitaciones de un examen
    public function index(Examen $examen)
    {
        return $examen->habilitaciones()->with(['estudiante', 'motivo'])->get();
    }

    // Estudiantes inscritos en la materia del examen, con su estado de
    // habilitacion actual (o null si aun no se registro). Alimenta la
    // pantalla de HU-04 / HU-05 para que el personal elija de una lista
    // en vez de teclear codigos a ciegas.
    public function inscritos(Examen $examen)
    {
        $estudiantes = Estudiante::query()
            ->where('activo', true)
            ->whereHas('inscripciones', function ($q) use ($examen) {
                $q->where('materia_id', $examen->materia_id)->where('activo', true);
            })
            ->with('carrera')
            ->orderBy('nombre_completo')
            ->get();

        $habilitaciones = $examen->habilitaciones()
            ->with('motivo')
            ->get()
            ->keyBy('estudiante_id');

        return $estudiantes->map(fn ($estudiante) => [
            'estudiante' => $estudiante,
            'habilitacion' => $habilitaciones->get($estudiante->id),
        ])->values();
    }

    // HU-04: Asociacion de estudiantes habilitados a un examen
    public function store(StoreHabilitacionRequest $request, Examen $examen)
    {
        $data = $request->validated();

        // Un examen ya finalizado o cancelado no admite nuevas habilitaciones.
        if (in_array($examen->estado_actual, ['finalizado', 'cancelado'], true)) {
            throw ValidationException::withMessages([
                'examen' => 'No se puede habilitar estudiantes en un examen '.$examen->estado_actual.'.',
            ]);
        }

        // Regla de negocio (HU-04 / HU-26): el estudiante debe estar inscrito en la
        // materia del examen para poder ser habilitado.
        $inscrito = Inscripcion::where('estudiante_id', $data['estudiante_id'])
            ->where('materia_id', $examen->materia_id)
            ->where('activo', true)
            ->exists();

        if (! $inscrito) {
            throw ValidationException::withMessages([
                'estudiante_id' => 'El estudiante no está inscrito en la materia de este examen.',
            ]);
        }

        $habilitacion = Habilitacion::updateOrCreate(
            ['estudiante_id' => $data['estudiante_id'], 'examen_id' => $examen->id],
            [
                'habilitado' => $data['habilitado'],
                'motivo_id' => $data['motivo_id'] ?? null,
                'observacion' => $data['observacion'] ?? null,
                'registrado_por' => $request->user()->id,
            ]
        );

        return response()->json($habilitacion->load(['estudiante', 'motivo']), 201);
    }

    // HU-05: Consulta del motivo de inhabilitacion de un estudiante
    public function show(Examen $examen, $estudianteId)
    {
        $habilitacion = $examen->habilitaciones()
            ->with(['estudiante', 'motivo'])
            ->where('estudiante_id', $estudianteId)
            ->firstOrFail();

        return $habilitacion;
    }
}
