<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre_completo' => ['required', 'string', 'max:100'],
            'correo_electronico' => ['required', 'email', 'max:100', 'unique:usuarios,correo_electronico'],
            'password' => ['required', 'string', 'min:8'],
            'rol_id' => ['required', 'integer', 'exists:roles,id'],
        ];
    }
}
