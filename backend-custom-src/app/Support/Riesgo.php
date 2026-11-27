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

    // Motivos de riesgo ALTO: la persona no esta registrada, el QR no es valido, el estudiante
    // fue expulsado del examen o su identidad aparece duplicada. El resto es riesgo MEDIO.
    private const ALTO = [
        'No registrado en el sistema',
        'Código QR no válido',
        'no encontrado',
        self::EXPULSADO,
        self::DUPLICADO_IMPORTACION,
    ];

    public static function nivel(?string $motivo): string
    {
        return in_array($motivo, self::ALTO, true) ? 'Alto' : 'Medio';
    }

    // Tipo de incidencia sugerido para cada motivo (codigo de tipos_incidencia).
    public static function tipoSugerido(?string $motivo, bool $registrado): string
    {
        return match ($motivo) {
            self::INGRESO_REPETIDO => 'INGRESO_REPETIDO',
            self::EXPULSADO => 'EXPULSADO',
            self::DUPLICADO_IMPORTACION => 'DUPLICADO',
            'No habilitado' => 'NO_HABILITADO',
            self::SITUACION_EXCEPCIONAL => 'OTRA',
            default => $registrado ? 'INTENTO_INDEBIDO' : 'SUPLANTACION',
        };
    }
}
