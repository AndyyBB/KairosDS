<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExamenRequest;
use App\Http\Requests\UpdateExamenRequest;
use App\Models\Examen;
use App\Support\BorradoDefinitivo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamenController extends Controller
{
    public function index(Request $request)
    {
        return Examen::with([
            'materia',
            'ambiente',
            'ambientes',
            // Normas generales del examen (las que no son de un estudiante en particular).
            'normas' => fn ($q) => $q->whereNull('estudiante_id')->orderBy('id'),
        ])
            ->when($request->query('fecha'), fn ($q, $v) => $q->whereDate('fecha', $v))
            ->when($request->query('materia_id'), fn ($q, $v) => $q->where('materia_id', $v))
            // Examenes cancelados antes de que la eliminacion fuera definitiva: no se
            // listan salvo que se pidan (la Lista de examenes los muestra para poder eliminarlos).
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
        $ambientes = array_values($data['ambientes']);
        unset($data['normas'], $data['ambientes']);

        $examen = DB::transaction(function () use ($data, $normas, $ambientes, $request) {
            // El primer ambiente queda como principal (columna ambiente_id).
            $examen = Examen::create([
                ...$data,
                'ambiente_id' => $ambientes[0],
                'creado_por' => $request->user()->id,
            ]);
            $examen->ambientes()->sync($ambientes);

            foreach ($normas as $norma) {
                $examen->normas()->create($norma);
            }

            return $examen;
        });

        return response()->json($examen->load(['materia', 'ambiente', 'ambientes', 'normas']), 201);
    }

    public function show(Examen $examen)
    {
        return $examen->load(['materia', 'ambiente', 'ambientes', 'normas', 'habilitaciones.estudiante']);
    }

    // HU-08: Edicion de examenes
    public function update(UpdateExamenRequest $request, Examen $examen)
    {
        $data = $request->validated();
        $ambientes = isset($data['ambientes']) ? array_values($data['ambientes']) : null;
        $tieneNormas = array_key_exists('normas', $data);
        $normas = $data['normas'] ?? [];
        unset($data['ambientes'], $data['normas']);

        DB::transaction(function () use ($examen, $data, $ambientes, $tieneNormas, $normas) {
            if ($ambientes) {
                $data['ambiente_id'] = $ambientes[0];
            }
            $examen->update($data);

            if ($ambientes) {
                $examen->ambientes()->sync($ambientes);
            } elseif (isset($data['ambiente_id'])) {
                $examen->ambientes()->sync([$data['ambiente_id']]);
            }

            // Se reemplazan solo las normas generales (las particulares de cada estudiante se conservan).
            if ($tieneNormas) {
                $examen->normas()->whereNull('estudiante_id')->delete();
                foreach ($normas as $norma) {
                    $examen->normas()->create($norma);
                }
            }
        });

        return $examen->load(['materia', 'ambiente', 'ambientes', 'normas']);
    }

    // HU-09: Eliminacion de examenes. El examen se elimina definitivamente de la base de
    // datos junto con sus normas, ambientes, inscripciones, habilitaciones, ingresos e intentos.
    public function destroy(Examen $examen)
    {
        DB::transaction(function () use ($examen) {
            BorradoDefinitivo::permitirBorrarIntentos();

            $habilitaciones = DB::table('habilitaciones')->where('examen_id', $examen->id)->pluck('id');
            BorradoDefinitivo::borrarIngresosDeHabilitaciones($habilitaciones);
            DB::table('intentos_ingreso')->where('examen_id', $examen->id)->delete();

            // normas, habilitaciones, incidencias, examen_ambiente e inscripciones_examen
            // se borran en cascada.
            $examen->delete();
        });

        return response()->json(['message' => 'Examen eliminado con éxito.']);
    }
}
