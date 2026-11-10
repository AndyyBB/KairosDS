<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permiso;
use App\Models\Role;
use App\Models\Usuario;
use App\Support\Historial;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

// HU-17: configuracion de permisos por rol (modulo x accion).
class PermisoController extends Controller
{
    private const TZ = 'America/La_Paz';

    private const MODULOS = [
        'estudiantes' => 'Estudiantes',
        'ambientes' => 'Ambientes',
        'examenes' => 'Exámenes',
        'habilitaciones' => 'Habilitaciones',
        'control_ingreso' => 'Control de ingreso',
        'usuarios' => 'Usuarios',
    ];

    // "Ver" no se configura: queda habilitado al marcar Registrar, Editar o Eliminar.
    // (Reportes aun no tiene pantallas, por eso no aparece en la tabla y sus permisos se conservan.)
    private const ACCIONES = ['registrar', 'editar', 'eliminar'];

    // Sprint 4 (observaciones 19 y 20): los ingresos no se editan ni se eliminan, por eso
    // Control de ingreso solo tiene la accion Registrar.
    private const SIN_ACCION = ['control_ingreso.editar', 'control_ingreso.eliminar'];

    // Roles en el orden del mockup: Administrador, Docente, Personal de control de ingreso.
    public function roles()
    {
        $orden = ['administrador' => 1, 'docente' => 2, 'personal de control de ingreso' => 3];

        return Role::all()
            ->sortBy(fn (Role $r) => $orden[$r->nombre] ?? 99)
            ->values();
    }

    // HU-17 (2, 3, 4): tabla de modulos y acciones del rol seleccionado.
    public function show(Role $rol)
    {
        $esAdmin = $rol->nombre === 'administrador';
        $activos = $esAdmin
            ? Permiso::pluck('codigo')->all()
            : $rol->permisosAsignados()->pluck('codigo')->all();

        $modulos = [];
        foreach (self::MODULOS as $codigo => $etiqueta) {
            $fila = ['modulo' => $codigo, 'etiqueta' => $etiqueta];
            foreach (self::ACCIONES as $accion) {
                // null = la accion no existe en ese modulo (la tabla muestra "—").
                $fila[$accion] = in_array("$codigo.$accion", self::SIN_ACCION, true)
                    ? null
                    : in_array("$codigo.$accion", $activos, true);
            }
            $modulos[] = $fila;
        }

        return response()->json([
            'rol' => ['id' => $rol->id, 'nombre' => $rol->nombre],
            // El rol Administrador tiene todos los permisos y no se puede modificar.
            'bloqueado' => $esAdmin,
            'modulos' => $modulos,
            // Fecha de inicio y de fin de cada permiso asignado (formato dia/mes/anio).
            'vigencias' => $esAdmin ? (object) [] : (object) $this->vigencias($rol),
            'hoy' => Carbon::now(self::TZ)->format('Y-m-d'),
        ]);
    }

    // Periodo vigente (o programado) de cada permiso del rol: desde y hasta (null = sin fecha de fin).
    private function vigencias(Role $rol): array
    {
        $ahora = now()->utc()->format('Y-m-d H:i:s');
        $filas = DB::table('rol_permiso_vigencia as v')
            ->join('permisos as p', 'p.id', '=', 'v.permiso_id')
            ->where('v.rol_id', $rol->id)
            ->where(fn ($q) => $q->whereNull('v.vigente_hasta')->orWhere('v.vigente_hasta', '>', $ahora))
            ->orderBy('v.vigente_desde')
            ->get(['p.codigo', 'v.vigente_desde', 'v.vigente_hasta']);

        $resultado = [];
        foreach ($filas as $f) {
            $resultado[$f->codigo] = [
                'desde' => Carbon::parse($f->vigente_desde, 'UTC')->setTimezone(self::TZ)->format('d/m/Y'),
                // Fecha de fin inclusive: el permiso rige hasta el final de ese dia.
                'hasta' => $f->vigente_hasta ? Carbon::parse($f->vigente_hasta, 'UTC')->setTimezone(self::TZ)->format('d/m/Y') : null,
            ];
        }

        return $resultado;
    }

