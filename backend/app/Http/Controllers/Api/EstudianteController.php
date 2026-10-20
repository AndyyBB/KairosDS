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
            ->orderBy('nombre_completo')
            ->paginate(min((int) $request->query('per_page', 20), 100));
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
