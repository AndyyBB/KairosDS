<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Habilitacion;
use App\Models\Ingreso;
use App\Models\InscripcionExamen;
use App\Support\Historial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Inscripcion de estudiantes a un EXAMEN (tabla `inscripciones_examen`).
// Un examen nuevo empieza sin inscritos. Al inscribir a un estudiante queda
// SIN DECIDIR (no se crea habilitacion): el docente debe marcarlo como
// "Habilitado" o "No habilitado" (con motivo) desde "Habilitar estudiantes" (HU-04).
// Los inscritos son los que reconoce el Control de ingreso (HU-11).
class InscripcionController extends Controller
{
    // Estudiantes activos con su estado de inscripcion en el examen.
    public function index(Request $request, Examen $examen)
    {
        $consulta = $this->estudiantesFiltrados($request)->with(['carrera', 'carreras']);

        if ($request->boolean('solo_inscritos')) {
            $consulta->whereIn('id', $this->inscritosIds($examen));
        }
        // Sprint 4: "Inscribir estudiantes" muestra por defecto solo a los que faltan inscribir.
        if ($request->boolean('solo_no_inscritos')) {
            $consulta->whereNotIn('id', $this->inscritosIds($examen));
        }

        $pagina = $consulta
            ->orderBy('nombre_completo')
            ->paginate(min((int) $request->query('per_page', 20), 100));

        $inscritos = InscripcionExamen::where('examen_id', $examen->id)
            ->whereIn('estudiante_id', $pagina->pluck('id'))
            ->pluck('estudiante_id')
            ->all();

        // Estudiantes de la pagina que ya registraron su ingreso (no se pueden desinscribir).
        $conIngreso = $this->conIngresoIds($examen, $pagina->pluck('id')->all());

        $pagina->getCollection()->transform(function (Estudiante $e) use ($inscritos, $conIngreso) {
            $e->setAttribute('inscrito', in_array($e->id, $inscritos, true));
            $e->setAttribute('con_ingreso', in_array($e->id, $conIngreso, true));

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

    // Sprint 4 (observacion 3): pantalla "Desinscribir estudiantes". Quita la inscripcion (y la
    // habilitacion) de los estudiantes seleccionados. Los que ya registraron su ingreso no se
    // desinscriben y se informan en el mensaje.
    public function quitar(Request $request, Examen $examen)
    {
        if (in_array($examen->estado_actual, ['finalizado', 'cancelado'], true)) {
            return response()->json([
                'message' => 'No se puede modificar la inscripción de un examen '.$examen->estado_actual.'.',
            ], 422);
        }

        $data = $request->validate([
            'estudiante_ids' => ['required', 'array', 'min:1'],
            'estudiante_ids.*' => ['integer'],
        ], [
            'estudiante_ids.required' => 'Selecciona al menos un estudiante.',
            'estudiante_ids.min' => 'Selecciona al menos un estudiante.',
        ]);

        $inscritos = InscripcionExamen::where('examen_id', $examen->id)
            ->whereIn('estudiante_id', $data['estudiante_ids'])
            ->pluck('estudiante_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $conIngreso = $this->conIngresoIds($examen, $inscritos);
        $quitar = array_values(array_diff($inscritos, $conIngreso));

        if (! $quitar) {
            return response()->json([
                'message' => $conIngreso
                    ? 'No se puede desinscribir: los estudiantes seleccionados ya registraron su ingreso a este examen.'
                    : 'Los estudiantes seleccionados no están inscritos en este examen.',
            ], 422);
        }

        DB::transaction(function () use ($examen, $quitar) {
            InscripcionExamen::where('examen_id', $examen->id)->whereIn('estudiante_id', $quitar)->delete();
            // Sin inscripcion no tiene sentido conservar su habilitacion en este examen.
            Habilitacion::where('examen_id', $examen->id)->whereIn('estudiante_id', $quitar)->delete();
        });

        // HU-27: queda en el historial de operaciones.
        $codigos = Estudiante::whereIn('id', $quitar)->orderBy('codigo_universitario')->pluck('codigo_universitario')->all();
        $examen->loadMissing('materia');
        Historial::registrar(
            'Desinscribir',
            'Habilitaciones',
            'Desinscripción de '.count($quitar).' estudiante(s) del examen '.($examen->materia?->nombre ?? $examen->id)
                .' del '.$examen->fecha?->format('d/m/Y').': '.implode(', ', $codigos),
            $examen
        );

        $n = count($quitar);
        $mensaje = $n === 1 ? '1 estudiante desinscrito con éxito.' : "$n estudiantes desinscritos con éxito.";
        if ($conIngreso) {
            $mensaje .= count($conIngreso) === 1
                ? ' 1 estudiante no se desinscribió porque ya registró su ingreso.'
                : ' '.count($conIngreso).' estudiantes no se desinscribieron porque ya registraron su ingreso.';
        }

        return response()->json([
            'message' => $mensaje,
            'desinscritos' => $n,
            'total_inscritos' => $this->totalInscritos($examen),
        ]);
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

    private function conIngresoIds(Examen $examen, array $estudianteIds): array
    {
        if (! $estudianteIds) {
            return [];
        }

        return Habilitacion::where('examen_id', $examen->id)
            ->whereIn('estudiante_id', $estudianteIds)
            ->whereHas('ingreso')
            ->pluck('estudiante_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

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