    // HU-17 (5, 6): guarda los permisos del rol seleccionado.
    public function update(Request $request, Role $rol)
    {
        if ($rol->nombre === 'administrador') {
            return response()->json([
                'message' => 'El rol Administrador tiene todos los permisos y no se puede modificar.',
            ], 422);
        }

        $codigos = Permiso::pluck('codigo')->all();

        $hoy = Carbon::now(self::TZ)->format('Y-m-d');
        $data = $request->validate([
            'permisos' => ['present', 'array'],
            'permisos.*' => ['string', Rule::in($codigos)],
            // Fechas desde/hasta de los permisos que se asignan en esta operacion.
            'vigente_desde' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.$hoy],
            'vigente_hasta' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.($request->input('vigente_desde') ?: $hoy)],
        ], [
            'vigente_desde.date_format' => 'La fecha de inicio no es válida.',
            'vigente_desde.after_or_equal' => 'La fecha de inicio no puede ser anterior a la fecha actual.',
            'vigente_hasta.date_format' => 'La fecha final no es válida.',
            'vigente_hasta.after_or_equal' => 'La fecha final no puede ser anterior a la fecha de inicio.',
        ]);
        $desdeDia = $data['vigente_desde'] ?? $hoy;
        $hastaDia = $data['vigente_hasta'] ?? null;

        // Se ignora cualquier "ver" enviado y se calcula a partir de las demas acciones;
        // los permisos de modulos que no estan en la tabla (Reportes) se conservan.
        $enTabla = array_keys(self::MODULOS);
        $marcados = array_values(array_filter($data['permisos'], function ($codigo) use ($enTabla) {
            [$modulo, $accion] = explode('.', $codigo, 2);

            return in_array($modulo, $enTabla, true) && $accion !== 'ver' && ! in_array($codigo, self::SIN_ACCION, true);
        }));
        $fuera = $rol->permisos()->pluck('codigo')->filter(
            fn ($codigo) => ! in_array(explode('.', $codigo, 2)[0], $enTabla, true)
        )->all();

        $codigosFinales = array_unique(array_merge(Usuario::conVerImplicito($marcados), $fuera));
        $ids = Permiso::whereIn('codigo', $codigosFinales)->pluck('id')->all();
        $antes = $rol->permisosAsignados()->pluck('codigo')->sort()->values()->all();
        $idsAntes = $rol->permisosAsignados()->pluck('permisos.id')->all();

        // Fechas de vigencia: el inicio es el comienzo de ese dia (si es hoy, el momento
        // actual) y el fin es el final de ese dia, hora de La Paz, guardadas en UTC.
        $inicio = $desdeDia === $hoy ? now() : Carbon::parse($desdeDia.' 00:00:00', self::TZ)->utc();
        $fin = $hastaDia ? Carbon::parse($hastaDia.' 23:59:59', self::TZ)->utc() : null;

        DB::transaction(function () use ($rol, $ids, $idsAntes, $request, $inicio, $fin) {
            $rol->permisos()->sync($ids);

            // Sprint 4 (observacion 10): periodos de vigencia de cada permiso del rol.
            $ahora = now();
            $usuarioId = $request->user()?->id;
            $retirados = array_values(array_diff($idsAntes, $ids));
            $otorgados = array_values(array_diff($ids, $idsAntes));
            if ($retirados) {
                DB::table('rol_permiso_vigencia')
                    ->where('rol_id', $rol->id)
                    ->whereIn('permiso_id', $retirados)
                    ->where(fn ($q) => $q->whereNull('vigente_hasta')->orWhere('vigente_hasta', '>', $ahora))
                    ->update([
                        'vigente_hasta' => DB::raw("GREATEST('".$ahora->copy()->utc()->format('Y-m-d H:i:s')."'::timestamp, vigente_desde)"),
                        'retirado_por' => $usuarioId,
                    ]);
            }
            foreach ($otorgados as $permisoId) {
                DB::table('rol_permiso_vigencia')->insert([
                    'rol_id' => $rol->id,
                    'permiso_id' => $permisoId,
                    'vigente_desde' => $inicio,
                    'vigente_hasta' => $fin,
                    'asignado_por' => $usuarioId,
                ]);
            }
        });

        // HU-27: el cambio de permisos queda en el historial (permisos agregados y quitados).
        $despues = collect($codigosFinales)->sort()->values()->all();
        $agregados = array_values(array_diff($despues, $antes));
        $quitados = array_values(array_diff($antes, $despues));
        if ($agregados || $quitados) {
            Historial::registrar('Editar', 'Roles y permisos', 'Permisos del rol '.ucfirst($rol->nombre)
                .($agregados ? ' — agregados: '.implode(', ', $agregados) : '')
                .($agregados ? ' (vigentes desde '.Carbon::parse($desdeDia)->format('d/m/Y').($hastaDia ? ' hasta '.Carbon::parse($hastaDia)->format('d/m/Y') : ', sin fecha de fin').')' : '')
                .($quitados ? ' — quitados: '.implode(', ', $quitados) : ''), $rol, ['permisos' => $antes], ['permisos' => $despues]);
        }

        return response()->json(['message' => 'Permisos actualizados con éxito.']);
    }

    // Sprint 4 (observacion 10): historial de permisos del rol por periodos, para las
    // auditorias. Con ?fecha=AAAA-MM-DD devuelve ademas los permisos que el rol tenia ese dia.
    public function historial(Request $request, Role $rol)
    {
        $data = $request->validate([
            'fecha' => ['nullable', 'date_format:Y-m-d'],
        ], [
            'fecha.date_format' => 'La fecha no es válida.',
        ]);

        $tz = 'America/La_Paz';
        $periodos = DB::table('rol_permiso_vigencia as v')
            ->join('permisos as p', 'p.id', '=', 'v.permiso_id')
            ->leftJoin('usuarios as ua', 'ua.id', '=', 'v.asignado_por')
            ->leftJoin('usuarios as ur', 'ur.id', '=', 'v.retirado_por')
            ->where('v.rol_id', $rol->id)
            ->where('p.codigo', 'not like', '%.ver')
            ->orderByDesc('v.vigente_desde')
            ->orderBy('p.codigo')
            ->get(['v.id', 'p.codigo', 'v.vigente_desde', 'v.vigente_hasta', 'ua.nombre_completo as asignado_por', 'ur.nombre_completo as retirado_por']);

        $fila = function ($v) use ($tz) {
            [$modulo, $accion] = explode('.', $v->codigo, 2);
            $desde = \Carbon\Carbon::parse($v->vigente_desde, 'UTC')->setTimezone($tz);
            $hasta = $v->vigente_hasta ? \Carbon\Carbon::parse($v->vigente_hasta, 'UTC')->setTimezone($tz) : null;

            return [
                'id' => $v->id,
                'permiso' => $v->codigo,
                'modulo' => self::MODULOS[$modulo] ?? ucfirst(str_replace('_', ' ', $modulo)),
                'accion' => ucfirst($accion),
                'desde' => $desde->format('d/m/Y H:i'),
                'hasta' => $hasta?->format('d/m/Y H:i'),
                'asignado_por' => $v->asignado_por,
                'retirado_por' => $v->retirado_por,
            ];
        };

        $respuesta = [
            'rol' => ['id' => $rol->id, 'nombre' => $rol->nombre],
            'periodos' => $periodos->map($fila)->values(),
        ];

        // Permisos que el rol tenia en una fecha dada (al final de ese dia).
        if (! empty($data['fecha'])) {
            $finDia = \Carbon\Carbon::parse($data['fecha'].' 23:59:59', $tz)->setTimezone('UTC');
            $respuesta['fecha'] = \Carbon\Carbon::parse($data['fecha'])->format('d/m/Y');
            $respuesta['en_fecha'] = $periodos
                ->filter(fn ($v) => \Carbon\Carbon::parse($v->vigente_desde, 'UTC')->lte($finDia)
                    && (! $v->vigente_hasta || \Carbon\Carbon::parse($v->vigente_hasta, 'UTC')->gt($finDia)))
                ->map($fila)
                ->sortBy('permiso')
                ->values();
        }

        return response()->json($respuesta);
    }
}
