<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreEstudianteRequest;
use App\Http\Requests\UpdateEstudianteRequest;
use App\Models\Estudiante;
use App\Support\BorradoDefinitivo;
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
            $estudiante->carreras()->sync($carreras);

            return $estudiante;
        });

        return response()->json($estudiante->load('carrera', 'carreras'), 201);
    }

    public function show(Estudiante $estudiante)
    {
        return $estudiante->load('carrera', 'carreras', 'inscripciones.materia');
    }

    // HU-06: Edicion de estudiantes
    public function update(UpdateEstudianteRequest $request, Estudiante $estudiante)
    {
        $data = $request->validated();
        $carreras = isset($data['carreras']) ? array_values($data['carreras']) : null;
        unset($data['carreras']);

        DB::transaction(function () use ($estudiante, $data, $carreras) {
            if ($carreras) {
                $data['carrera_id'] = $carreras[0];
                $estudiante->carreras()->sync($carreras);
            }
            $estudiante->update($data);
        });

        return $estudiante->load('carrera', 'carreras');
    }

    // HU-07: Eliminacion de estudiantes (borrado logico, preserva historial de ingresos)
    // HU-07: el estudiante se elimina definitivamente de la base de datos, junto con sus
    // carreras, inscripciones, habilitaciones, ingresos e intentos de ingreso.
    public function destroy(Estudiante $estudiante)
    {
        DB::transaction(function () use ($estudiante) {
            BorradoDefinitivo::permitirBorrarIntentos();

            $habilitaciones = DB::table('habilitaciones')->where('estudiante_id', $estudiante->id)->pluck('id');
            BorradoDefinitivo::borrarIngresosDeHabilitaciones($habilitaciones);
            DB::table('habilitaciones')->where('estudiante_id', $estudiante->id)->delete();
            DB::table('intentos_ingreso')->where('estudiante_id', $estudiante->id)->delete();
            DB::table('normas_examen')->where('estudiante_id', $estudiante->id)->delete();
            DB::table('incidencias')->where('estudiante_id', $estudiante->id)->delete();

            // inscripciones, estudiante_carrera e inscripciones_examen se borran en cascada.
            $estudiante->delete();
        });

        return response()->json(['message' => 'Estudiante eliminado con éxito.']);
    }
}
