<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Habilitacion;
use App\Models\Ingreso;
use App\Models\InscripcionExamen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Inscripcion de estudiantes a un EXAMEN (tabla `inscripciones_examen`).
// Un examen nuevo empieza sin inscritos. Al inscribir a un estudiante queda
// HABILITADO por defecto (se crea su habilitacion); luego se puede cambiar a
// "No habilitado" con su motivo desde "Habilitar estudiantes" (HU-04). Los inscritos
// son los que reconoce el Control de ingreso (HU-11).
class InscripcionController extends Controller
{
    // Estudiantes activos con su estado de inscripcion en el examen.
    public function index(Request $request, Examen $examen)
    {
        $consulta = $this->estudiantesFiltrados($request)->with(['carrera', 'carreras']);

        if ($request->boolean('solo_inscritos')) {
            $consulta->whereIn('id', $this->inscritosIds($examen));
        }

        $pagina = $consulta
            ->orderBy('nombre_completo')
            ->paginate(min((int) $request->query('per_page', 20), 100));

        $inscritos = InscripcionExamen::where('examen_id', $examen->id)
            ->whereIn('estudiante_id', $pagina->pluck('id'))
            ->pluck('estudiante_id')
            ->all();

        $pagina->getCollection()->transform(function (Estudiante $e) use ($inscritos) {
            $e->setAttribute('inscrito', in_array($e->id, $inscritos, true));

            return $e;
        });

        $datos = $pagina->toArray();
        $datos['total_inscritos'] = $this->totalInscritos($examen);

        return response()->json($datos);
    }

    // Inscribe estudiantes en el examen (seleccionados o todos los filtrados).
    public function store(Request $request, Examen $examen)
    {
        if (in_array($examen->estado_actual, ['finalizado', 'cancelado'], true)) {
            return response()->json([
                'message' => 'No se puede inscribir estudiantes en un examen '.$examen->estado_actual.'.',
            ], 422);
        }

        $data = $request->validate([
            'estudiante_ids' => ['required_without:todos', 'array', 'min:1'],
            'estudiante_ids.*' => ['integer', 'exists:estudiantes,id'],
            'todos' => ['sometimes', 'boolean'],
        ], [
            'estudiante_ids.required_without' => 'Seleccione al menos un estudiante.',
            'estudiante_ids.min' => 'Seleccione al menos un estudiante.',
            'estudiante_ids.*.exists' => 'El estudiante no existe.',
        ]);

        $ids = ! empty($data['todos'])
            ? $this->estudiantesFiltrados($request)->pluck('id')->all()
            : Estudiante::where('activo', true)->whereIn('id', $data['estudiante_ids'])->pluck('id')->all();

        $usuarioId = $request->user()->id;
        $nuevos = 0;

        DB::transaction(function () use ($ids, $examen, $usuarioId, &$nuevos) {
            $yaInscritos = InscripcionExamen::where('examen_id', $examen->id)
                ->whereIn('estudiante_id', $ids)
                ->pluck('estudiante_id')
                ->all();

            foreach ($ids as $id) {
                if (in_array($id, $yaInscritos, true)) {
                    continue;
                }

                InscripcionExamen::create([
                    'examen_id' => $examen->id,
                    'estudiante_id' => $id,
                    'registrado_por' => $usuarioId,
                ]);

                // Inscrito = habilitado por defecto (si ya tenia una habilitacion se respeta).
                Habilitacion::firstOrCreate(
                    ['estudiante_id' => $id, 'examen_id' => $examen->id],
                    ['habilitado' => true, 'registrado_por' => $usuarioId]
                );

                $nuevos++;
            }
        });

        $mensaje = match (true) {
            $nuevos === 0 => 'Los estudiantes seleccionados ya estaban inscritos.',
            $nuevos === 1 => '1 estudiante inscrito con éxito.',
            default => "$nuevos estudiantes inscritos con éxito.",
        };

        return response()->json([
            'message' => $mensaje,
            'inscritos_nuevos' => $nuevos,
            'total_inscritos' => $this->totalInscritos($examen),
        ], 201);
    }

    // Quita la inscripcion de un estudiante en el examen.
    public function destroy(Examen $examen, Estudiante $estudiante)
    {
        if (in_array($examen->estado_actual, ['finalizado', 'cancelado'], true)) {
            return response()->json([
                'message' => 'No se puede modificar la inscripción de un examen '.$examen->estado_actual.'.',
            ], 422);
        }

        $yaIngreso = Ingreso::whereHas('habilitacion', fn ($q) => $q
            ->where('examen_id', $examen->id)->where('estudiante_id', $estudiante->id))->exists();

        if ($yaIngreso) {
            return response()->json([
                'message' => 'No se puede quitar la inscripción: el estudiante ya registró su ingreso a este examen.',
            ], 422);
        }

        DB::transaction(function () use ($examen, $estudiante) {
            InscripcionExamen::where('examen_id', $examen->id)
                ->where('estudiante_id', $estudiante->id)
                ->delete();

            // Sin inscripcion no tiene sentido conservar su habilitacion en este examen.
            Habilitacion::where('examen_id', $examen->id)
                ->where('estudiante_id', $estudiante->id)
                ->delete();
        });

        return response()->json([
            'message' => 'Inscripción quitada.',
            'total_inscritos' => $this->totalInscritos($examen),
        ]);
    }

    // ---------------------------------------------------------------------

    private function inscritosIds(Examen $examen)
    {
        return InscripcionExamen::where('examen_id', $examen->id)->select('estudiante_id');
    }

    private function estudiantesFiltrados(Request $request)
    {
        return Estudiante::query()
            ->where('activo', true)
            ->when($request->input('buscar'), function ($q, $buscar) {
                $q->where(function ($qq) use ($buscar) {
                    $qq->where('codigo_universitario', 'ilike', "%{$buscar}%")
                        ->orWhere('documento_identidad', 'ilike', "%{$buscar}%")
                        ->orWhere('nombre_completo', 'ilike', "%{$buscar}%");
                });
            })
            ->when($request->input('carrera_id'), function ($q, $carreraId) {
                $q->where(function ($qq) use ($carreraId) {
                    $qq->where('carrera_id', $carreraId)
                        ->orWhereHas('carreras', fn ($c) => $c->where('carreras.id', $carreraId));
                });
            });
    }

    private function totalInscritos(Examen $examen): int
    {
        return InscripcionExamen::where('examen_id', $examen->id)
            ->whereHas('estudiante', fn ($q) => $q->where('activo', true))
            ->count();
    }
}
