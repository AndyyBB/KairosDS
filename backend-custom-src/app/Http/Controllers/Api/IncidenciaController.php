<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\Habilitacion;
use App\Models\Incidencia;
use App\Models\Ingreso;
use App\Models\TipoIncidencia;
use App\Support\BuscarEstudiante;
use App\Support\Formato;
use App\Support\Historial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Sprint 3: HU-24 (Registro de estudiantes expulsados) y HU-25 (Registro de situaciones
// excepcionales).
class IncidenciaController extends Controller
{
    // Tipos de situacion excepcional de HU-25 (en este orden).
    public const TIPOS_SITUACION = [
        'IDENTIFICACION' => 'Problema de identificación',
        'CAMBIO_AMBIENTE' => 'Cambio de ambiente',
        'NO_HABILITADO' => 'Estudiante no habilitado',
        'PROBLEMA_SALUD' => 'Malestar o emergencia de salud',
        'OTRA' => 'Otra situación',
    ];

    private const MSG_EXAMEN = ['examen_id.required' => 'Seleccione un examen.', 'examen_id.exists' => 'Seleccione un examen.'];

    private const MSG_VALOR = 'Ingrese el código universitario o documento de identidad.';

    // Ingreso del estudiante en el examen (si lo registro).
    private function ingresoDe(int $examenId, int $estudianteId): ?Ingreso
    {
        $habilitacion = Habilitacion::where('examen_id', $examenId)->where('estudiante_id', $estudianteId)->first();

        return $habilitacion ? Ingreso::with(['ambiente', 'expulsion'])->where('habilitacion_id', $habilitacion->id)->first() : null;
    }

    // ---------------- HU-24 ----------------

    // Busca al estudiante y su ingreso al examen seleccionado.
    public function buscarParaExpulsion(Request $request)
    {
        $data = $request->validate([
            'examen_id' => ['required', 'integer', 'exists:examenes,id'],
            'valor' => ['required', 'string', 'max:30'],
        ], [...self::MSG_EXAMEN, 'valor.required' => self::MSG_VALOR]);

        $estudiante = BuscarEstudiante::por($data['valor']);
        if (! $estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        $ingreso = $this->ingresoDe($data['examen_id'], $estudiante->id);
        if (! $ingreso) {
            return response()->json(['message' => 'El estudiante no registró su ingreso a este examen.'], 422);
        }
        if ($ingreso->expulsion) {
            return response()->json([
                'message' => 'El estudiante ya fue expulsado de este examen a las '.Formato::hora($ingreso->expulsion->fecha_hora).'.',
            ], 409);
        }

        return response()->json([
            'estudiante' => BuscarEstudiante::datos($estudiante),
            'ingreso' => [
                'id' => $ingreso->id,
                'hora' => Formato::hora($ingreso->fecha_hora_ingreso),
                'ambiente' => $ingreso->ambiente?->nombre,
            ],
        ]);
    }

    public function registrarExpulsion(Request $request)
    {
        $data = $request->validate([
            'examen_id' => ['required', 'integer', 'exists:examenes,id'],
            'ingreso_id' => ['required', 'integer', 'exists:ingresos,id'],
            'motivo' => ['required', 'string', 'max:300'],
        ], [
            ...self::MSG_EXAMEN,
            'ingreso_id.required' => 'Busque al estudiante antes de registrar la expulsión.',
            'ingreso_id.exists' => 'Busque al estudiante antes de registrar la expulsión.',
            'motivo.required' => 'El campo Motivo de la expulsión es obligatorio.',
            'motivo.max' => 'El campo Motivo de la expulsión tiene un límite de 300 caracteres.',
        ]);

        $ingreso = Ingreso::with(['habilitacion', 'expulsion'])->findOrFail($data['ingreso_id']);
        if ((int) $ingreso->habilitacion?->examen_id !== (int) $data['examen_id']) {
            return response()->json(['message' => 'El estudiante no registró su ingreso a este examen.'], 422);
        }
        if ($ingreso->expulsion) {
            return response()->json([
                'message' => 'El estudiante ya fue expulsado de este examen a las '.Formato::hora($ingreso->expulsion->fecha_hora).'.',
            ], 409);
        }

        $expulsion = Expulsion::create([
            'ingreso_id' => $ingreso->id,
            'motivo' => trim($data['motivo']),
            'fecha_hora' => now(),
            'usuario_id' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Expulsión registrada con éxito a las '.Formato::hora($expulsion->fecha_hora).'.',
        ], 201);
    }

    // ---------------- HU-25 ----------------

    public function tipos()
    {
        $tipos = TipoIncidencia::whereIn('codigo', array_keys(self::TIPOS_SITUACION))->get()->keyBy('codigo');

        return collect(self::TIPOS_SITUACION)
            ->filter(fn ($_, $codigo) => $tipos->has($codigo))
            ->map(fn ($nombre, $codigo) => ['id' => $tipos[$codigo]->id, 'codigo' => $codigo, 'nombre' => $nombre])
            ->values();
    }

    // Estudiante (opcional) de la situacion, con su ingreso al examen si lo registro.
    public function buscarEstudiante(Request $request)
    {
        $data = $request->validate([
            'valor' => ['required', 'string', 'max:30'],
            'examen_id' => ['nullable', 'integer', 'exists:examenes,id'],
        ], ['valor.required' => self::MSG_VALOR]);

        $estudiante = BuscarEstudiante::por($data['valor']);
        if (! $estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }
        $ingreso = ! empty($data['examen_id']) ? $this->ingresoDe($data['examen_id'], $estudiante->id) : null;

        return response()->json([
            'estudiante' => BuscarEstudiante::datos($estudiante),
            'ingreso' => $ingreso ? [
                'id' => $ingreso->id,
                'hora' => Formato::hora($ingreso->fecha_hora_ingreso),
                'ambiente_id' => $ingreso->ambiente_id,
                'ambiente' => $ingreso->ambiente?->nombre,
            ] : null,
        ]);
    }

    public function registrarSituacion(Request $request)
    {
        $data = $request->validate([
            'examen_id' => ['required', 'integer', 'exists:examenes,id'],
            'tipo_incidencia_id' => ['required', 'integer', 'exists:tipos_incidencia,id'],
            'estudiante_id' => ['nullable', 'integer', 'exists:estudiantes,id'],
            'ambiente_destino_id' => ['nullable', 'integer', 'exists:ambientes,id'],
            'descripcion' => ['required', 'string', 'max:500'],
        ], [
            ...self::MSG_EXAMEN,
            'tipo_incidencia_id.required' => 'El campo Tipo de situación es obligatorio.',
            'tipo_incidencia_id.exists' => 'El campo Tipo de situación es obligatorio.',
            'estudiante_id.exists' => 'Estudiante no encontrado.',
            'ambiente_destino_id.exists' => 'El ambiente no existe.',
            'descripcion.required' => 'El campo Descripción es obligatorio.',
            'descripcion.max' => 'El campo Descripción tiene un límite de 500 caracteres.',
        ]);

        $tipo = TipoIncidencia::findOrFail($data['tipo_incidencia_id']);
        $cambioAmbiente = $tipo->codigo === 'CAMBIO_AMBIENTE';
        $ingreso = null;

        if ($cambioAmbiente) {
            if (empty($data['estudiante_id']) || empty($data['ambiente_destino_id'])) {
                return response()->json(['message' => 'Seleccione al estudiante y el ambiente de destino.'], 422);
            }
            $ingreso = $this->ingresoDe($data['examen_id'], $data['estudiante_id']);
            if (! $ingreso) {
                return response()->json(['message' => 'El estudiante no registró su ingreso a este examen.'], 422);
            }
            if ((int) $ingreso->ambiente_id === (int) $data['ambiente_destino_id']) {
                return response()->json(['message' => 'El estudiante ya está en ese ambiente.'], 422);
            }
        }

        $incidencia = DB::transaction(function () use ($data, $cambioAmbiente, $ingreso, $request) {
            $incidencia = Incidencia::create([
                'examen_id' => $data['examen_id'],
                'estudiante_id' => $data['estudiante_id'] ?? null,
                'tipo_incidencia_id' => $data['tipo_incidencia_id'],
                'ambiente_destino_id' => $cambioAmbiente ? $data['ambiente_destino_id'] : null,
                'descripcion' => trim($data['descripcion']),
                'fecha_hora' => now(),
                'usuario_id' => $request->user()->id,
            ]);

            // HU-25 (13): en un cambio de ambiente se actualiza el ambiente del ingreso.
            if ($cambioAmbiente && $ingreso) {
                $examen = Examen::with('ambientes')->find($data['examen_id']);
                $permitidos = $examen->ambientes->pluck('id')->push($examen->ambiente_id)->filter()->unique();
                $ingreso->update([
                    'ambiente_id' => $data['ambiente_destino_id'],
                    'ambiente_correcto' => $permitidos->contains((int) $data['ambiente_destino_id']),
                ]);
            }

            return $incidencia;
        });

        return response()->json([
            'message' => 'Situación excepcional registrada con éxito a las '.Formato::hora($incidencia->fecha_hora).'.',
        ], 201);
    }
}
