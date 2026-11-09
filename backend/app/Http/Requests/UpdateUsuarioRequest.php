<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesUsuario;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUsuarioRequest extends FormRequest
{
    use MensajesUsuario;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombres' => ['sometimes', 'bail', 'required', 'string', 'max:60', 'regex:/^[\pL\s.]+$/u'],
            'apellidos' => ['sometimes', 'bail', 'required', 'string', 'max:60', 'regex:/^[\pL\s.]+$/u'],
            'rol_id' => ['sometimes', 'bail', 'required', 'integer', 'exists:roles,id'],
            'activo' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
        ];
    }
}
