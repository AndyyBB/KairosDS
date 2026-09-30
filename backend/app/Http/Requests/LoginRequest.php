<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'correo_electronico' => ['bail', 'required', 'string', 'email'],
            'password' => ['bail', 'required', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'correo_electronico.required' => 'El campo Correo electrónico es obligatorio.',
            'correo_electronico.string' => 'El correo electrónico no es válido.',
            'correo_electronico.email' => 'El correo electrónico no es válido.',
            'password.required' => 'El campo Contraseña es obligatorio.',
            'password.string' => 'El campo Contraseña es obligatorio.',
        ];
    }
}
