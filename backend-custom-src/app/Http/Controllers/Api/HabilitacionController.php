<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHabilitacionRequest;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Habilitacion;
use App\Models\InscripcionExamen;
use Illuminate\Validation\ValidationException;

class HabilitacionController extends Controller
{
    // Listado de habilitaciones de un examen
    public function index(Examen $examen)
    {
        return $examen->habilitaciones()->with(['estudiante', 'motivo'])->get();
    }

    // Estudiantes inscritos en el examen (ver "Inscribir estudiantes"), con su estado de
    // habilitacion actual. Alimenta la pantalla de HU-04 / HU-05.
    public function inscritos(Examen $examen)
    {
        $estudiantes = Estudiante::query()
            ->where('activo', true)
            ->whereIn('id', InscripcionExamen::where('examen_id', $examen->id)->select('estudiante_id'))
            ->with(['carrera', 'carreras'])
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

        // Regla de negocio (HU-04 / HU-26): el estudiante debe estar inscrito en el examen.
        $inscrito = InscripcionExamen::where('estudiante_id', $data['estudiante_id'])
            ->where('examen_id', $examen->id)
            ->exists();

        if (! $inscrito) {
            throw ValidationException::withMessages([
                'estudiante_id' => 'El estudiante no está inscrito en este examen.',
            ]);
        }

        // HU-17: modificar una habilitacion ya registrada requiere el permiso "Editar";
        // registrar una nueva requiere "Registrar".
        $permisos = $request->user()->permisosDeSesion();
        $yaRegistrada = Habilitacion::where('estudiante_id', $data['estudiante_id'])
            ->where('examen_id', $examen->id)
            ->exists();
        if (! in_array($yaRegistrada ? 'habilitaciones.editar' : 'habilitaciones.registrar', $permisos, true)) {
            return response()->json(['message' => 'No tiene permisos para realizar esta acción.'], 403);
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
