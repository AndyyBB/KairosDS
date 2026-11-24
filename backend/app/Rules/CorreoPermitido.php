<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

// Sprint 4: al registrar un usuario solo se aceptan correos de proveedores conocidos
// (Gmail, Outlook/Hotmail, Yahoo, iCloud, Proton) o institucionales de la UMSS. Asi no se
// pueden registrar cuentas con dominios inventados (por ejemplo "@miuniversidad1234.com"),
// a los que nunca llegaria el correo de aviso.
class CorreoPermitido implements ValidationRule
{
    public const DOMINIOS = [
        'gmail.com', 'googlemail.com',
        'outlook.com', 'outlook.es', 'hotmail.com', 'hotmail.es', 'live.com', 'msn.com',
        'yahoo.com', 'yahoo.es', 'ymail.com',
        'icloud.com', 'me.com',
        'proton.me', 'protonmail.com',
        // Institucionales de la UMSS (docentes y estudiantes). Solo estos dominios exactos:
        // no se aceptan subdominios inventados como "202est.umss.edu".
        'umss.edu', 'est.umss.edu', 'umss.edu.bo',
    ];

    // Sprint 4 (bug HU-39 reportado por Maria): formato de correo estricto, el mismo que usa el
    // frontend. Usuario: letras sin tilde, numeros y . _ % + - (sin puntos al inicio, al final ni
    // seguidos); dominio: partes con letras, numeros o guiones y terminacion de 2 o mas letras.
    // Rechaza, por ejemplo, "maria@gmail", "maria@gmail.c", "maria@gmail.123" y "maría@gmail.com".
    public const FORMATO = '/^[A-Za-z0-9_%+-]+(\.[A-Za-z0-9_%+-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/';

    public const MENSAJE = 'Solo se aceptan correos de Gmail, Outlook, Hotmail, Yahoo, iCloud, Proton o institucionales de la UMSS.';

    public static function permitido(string $correo): bool
    {
        $dominio = mb_strtolower(trim((string) substr(strrchr($correo, '@') ?: '', 1)));
        if ($dominio === '') {
            return false;
        }
        return in_array($dominio, self::DOMINIOS, true);
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! self::permitido((string) $value)) {
            $fail(self::MENSAJE);
        }
    }
}
