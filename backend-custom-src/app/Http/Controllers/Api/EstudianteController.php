<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEstudianteRequest;
use App\Http\Requests\UpdateEstudianteRequest;
use App\Models\Estudiante;
use App\Support\Historial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EstudianteController extends Controller
{
    // HU-01: Registro de estudiantes
    public function index(Request $request)
    {
        return Estudiante::with('carrera', 'carreras')
            ->when($request->query('buscar'), function ($q, $buscar) {
                $q->where(function ($qq) use ($buscar) {
                    $qq->where('codigo_universitario', 'ilike', "%{$buscar}%")
                        ->orWhere('documento_identidad', 'ilike', "%{$buscar}%")
                        ->orWhere('nombre_completo', 'ilike', "%{$buscar}%");
                });
            })
            ->when($request->boolean('solo_activos', true), fn ($q) => $q->where('activo', true))
            // Filtros (boton "Filtros" de las listas y de las tablas de seleccion).
            ->when($request->query('carrera_id'), fn ($q, $carrera) => $q->whereHas(
                'carreras',
                fn ($qq) => $qq->where('carreras.id', $carrera)
            ))
            // Filtro "Código (primeros 4 dígitos)": codigos que empiezan con esos 4 digitos (2022 -> 202244567).
            ->when($request->query('anio_ingreso'), fn ($q, $anio) => $q->where(
                'codigo_universitario',
                'like',
                substr(preg_replace('/\D/', '', (string) $anio), 0, 4).'%'
            ))
            // Estudiantes inscritos en un examen.
            ->when($request->query('examen_id'), fn ($q, $examen) => $q->whereExists(
                fn ($s) => $s->from('inscripciones_examen')
                    ->whereColumn('inscripciones_examen.estudiante_id', 'estudiantes.id')
                    ->where('inscripciones_examen.examen_id', $examen)
            ))
            // Habilitacion (en el examen elegido o en cualquier examen).
            ->when(in_array($request->query('habilitacion'), ['habilitado', 'no_habilitado'], true), fn ($q) => $q->whereHas(
                'habilitaciones',
                fn ($qq) => $qq->where('habilitado', $request->query('habilitacion') === 'habilitado')
                    ->when($request->query('examen_id'), fn ($x, $examen) => $x->where('examen_id', $examen))
            ))
            ->when(true, fn ($q) => match ($request->query('orden')) {
                'codigo' => $q->orderBy('codigo_universitario'),
                'anio_reciente' => $q->orderByDesc('codigo_universitario'),
                default => $q->orderBy('nombre_completo'),
            })
            ->paginate(min((int) $request->query('per_page', 20), 100));
    }

    // Primeros 4 digitos de los codigos universitarios registrados, para el filtro
    // "Código (primeros 4 dígitos)".
    public function anios()
    {
        return Estudiante::query()
            ->where('activo', true)
            ->selectRaw('DISTINCT LEFT(codigo_universitario, 4) AS anio')
            ->whereRaw("codigo_universitario ~ '^[0-9]{4}'")
            ->orderByDesc('anio')
            ->pluck('anio');
    }

    public function store(StoreEstudianteRequest $request)
    {
        $data = $request->validated();
        $carreras = array_values($data['carreras']);
        unset($data['carreras']);

        $estudiante = DB::transaction(function () use ($data, $carreras) {
            $estudiante = Estudiante::create([...$data, 'carrera_id' => $carreras[0]]);
            // Cada carrera queda vigente desde hoy.
            $hoy = now('America/La_Paz')->toDateString();
            foreach ($carreras as $carrera) {
                $estudiante->carreras()->attach($carrera, ['fecha_inicio' => $hoy]);
            }

            return $estudiante;
        });

        return response()->json($estudiante->load('carrera', 'carreras'), 201);
    }

    public function show(Estudiante $estudiante)
    {
        return $estudiante->load('carrera', 'carreras', 'historialCarreras', 'inscripciones.materia');
    }

    // HU-06: Edicion de estudiantes (Sprint 4, observacion 11 de la licenciada).
    // Solo se pueden modificar el correo institucional y las carreras. El codigo
    // universitario (que identifica al estudiante), el documento de identidad y el nombre
    // no se modifican. Las carreras se manejan por periodos: al quitar una carrera se cierra
    // su periodo (fecha_fin = hoy) y al agregar una nueva se abre un periodo desde hoy.
    public function update(UpdateEstudianteRequest $request, Estudiante $estudiante)
    {
        if (! $estudiante->activo) {
            return response()->json(['message' => 'El estudiante fue eliminado y ya no se puede editar.'], 422);
        }

        $data = $request->validated();
        $carreras = isset($data['carreras']) ? array_values(array_map('intval', $data['carreras'])) : null;
        unset($data['carreras']);

        DB::transaction(function () use ($estudiante, $data, $carreras) {
            if ($carreras !== null) {
                $hoy = now('America/La_Paz')->toDateString();
                $vigentes = DB::table('estudiante_carrera')
                    ->where('estudiante_id', $estudiante->id)
                    ->whereNull('fecha_fin')
                    ->pluck('carrera_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();

                $terminadas = array_values(array_diff($vigentes, $carreras));
                $nuevas = array_values(array_diff($carreras, $vigentes));

                if ($terminadas) {
                    DB::table('estudiante_carrera')
                        ->where('estudiante_id', $estudiante->id)
                        ->whereIn('carrera_id', $terminadas)
                        ->whereNull('fecha_fin')
                        ->update(['fecha_fin' => $hoy]);
                }
                foreach ($nuevas as $carrera) {
                    DB::table('estudiante_carrera')->insert([
                        'estudiante_id' => $estudiante->id,
                        'carrera_id' => $carrera,
                        'fecha_inicio' => $hoy,
                        'created_at' => now(),
                    ]);
                }

                // HU-27: el cambio de carreras queda en el historial de operaciones.
                if ($terminadas || $nuevas) {
                    $nombres = DB::table('carreras')->whereIn('id', [...$terminadas, ...$nuevas])->pluck('nombre', 'id');
                    $fecha = now('America/La_Paz')->format('d/m/Y');
                    $partes = [];
                    foreach ($nuevas as $id) {
                        $partes[] = "se agregó {$nombres[$id]} (vigente desde {$fecha})";
                    }
                    foreach ($terminadas as $id) {
                        $partes[] = "terminó {$nombres[$id]} (vigente hasta {$fecha})";
                    }
                    Historial::registrar(
                        'Editar',
                        'Estudiantes',
                        "Carreras del estudiante {$estudiante->codigo_universitario} ({$estudiante->nombre_completo}): ".implode('; ', $partes),
                        $estudiante,
                        ['carreras' => $vigentes],
                        ['carreras' => $carreras]
                    );
                }

                // La carrera principal es la primera carrera vigente.
                $data['carrera_id'] = $carreras[0];
            }

            $estudiante->update($data);
        });

        return $estudiante->load('carrera', 'carreras', 'historialCarreras');
    }

    // HU-07: Eliminacion de estudiantes (Sprint 4, observacion 12 de la licenciada).
    // La eliminacion es LOGICA: el estudiante no se borra de la base de datos, queda como
    // NO ACTIVO (activo = false). Ya no aparece en las listas, busquedas ni en el control de
    // ingreso, pero se conservan sus ingresos, intentos de ingreso, expulsiones e
    // incidencias (por ejemplo, para la central de riesgos y las auditorias).
    // Solo se quitan sus inscripciones y habilitaciones en examenes que todavia no empezaron
    // y en los que no registro su ingreso.
    public function destroy(Estudiante $estudiante)
    {
        if (! $estudiante->activo) {
            return response()->json(['message' => 'El estudiante ya fue eliminado.'], 422);
        }

        DB::transaction(function () use ($estudiante) {
            $ahora = now('America/La_Paz')->format('Y-m-d H:i:s');
            $examenesPendientes = DB::table('examenes')
                ->whereRaw('(fecha + hora_inicio) > ?::timestamp', [$ahora])
                ->pluck('id');

            if ($examenesPendientes->isNotEmpty()) {
                DB::table('habilitaciones')
                    ->where('estudiante_id', $estudiante->id)
                    ->whereIn('examen_id', $examenesPendientes)
                    ->whereNotExists(fn ($q) => $q->from('ingresos')->whereColumn('ingresos.habilitacion_id', 'habilitaciones.id'))
                    ->delete();
                DB::table('inscripciones_examen')
                    ->where('estudiante_id', $estudiante->id)
                    ->whereIn('examen_id', $examenesPendientes)
                    ->delete();
            }

            $estudiante->activo = false;
            $estudiante->saveQuietly();

            // HU-27: queda en el historial como eliminacion.
            Historial::registrar(
                'Eliminar',
                'Estudiantes',
                "Estudiante {$estudiante->codigo_universitario} ({$estudiante->nombre_completo}) eliminado: queda como NO ACTIVO y se conserva su historial",
                $estudiante,
                ['activo' => true],
                ['activo' => false]
            );
        });

        return response()->json(['message' => 'Estudiante eliminado con éxito.']);
    }
}
