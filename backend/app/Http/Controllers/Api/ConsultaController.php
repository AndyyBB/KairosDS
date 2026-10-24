<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\Habilitacion;
use App\Models\Ingreso;
use App\Models\InscripcionExamen;
use App\Support\BuscarEstudiante;
use App\Support\Formato;
use App\Support\Historial;
use Carbon\Carbon;
use Illuminate\Http\Request;

// Sprint 3: HU-05 (Consulta del motivo de inhabilitacion) y HU-18 (Consulta en tiempo
// real de estudiantes ingresados).
class ConsultaController extends Controller
{
    // Lista de examenes de las pantallas de consultas e incidencias.
    // alcance=activos: examenes de hoy o que todavia no finalizaron (por defecto).
    // alcance=todos: todos los examenes no cancelados (los mas recientes primero).
    public function examenes(Request $request)
    {
        $consulta = $request->query('alcance') === 'todos'
            ? Examen::with(['materia', 'ambiente', 'ambientes'])->where('estado', '!=', 'cancelado')
                ->orderByDesc('fecha')->orderByDesc('hora_inicio')->limit(200)
            : Formato::examenesActivos();

        return $consulta->get()->map(fn (Examen $e) => Formato::examen($e))->values();
    }

    // HU-05: motivo por el que un estudiante no esta habilitado para un examen.
    public function motivo(Request $request)
    {
        $data = $request->validate([
            'examen_id' => ['required', 'integer', 'exists:examenes,id'],
            'valor' => ['required', 'string', 'max:30'],
        ], [
            'examen_id.required' => 'Seleccione un examen.',
            'examen_id.exists' => 'Seleccione un examen.',
            'valor.required' => 'Ingrese el código universitario o documento de identidad.',
        ]);

        $estudiante = BuscarEstudiante::por($data['valor']);
        if (! $estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        $examen = Examen::with(['materia', 'ambiente', 'ambientes'])->findOrFail($data['examen_id']);
        $base = [
            'estudiante' => BuscarEstudiante::datos($estudiante),
            'examen' => Formato::examen($examen),
        ];

        $inscrito = InscripcionExamen::where('examen_id', $examen->id)->where('estudiante_id', $estudiante->id)->exists();
        $habilitacion = Habilitacion::with('motivo')->where('examen_id', $examen->id)->where('estudiante_id', $estudiante->id)->first();

        if (! $inscrito && ! $habilitacion) {
            return response()->json([...$base, 'estado' => 'no_inscrito', 'message' => 'El estudiante no está inscrito en este examen.']);
        }
        if ($habilitacion?->habilitado) {
            return response()->json([...$base, 'estado' => 'habilitado', 'message' => 'El estudiante está habilitado para este examen.']);
        }
        if (! $habilitacion) {
            return response()->json([...$base, 'estado' => 'sin_habilitacion', 'message' => 'El estudiante todavía no tiene registrada su habilitación para este examen.']);
        }

        // Motivo registrado al habilitar a los estudiantes (HU-04).
        $partes = array_filter([$habilitacion->motivo?->descripcion, $habilitacion->observacion]);
        $motivo = $partes ? implode('. ', array_unique($partes)) : 'Motivo no especificado.';

        // HU-05 (11): la consulta queda en el historial de operaciones.
        Historial::registrar('Consultar', 'Consultas', 'Motivo de inhabilitación de '.$estudiante->codigo_universitario
            .' en '.Historial::examen($examen));

        return response()->json([
            ...$base,
            'estado' => 'no_habilitado',
            'motivo' => $motivo,
            'consultado' => Formato::generado($request->user()),
        ]);
    }

    // HU-18: estudiantes que ya ingresaron al examen y los habilitados que aun no se presentaron.
    public function ingresados(Request $request, Examen $examen)
    {
        if (! self::puedeVerIngresados($request->user())) {
            return response()->json(['message' => 'No tiene permisos para realizar esta acción.'], 403);
        }

        $habilitaciones = Habilitacion::with(['estudiante.carreras', 'estudiante.carrera'])
            ->where('examen_id', $examen->id)
            ->where('habilitado', true)
            ->get();
        $ingresos = Ingreso::with('ambiente')
            ->whereIn('habilitacion_id', $habilitaciones->pluck('id'))
            ->get()
            ->keyBy('habilitacion_id');
        $expulsiones = Expulsion::whereIn('ingreso_id', $ingresos->pluck('id'))->get()->keyBy('ingreso_id');

        $ingresaron = [];
        $pendientes = [];
        foreach ($habilitaciones as $h) {
            $e = $h->estudiante;
            if (! $e) {
                continue;
            }
            $ingreso = $ingresos->get($h->id);
            if ($ingreso) {
                $expulsion = $expulsiones->get($ingreso->id);
                $ingresaron[] = [
                    'id' => $ingreso->id,
                    'orden' => Carbon::parse($ingreso->fecha_hora_ingreso)->timestamp,
                    'hora' => Formato::hora($ingreso->fecha_hora_ingreso),
                    'nombre' => $e->nombre_completo,
                    'codigo' => $e->codigo_universitario,
                    'ambiente' => $ingreso->ambiente?->nombre,
                    'expulsado' => (bool) $expulsion,
                    'hora_expulsion' => $expulsion ? Formato::hora($expulsion->fecha_hora) : null,
                ];
            } else {
                $pendientes[] = [
                    'id' => $e->id,
                    'nombre' => $e->nombre_completo,
                    'codigo' => $e->codigo_universitario,
                    'carrera' => BuscarEstudiante::datos($e)['carrera'],
                ];
            }
        }
        usort($ingresaron, fn ($a, $b) => $b['orden'] <=> $a['orden']);
        usort($pendientes, fn ($a, $b) => strcmp($a['nombre'], $b['nombre']));

        return response()->json([
            'examen' => Formato::examen($examen),
            'ingresaron' => array_map(fn ($i) => collect($i)->except('orden')->all(), $ingresaron),
            'pendientes' => $pendientes,
            'resumen' => [
                'ingresados' => count($ingresaron),
                'habilitados' => $habilitaciones->count(),
                'sin_presentarse' => count($pendientes),
            ],
            'actualizado' => Carbon::now(Formato::TZ)->format('H:i:s'),
        ]);
    }

    // HU-18 (14): Administrador, Docente o roles con permiso sobre Control de ingreso.
    public static function puedeVerIngresados($usuario): bool
    {
        if (! $usuario) {
            return false;
        }
        if (in_array($usuario->rol?->nombre, ['administrador', 'docente'], true)) {
            return true;
        }

        return collect($usuario->permisosDeSesion())->contains(fn ($p) => str_starts_with($p, 'control_ingreso.'));
    }
}
