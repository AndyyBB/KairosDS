<?php

namespace App\Support;

use App\Models\Ambiente;
use App\Models\Carrera;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\Habilitacion;
use App\Models\HistorialOperacion;
use App\Models\Incidencia;
use App\Models\Ingreso;
use App\Models\IntentoIngreso;
use App\Models\Materia;
use App\Models\MotivoInhabilitacion;
use App\Models\Role;
use App\Models\Usuario;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

// HU-27: Historial de operaciones del sistema. Cada operacion guarda el usuario (con su
// nombre y rol en ese momento), el modulo, la accion, un detalle legible y la fecha y hora
// del servidor. Si no se puede guardar el registro, la operacion principal no se afecta.
class Historial
{
    public const TZ = 'America/La_Paz';

    // Campos que no se muestran como "cambios" (control interno).
    private const IGNORADOS = ['updated_at', 'created_at', 'ultimo_acceso', 'intentos_fallidos', 'bloqueado_hasta', 'remember_token', 'registrado_por'];

    public static function registrar(
        string $accion,
        string $modulo,
        string $detalle,
        ?Model $entidad = null,
        ?array $antes = null,
        ?array $despues = null,
        ?Usuario $usuario = null
    ): void {
        $usuario = $usuario ?? request()?->user();
        if (! $usuario instanceof Usuario) {
            return;
        }

        try {
            // Transaccion anidada (savepoint): si falla, no se aborta la operacion principal.
            DB::transaction(function () use ($usuario, $accion, $modulo, $detalle, $entidad, $antes, $despues) {
                HistorialOperacion::create([
                    'usuario_id' => $usuario->id,
                    'usuario_nombre' => $usuario->nombre_completo,
                    'usuario_rol' => $usuario->rol?->nombre,
                    'accion' => mb_substr($accion, 0, 50),
                    'entidad' => $entidad ? mb_substr(class_basename($entidad), 0, 50) : mb_substr($modulo, 0, 50),
                    'entidad_id' => $entidad?->getKey(),
                    'modulo' => mb_substr($modulo, 0, 50),
                    'detalle' => $detalle,
                    'datos_anteriores' => $antes,
                    'datos_nuevos' => $despues,
                    'direccion_ip' => request()?->ip(),
                    'fecha_hora' => now(),
                ]);
            });
        } catch (\Throwable $e) {
            report($e);
        }
    }

    // ---------------- Registro automatico de los modelos (observador) ----------------

    public static function modelo(Model $m, string $evento): void
    {
        $config = self::config($m);
        if (! $config) {
            return;
        }
        [$modulo, $descripcion, $campos] = $config;

        if ($evento === 'updated') {
            $cambios = [];
            $antes = [];
            $despues = [];
            foreach ($m->getChanges() as $campo => $nuevo) {
                if (in_array($campo, self::IGNORADOS, true) || ! array_key_exists($campo, $campos)) {
                    continue;
                }
                $anterior = $m->getOriginal($campo);
                $antes[$campo] = $campo === 'contrasena_hash' ? '***' : $anterior;
                $despues[$campo] = $campo === 'contrasena_hash' ? '***' : $nuevo;
                $cambios[] = $campo === 'contrasena_hash'
                    ? 'Contraseña cambiada'
                    : $campos[$campo].': '.self::valor($campo, $anterior).' → '.self::valor($campo, $nuevo);
            }
            if (! $cambios) {
                return;
            }
            self::registrar('Editar', $modulo, $descripcion.' — '.implode('; ', $cambios), $m, $antes, $despues);

            return;
        }

        [$accion, $sufijo] = match (true) {
            $m instanceof IntentoIngreso => ['Intento de ingreso', ''],
            $m instanceof Expulsion => ['Registrar', ''],
            $m instanceof Incidencia => ['Registrar', ''],
            $evento === 'created' => ['Registrar', ' registrado'],
            default => ['Eliminar', ' eliminado'],
        };
        if ($m instanceof Habilitacion || $m instanceof Ingreso) {
            $sufijo = $evento === 'created' ? '' : ' (eliminado)';
        }
        $datos = collect($m->getAttributes())->except(['contrasena_hash', 'created_at', 'updated_at'])->all();
        self::registrar(
            $accion,
            $modulo,
            $descripcion.$sufijo,
            $m,
            $evento === 'deleted' ? $datos : null,
            $evento === 'created' ? $datos : null
        );
    }

