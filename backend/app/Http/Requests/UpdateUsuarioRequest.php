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

    // HU-32 (Sprint 4, observacion 17 de la licenciada): al editar un usuario solo se cambian
    // el rol, el estado (activo / inactivo) y la contrasena. Los nombres, los apellidos y el
    // correo (con el que inicia sesion) quedan fijos: si llegan en la peticion se ignoran.
    public function rules(): array
    {
        return [
            'rol_id' => ['sometimes', 'bail', 'required', 'integer', 'exists:roles,id'],
            'activo' => ['sometimes', 'boolean'],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
        ];
    }
}
