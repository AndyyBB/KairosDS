<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesUsuario;
use App\Models\Usuario;
use App\Rules\CorreoPermitido;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreUsuarioRequest extends FormRequest
{
    use MensajesUsuario;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Sprint 4 (observacion 4): Nombres y Apellidos por separado.
            'nombres' => ['bail', 'required', 'string', 'max:60', 'regex:/^[\pL\s.]+$/u'],
            'apellidos' => ['bail', 'required', 'string', 'max:60', 'regex:/^[\pL\s.]+$/u'],
            // El correo se valida como unico despues del nombre (ver after()).
            // Sprint 4: solo dominios de correo conocidos (Gmail, Outlook, ...) o de la UMSS.
            'correo_electronico' => ['bail', 'required', 'string', 'email', 'max:100', new CorreoPermitido],
            'password' => ['bail', 'required', 'string', 'min:8'],
            'rol_id' => ['bail', 'required', 'integer', 'exists:roles,id'],
        ];
    }

    // Sprint 4 (observacion de la licenciada): el nombre identifica al usuario, por eso no
    // se pueden registrar dos usuarios con el mismo nombre (sin importar mayusculas ni
    // espacios). Primero se revisa el nombre y, si esta libre, el correo.
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->hasAny(['nombres', 'apellidos', 'correo_electronico'])) {
                    return;
                }
                $nombre = self::normalizar($this->input('nombres').' '.$this->input('apellidos'));
                $repetido = Usuario::query()->pluck('nombre_completo')
                    ->contains(fn ($n) => self::normalizar((string) $n) === $nombre);
                if ($repetido) {
                    $validator->errors()->add('nombres', 'Este nombre ya está registrado.');

                    return;
                }
                $correo = mb_strtolower(trim((string) $this->input('correo_electronico')));
                if (Usuario::whereRaw('lower(correo_electronico) = ?', [$correo])->exists()) {
                    $validator->errors()->add('correo_electronico', 'Este correo electrónico ya está registrado.');
                }
            },
        ];
    }

    private static function normalizar(string $texto): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $texto)));
    }
}
