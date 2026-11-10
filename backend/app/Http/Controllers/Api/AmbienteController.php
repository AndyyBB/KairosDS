<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Examen;
use App\Support\Historial;
use App\Http\Requests\StoreAmbienteRequest;
use App\Http\Requests\UpdateAmbienteRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AmbienteController extends Controller
{
    // HU-03: Registro de ambientes
    public function index(Request $request)
    {
        return Ambiente::when($request->boolean('solo_activos', true), fn ($q) => $q->where('activo', true))
            ->orderBy('nombre')
            ->get();
    }

    public function store(StoreAmbienteRequest $request)
    {
        $data = $request->validated();

        return response()->json(Ambiente::create($data), 201);
    }

    public function show(Ambiente $ambiente)
    {
        return $ambiente;
    }

    // HU-30 (Sprint 4, observacion 15): solo se edita la capacidad maxima (ver
    // UpdateAmbienteRequest). Un ambiente eliminado (NO ACTIVO) ya no se edita.
    public function update(UpdateAmbienteRequest $request, Ambiente $ambiente)
    {
        if (! $ambiente->activo) {
            return response()->json(['message' => 'El ambiente fue eliminado y ya no se puede editar.'], 422);
        }

        $ambiente->update(['capacidad_maxima' => $request->validated()['capacidad_maxima']]);

        return $ambiente;
    }

    // HU-31 (Sprint 4, observacion 16): la eliminacion es LOGICA. El ambiente no se borra de
    // la base de datos: queda como NO ACTIVO, deja de aparecer para programar examenes y se
    // conservan los examenes, ingresos e incidencias donde se uso. No se puede eliminar
    // mientras este asignado a un examen pendiente (programado o en curso).
    public function destroy(Ambiente $ambiente)
    {
        if (! $ambiente->activo) {
            return response()->json(['message' => 'El ambiente ya fue eliminado.'], 422);
        }

        $pendientes = $this->examenesPendientes($ambiente);
        if ($pendientes->isNotEmpty()) {
            return response()->json([
                'message' => 'No se puede eliminar el ambiente porque está asignado a exámenes que todavía no terminan: '
                    .$pendientes->join(', ', ' y ').'. Primero cámbiale el aula a esos exámenes en "Editar examen".',
                'examenes' => $pendientes->values(),
            ], 409);
        }

        DB::transaction(function () use ($ambiente) {
            $ambiente->activo = false;
            $ambiente->saveQuietly();

            // HU-27: queda en el historial como eliminacion.
            Historial::registrar(
                'Eliminar',
                'Ambientes',
                "Ambiente {$ambiente->nombre} eliminado: queda como NO ACTIVO y se conservan los exámenes e ingresos donde se usó",
                $ambiente,
                ['activo' => true],
                ['activo' => false]
            );
        });

        return response()->json(['message' => 'Ambiente eliminado con éxito.']);
    }

    // Para la pantalla "Eliminar ambiente": avisa antes de intentar si se puede eliminar.
    public function eliminable(Ambiente $ambiente)
    {
        $pendientes = $this->examenesPendientes($ambiente);

        return response()->json([
            'eliminable' => $ambiente->activo && $pendientes->isEmpty(),
            'examenes' => $pendientes->values(),
        ]);
    }

    // Examenes no cancelados que usan el ambiente y todavia no terminaron (hora de La Paz).
    private function examenesPendientes(Ambiente $ambiente)
    {
        $ahora = now('America/La_Paz')->format('Y-m-d H:i:s');

        return Examen::with('materia')
            ->where('estado', '!=', 'cancelado')
            ->where(fn ($q) => $q->where('ambiente_id', $ambiente->id)
                ->orWhereHas('ambientes', fn ($a) => $a->where('ambientes.id', $ambiente->id)))
            ->whereRaw('(fecha + hora_inicio + make_interval(mins => COALESCE(duracion_min, 0))) > ?::timestamp', [$ahora])
            ->orderBy('fecha')->orderBy('hora_inicio')
            ->get()
            ->map(fn (Examen $e) => trim(($e->materia?->nombre ?? 'Examen').' ('.\Carbon\Carbon::parse($e->fecha)->format('d/m/Y').' '.substr((string) $e->hora_inicio, 0, 5).')'));
    }
}
