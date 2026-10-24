<?php

namespace App\Support;

use App\Models\Examen;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

// Formatos comunes de las consultas, incidencias y reportes del Sprint 3 (hora de La Paz).
class Formato
{
    public const TZ = 'America/La_Paz';

    public static function hora($fechaHora): ?string
    {
        return $fechaHora ? Carbon::parse($fechaHora)->setTimezone(self::TZ)->format('H:i:s') : null;
    }

    public static function fecha($fechaHora): ?string
    {
        return $fechaHora ? Carbon::parse($fechaHora)->setTimezone(self::TZ)->format('d/m/Y') : null;
    }

    public static function ambientes(Examen $examen): string
    {
        $nombres = $examen->ambientes->pluck('nombre');
        if ($nombres->isEmpty() && $examen->ambiente) {
            $nombres = collect([$examen->ambiente->nombre]);
        }

        return $nombres->implode(', ');
    }

    public static function examen(Examen $examen): array
    {
        $examen->loadMissing(['materia', 'ambiente', 'ambientes']);

        return [
            'id' => $examen->id,
            'asignatura' => $examen->materia?->nombre,
            'fecha' => $examen->fecha?->format('d/m/Y'),
            'hora' => substr((string) $examen->hora_inicio, 0, 5),
            'duracion' => (int) $examen->duracion_min,
            'ambientes' => self::ambientes($examen),
            'estado' => $examen->estado_actual,
        ];
    }

    // Quien genero el reporte o hizo la consulta, con la fecha y hora del servidor.
    public static function generado($usuario): array
    {
        $ahora = Carbon::now(self::TZ);

        return ['fecha' => $ahora->format('d/m/Y'), 'hora' => $ahora->format('H:i'), 'usuario' => $usuario?->nombre_completo];
    }

    // Limites (en la zona horaria de la aplicacion) de un rango de dias de La Paz.
    public static function rangoDias(?string $desde, ?string $hasta): array
    {
        $ini = $desde ? Carbon::parse($desde, self::TZ)->startOfDay()->setTimezone(config('app.timezone')) : null;
        $fin = $hasta ? Carbon::parse($hasta, self::TZ)->endOfDay()->setTimezone(config('app.timezone')) : null;

        return [$ini, $fin];
    }

    // Examenes que todavia no finalizaron o que son de hoy (consultas e incidencias).
    public static function examenesActivos(): Builder
    {
        $ahora = Carbon::now(self::TZ);

        return Examen::query()
            ->with(['materia', 'ambiente', 'ambientes'])
            ->where('estado', '!=', 'cancelado')
            ->where(fn ($q) => $q
                ->whereDate('fecha', $ahora->toDateString())
                ->orWhereRaw('(fecha + hora_inicio + make_interval(mins => COALESCE(duracion_min, 0))) > ?::timestamp', [$ahora->format('Y-m-d H:i:s')]))
            ->orderBy('fecha')
            ->orderBy('hora_inicio');
    }
}
