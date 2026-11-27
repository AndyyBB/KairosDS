<?php

namespace App\Support;

// Presentacion final: reglas comunes de la CENTRAL DE RIESGOS (control de ingreso, reporte
// "Central de riesgos" e importacion de estudiantes).
class Riesgo
{
    // Motivos con los que un intento queda en la central de riesgos.
    public const INGRESO_REPETIDO = 'Ingreso ya registrado';

    public const EXPULSADO = 'Estudiante expulsado';

    public const DUPLICADO_IMPORTACION = 'Registro duplicado en la importación';

    public const SITUACION_EXCEPCIONAL = 'Situación excepcional registrada';

    // Registros automaticos: al registrar una expulsion (HU-24) o una situacion excepcional
    // (HU-25) tambien quedan en la central de riesgos del examen, con su incidencia.
    public const EXPULSION_REGISTRADA = 'Expulsión del examen';

    public const SITUACION_REGISTRADA = 'Situación excepcional';

    // Motivos de riesgo ALTO: la persona no esta registrada, el QR no es valido, el estudiante
    // fue expulsado del examen o su identidad aparece duplicada. El resto es riesgo MEDIO.
    private const ALTO = [
        'No registrado en el sistema',
        'Código QR no válido',
        'no encontrado',
        self::EXPULSADO,
        self::DUPLICADO_IMPORTACION,
        self::EXPULSION_REGISTRADA,
    ];

    public static function nivel(?string $motivo): string
    {
        return in_array($motivo, self::ALTO, true) ? 'Alto' : 'Medio';
    }

    // Descripcion de una incidencia sin el texto "(Intento: ...)" que se agregaba antes.
    public static function limpiarDescripcion(?string $texto): ?string
    {
        return $texto === null ? null : trim(preg_replace('/\s*\(Intento: [^()]*\)\s*$/u', '', $texto));
    }

    // Tipo de incidencia sugerido para cada motivo (codigo de tipos_incidencia).
    public static function tipoSugerido(?string $motivo, bool $registrado): string
    {
        return match ($motivo) {
            self::INGRESO_REPETIDO => 'INGRESO_REPETIDO',
            self::EXPULSADO => 'EXPULSADO',
            self::DUPLICADO_IMPORTACION => 'DUPLICADO',
            'No habilitado' => 'NO_HABILITADO',
            self::SITUACION_EXCEPCIONAL, self::SITUACION_REGISTRADA => 'OTRA',
            self::EXPULSION_REGISTRADA => 'EXPULSION',
            default => $registrado ? 'INTENTO_INDEBIDO' : 'SUPLANTACION',
        };
    }
}
