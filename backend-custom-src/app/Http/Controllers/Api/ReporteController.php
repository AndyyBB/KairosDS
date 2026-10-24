<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\Habilitacion;
use App\Models\Ingreso;
use App\Models\IntentoIngreso;
use App\Support\BuscarEstudiante;
use App\Support\Formato;
use App\Support\Historial;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Sprint 3: HU-19 (Reporte de asistencia), HU-20 (Reporte de ausentismo), HU-21 (Reporte
// de intentos de ingreso indebido) y HU-22 (Reporte de estudiantes registrados por
// examen). Solo para los roles Administrador y Docente (ver routes/api.php). La
// exportacion a PDF y Excel se hace en el navegador con estos mismos datos.
class ReporteController extends Controller
{
    private const MSG_RANGO = 'La fecha Desde no puede ser posterior a la fecha Hasta.';

    private function porcentaje(int $parte, int $total): string
    {
        return $total > 0 ? number_format($parte * 100 / $total, 1, ',', '').' %' : '0,0 %';
    }

    private function validarRango(Request $request): array
    {
        $data = $request->validate([
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date'],
        ], [
            'desde.date' => 'La fecha Desde no es válida.',
            'hasta.date' => 'La fecha Hasta no es válida.',
        ]);
        if (! empty($data['desde']) && ! empty($data['hasta']) && $data['desde'] > $data['hasta']) {
            abort(response()->json(['message' => self::MSG_RANGO, 'errors' => ['desde' => [self::MSG_RANGO]]], 422));
        }

        return [$data['desde'] ?? null, $data['hasta'] ?? null];
    }

    // Examenes para los selectores de los reportes (los mas recientes primero).
    public function examenes()
    {
        return Examen::with(['materia', 'ambiente', 'ambientes'])
            ->where('estado', '!=', 'cancelado')
            ->orderByDesc('fecha')
            ->orderByDesc('hora_inicio')
            ->limit(300)
            ->get()
            ->map(fn (Examen $e) => Formato::examen($e))
            ->values();
    }

    // HU-19
    public function asistencia(Request $request, Examen $examen)
    {
        $habilitados = Habilitacion::where('examen_id', $examen->id)->where('habilitado', true)->count();
        $ingresos = Ingreso::with(['habilitacion.estudiante.carreras', 'habilitacion.estudiante.carrera', 'ambiente', 'expulsion'])
            ->whereHas('habilitacion', fn ($q) => $q->where('examen_id', $examen->id))
            ->orderBy('fecha_hora_ingreso')
            ->orderBy('id')
            ->get();

        $filas = $ingresos->values()->map(function (Ingreso $i, $n) {
            $e = $i->habilitacion?->estudiante;
            $d = $e ? BuscarEstudiante::datos($e) : [];

            return [
                'n' => $n + 1,
                'nombre' => $d['nombre_completo'] ?? '',
                'codigo' => $d['codigo_universitario'] ?? '',
                'documento' => $d['documento_identidad'] ?? '',
                'carrera' => $d['carrera'] ?? '',
                'hora_ingreso' => Formato::hora($i->fecha_hora_ingreso),
                'ambiente' => $i->ambiente?->nombre,
                'expulsado' => (bool) $i->expulsion,
                'hora_expulsion' => $i->expulsion ? Formato::hora($i->expulsion->fecha_hora) : null,
            ];
        });

        Historial::registrar('Generar reporte', 'Reportes', 'Reporte de asistencia de '.Historial::examen($examen));

        return response()->json([
            'examen' => Formato::examen($examen),
            'filas' => $filas,
            'resumen' => [
                'asistentes' => $filas->count(),
                'habilitados' => $habilitados,
                'porcentaje' => $this->porcentaje($filas->count(), $habilitados),
                'primer_ingreso' => $filas->first()['hora_ingreso'] ?? null,
                'ultimo_ingreso' => $filas->last()['hora_ingreso'] ?? null,
                'expulsados' => $filas->where('expulsado', true)->count(),
            ],
            'generado' => Formato::generado($request->user()),
        ]);
    }

    // HU-20
    public function ausentismo(Request $request, Examen $examen)
    {
        $habilitaciones = Habilitacion::with(['estudiante.carreras', 'estudiante.carrera'])
            ->where('examen_id', $examen->id)
            ->where('habilitado', true)
            ->get();
        $conIngreso = Ingreso::whereIn('habilitacion_id', $habilitaciones->pluck('id'))->pluck('habilitacion_id')->all();

        $filas = $habilitaciones
            ->reject(fn ($h) => in_array($h->id, $conIngreso, true) || ! $h->estudiante)
            ->map(fn ($h) => BuscarEstudiante::datos($h->estudiante))
            ->sortBy('nombre_completo', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->map(fn ($d, $n) => [
                'n' => $n + 1,
                'nombre' => $d['nombre_completo'],
                'codigo' => $d['codigo_universitario'],
                'documento' => $d['documento_identidad'],
                'carrera' => $d['carrera'],
                'correo' => $d['correo_institucional'],
            ]);

        Historial::registrar('Generar reporte', 'Reportes', 'Reporte de ausentismo de '.Historial::examen($examen));

        return response()->json([
            'examen' => Formato::examen($examen),
            'filas' => $filas,
            'resumen' => [
                'ausentes' => $filas->count(),
                'habilitados' => $habilitaciones->count(),
                'porcentaje' => $this->porcentaje($filas->count(), $habilitaciones->count()),
            ],
            'finalizado' => $examen->estado_actual === 'finalizado',
            'generado' => Formato::generado($request->user()),
        ]);
    }

    // HU-21
    public function intentos(Request $request)
    {
        [$desde, $hasta] = $this->validarRango($request);
        $examenId = $request->query('examen_id');
        [$ini, $fin] = Formato::rangoDias($desde, $hasta);

        $intentos = IntentoIngreso::with(['estudiante', 'usuario', 'examen.materia'])
            ->when($examenId, fn ($q) => $q->where('examen_id', $examenId))
            ->when($ini, fn ($q) => $q->where('fecha_hora', '>=', $ini))
            ->when($fin, fn ($q) => $q->where('fecha_hora', '<=', $fin))
            ->orderByDesc('fecha_hora')
            ->orderByDesc('id')
            ->limit(2000)
            ->get();

        $filas = $intentos->map(fn (IntentoIngreso $i) => [
            'fecha' => Formato::fecha($i->fecha_hora),
            'hora' => Formato::hora($i->fecha_hora),
            'codigo' => $i->codigo_ingresado ?: $i->estudiante?->codigo_universitario,
            'nombre' => $i->estudiante?->nombre_completo ?? 'Estudiante no registrado',
            'examen' => $i->examen ? Historial::examen($i->examen) : '',
            'motivo' => $this->motivoIntento($i->motivo_rechazo),
            'verificado_por' => $i->usuario?->nombre_completo,
        ])->values();

        $examen = $examenId ? Examen::find($examenId) : null;
        Historial::registrar('Generar reporte', 'Reportes', 'Reporte de intentos de ingreso indebido ('
            .($examen ? Historial::examen($examen) : 'todos los exámenes').')');

        return response()->json([
            'filas' => $filas,
            'resumen' => [
                'total' => $filas->count(),
                'por_motivo' => $filas->countBy('motivo')->map(fn ($c, $m) => ['motivo' => $m, 'cantidad' => $c])->values(),
            ],
            'examen' => $examen ? Formato::examen($examen) : null,
            'generado' => Formato::generado($request->user()),
        ]);
    }

    private function motivoIntento(?string $motivo): string
    {
        $m = mb_strtolower(trim((string) $motivo));

        return match (true) {
            str_contains($m, 'no inscrito') => 'No inscrito en el examen',
            str_contains($m, 'no habilitado') => 'No habilitado',
            default => $motivo ? mb_strtoupper(mb_substr($motivo, 0, 1)).mb_substr($motivo, 1) : 'Sin motivo',
        };
    }

    // HU-22
    public function registrados(Request $request)
    {
        [$desde, $hasta] = $this->validarRango($request);

        $examenes = Examen::with(['materia', 'ambiente', 'ambientes'])
            ->where('estado', '!=', 'cancelado')
            ->when($desde, fn ($q) => $q->whereDate('fecha', '>=', $desde))
            ->when($hasta, fn ($q) => $q->whereDate('fecha', '<=', $hasta))
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->limit(500)
            ->get();
        $ids = $examenes->pluck('id');

        $inscritos = DB::table('inscripciones_examen')->whereIn('examen_id', $ids)
            ->selectRaw('examen_id, COUNT(*) AS n')->groupBy('examen_id')->pluck('n', 'examen_id');
        $habilitados = DB::table('habilitaciones')->whereIn('examen_id', $ids)->where('habilitado', true)
            ->selectRaw('examen_id, COUNT(*) AS n')->groupBy('examen_id')->pluck('n', 'examen_id');
        $noHabilitados = DB::table('habilitaciones')->whereIn('examen_id', $ids)->where('habilitado', false)
            ->selectRaw('examen_id, COUNT(*) AS n')->groupBy('examen_id')->pluck('n', 'examen_id');
        $ingresados = DB::table('ingresos')->join('habilitaciones', 'habilitaciones.id', '=', 'ingresos.habilitacion_id')
            ->whereIn('habilitaciones.examen_id', $ids)
            ->selectRaw('habilitaciones.examen_id AS examen_id, COUNT(*) AS n')->groupBy('habilitaciones.examen_id')
            ->pluck('n', 'examen_id');

        $totales = ['inscritos' => 0, 'habilitados' => 0, 'no_habilitados' => 0, 'ingresados' => 0, 'ausentes' => 0];
        $pendientes = [];
        $filas = $examenes->map(function (Examen $e) use ($inscritos, $habilitados, $noHabilitados, $ingresados, &$totales, &$pendientes) {
            $finalizado = $e->estado_actual === 'finalizado';
            $fila = [
                'id' => $e->id,
                'asignatura' => $e->materia?->nombre,
                'fecha' => $e->fecha?->format('d/m/Y'),
                'hora' => substr((string) $e->hora_inicio, 0, 5),
                'ambientes' => Formato::ambientes($e),
                'estado' => $e->estado_actual,
                'inscritos' => (int) ($inscritos[$e->id] ?? 0),
                'habilitados' => (int) ($habilitados[$e->id] ?? 0),
                'no_habilitados' => (int) ($noHabilitados[$e->id] ?? 0),
                'ingresados' => (int) ($ingresados[$e->id] ?? 0),
            ];
            // Los ausentes se conocen cuando el examen finaliza.
            $fila['ausentes'] = $finalizado ? max(0, $fila['habilitados'] - $fila['ingresados']) : null;
            if (! $finalizado) {
                $pendientes[] = $fila['asignatura'];
            }
            foreach (['inscritos', 'habilitados', 'no_habilitados', 'ingresados'] as $c) {
                $totales[$c] += $fila[$c];
            }
            $totales['ausentes'] += $fila['ausentes'] ?? 0;

            return $fila;
        })->values();

        Historial::registrar('Generar reporte', 'Reportes', 'Reporte de estudiantes registrados por examen'
            .($desde || $hasta ? ' ('.($desde ? Carbon::parse($desde)->format('d/m/Y') : '…').' – '.($hasta ? Carbon::parse($hasta)->format('d/m/Y') : '…').')' : ''));

        return response()->json([
            'filas' => $filas,
            'totales' => $totales,
            'pendientes' => array_values(array_unique($pendientes)),
            'generado' => Formato::generado($request->user()),
        ]);
    }
}
