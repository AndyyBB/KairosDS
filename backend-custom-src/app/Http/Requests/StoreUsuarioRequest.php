<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesUsuario;
use Illuminate\Foundation\Http\FormRequest;

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
            'nombre_completo' => ['bail', 'required', 'string', 'max:100'],
            'correo_electronico' => ['bail', 'required', 'string', 'email', 'max:100', 'unique:usuarios,correo_electronico'],
            'password' => ['bail', 'required', 'string', 'min:8'],
            'rol_id' => ['bail', 'required', 'integer', 'exists:roles,id'],
        ];
    }
}
