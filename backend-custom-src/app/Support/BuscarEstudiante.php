<?php

namespace App\Support;

use App\Models\Estudiante;

// Busqueda de un estudiante por "Código universitario o documento de identidad" (un solo
// campo). El documento se encuentra con o sin la extension del departamento
// ("6890457" o "6890457 CB").
class BuscarEstudiante
{
    public static function por(string $valor): ?Estudiante
    {
        $valor = trim($valor);
        if ($valor === '') {
            return null;
        }

        $base = Estudiante::query()->with(['carreras', 'carrera']);

        $porCodigo = (clone $base)->whereRaw('upper(codigo_universitario) = ?', [strtoupper($valor)])->first();
        if ($porCodigo) {
            return $porCodigo;
        }

        $normalizado = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $valor));
        $columna = "regexp_replace(upper(documento_identidad), '[^A-Z0-9]', '', 'g')";
        $exacto = (clone $base)->whereRaw("$columna = ?", [$normalizado])->first();
        if ($exacto || ! ctype_digit($normalizado)) {
            return $exacto;
        }

        return $base->whereRaw("$columna ~ ?", ['^'.$normalizado.'[A-Z]{1,3}$'])->orderBy('id')->first();
    }

    public static function datos(Estudiante $e): array
    {
        $carreras = $e->carreras->pluck('nombre');
        if ($carreras->isEmpty() && $e->carrera) {
            $carreras = collect([$e->carrera->nombre]);
        }

        return [
            'id' => $e->id,
            'nombre_completo' => $e->nombre_completo,
            'codigo_universitario' => $e->codigo_universitario,
            'documento_identidad' => $e->documento_identidad,
            'carrera' => $carreras->implode(', '),
            'correo_institucional' => $e->correo_institucional,
        ];
    }
}