    // [modulo, descripcion, etiquetas de los campos que se muestran en las ediciones]
    private static function config(Model $m): ?array
    {
        return match (true) {
            $m instanceof Estudiante => ['Estudiantes', "Estudiante {$m->codigo_universitario} ({$m->nombre_completo})", [
                'codigo_universitario' => 'Código', 'documento_identidad' => 'Documento', 'nombre_completo' => 'Nombre',
                'correo_institucional' => 'Correo', 'carrera_id' => 'Carrera', 'activo' => 'Activo',
            ]],
            $m instanceof Ambiente => ['Ambientes', "Ambiente {$m->nombre}", [
                'nombre' => 'Nombre', 'capacidad_maxima' => 'Capacidad', 'ubicacion' => 'Ubicación', 'activo' => 'Activo',
            ]],
            $m instanceof Examen => ['Exámenes', 'Examen '.self::examen($m), [
                'materia_id' => 'Asignatura', 'fecha' => 'Fecha', 'hora_inicio' => 'Hora de inicio',
                'duracion_min' => 'Duración (min)', 'ambiente_id' => 'Ambiente', 'estado' => 'Estado',
            ]],
            $m instanceof Usuario => ['Usuarios', "Usuario {$m->nombre_completo}", [
                'nombre_completo' => 'Nombre', 'correo_electronico' => 'Correo', 'rol_id' => 'Rol',
                'activo' => 'Activo', 'contrasena_hash' => 'Contraseña',
            ]],
            $m instanceof Habilitacion => ['Habilitaciones', 'Habilitación de '.self::estudiante($m->estudiante_id)
                .' en '.self::examen(Examen::find($m->examen_id)).': '.($m->habilitado ? 'Habilitado' : 'No habilitado'), [
                'habilitado' => 'Habilitado', 'motivo_id' => 'Motivo', 'observacion' => 'Observación',
            ]],
            $m instanceof Ingreso => ['Control de ingreso', 'Ingreso de '.self::estudiante($m->habilitacion?->estudiante_id)
                .' en '.self::examen($m->habilitacion?->examen), [
                'ambiente_id' => 'Ambiente',
            ]],
            $m instanceof IntentoIngreso => ['Control de ingreso', 'Intento de '.($m->codigo_ingresado ?: self::estudiante($m->estudiante_id))
                .' en '.self::examen(Examen::find($m->examen_id)).': '.$m->motivo_rechazo, []],
            $m instanceof Expulsion => ['Incidencias', 'Expulsión de '.self::estudiante($m->ingreso?->habilitacion?->estudiante_id)
                .' en '.self::examen($m->ingreso?->habilitacion?->examen).': '.$m->motivo, []],
            $m instanceof Incidencia => ['Incidencias', 'Situación excepcional ('.($m->tipoIncidencia?->descripcion ?? 'sin tipo').')'
                .($m->estudiante_id ? ' de '.self::estudiante($m->estudiante_id) : '')
                .' en '.self::examen($m->examen), []],
            default => null,
        };
    }

    private static function estudiante($id): string
    {
        return $id ? (Estudiante::whereKey($id)->value('codigo_universitario') ?? "#$id") : 'estudiante';
    }

    public static function examen(?Examen $e): string
    {
        if (! $e) {
            return 'examen';
        }
        $fecha = $e->fecha ? Carbon::parse($e->fecha)->format('d/m/Y') : '';

        return trim(($e->materia?->nombre ?? 'Examen').' del '.$fecha.' '.substr((string) $e->hora_inicio, 0, 5));
    }

    private static function valor(string $campo, $v): string
    {
        if ($v === null || $v === '') {
            return '—';
        }
        if (is_bool($v) || in_array($campo, ['activo', 'habilitado'], true)) {
            return filter_var($v, FILTER_VALIDATE_BOOLEAN) ? 'Sí' : 'No';
        }

        return match ($campo) {
            'rol_id' => (string) (Role::whereKey($v)->value('nombre') ?? $v),
            'materia_id' => (string) (Materia::whereKey($v)->value('nombre') ?? $v),
            'ambiente_id' => (string) (Ambiente::whereKey($v)->value('nombre') ?? $v),
            'carrera_id' => (string) (Carrera::whereKey($v)->value('nombre') ?? $v),
            'motivo_id' => (string) (MotivoInhabilitacion::whereKey($v)->value('descripcion') ?? $v),
            'fecha' => Carbon::parse($v)->format('d/m/Y'),
            'hora_inicio' => substr((string) $v, 0, 5),
            default => (string) $v,
        };
    }

    // Fecha y hora del servidor (La Paz) para los mensajes de exito.
    public static function horaActual(): string
    {
        return Carbon::now(self::TZ)->format('H:i:s');
    }
}
