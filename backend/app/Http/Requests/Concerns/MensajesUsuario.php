<?php

namespace App\Http\Requests\Concerns;

// Mensajes de validacion de HU-15 (textos de los criterios de aceptacion).
trait MensajesUsuario
{
    public function messages(): array
    {
        return [
            'nombre_completo.required' => 'El campo Nombre completo es obligatorio.',
            'nombre_completo.string' => 'El campo Nombre completo es obligatorio.',
            'nombre_completo.max' => 'El campo Nombre completo tiene un límite de 100 caracteres.',
            'correo_electronico.required' => 'El campo Correo electrónico es obligatorio.',
            'correo_electronico.string' => 'El correo electrónico no es válido.',
            'correo_electronico.email' => 'El correo electrónico no es válido.',
            'correo_electronico.regex' => 'El correo electrónico no es válido.',
            'correo_electronico.max' => 'El campo Correo electrónico tiene un límite de 100 caracteres.',
            'correo_electronico.unique' => 'Este correo electrónico ya está registrado.',
            'password.required' => 'El campo Contraseña es obligatorio.',
            'password.string' => 'El campo Contraseña es obligatorio.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'rol_id.required' => 'El campo Rol es obligatorio.',
            'rol_id.integer' => 'El campo Rol es obligatorio.',
            'rol_id.exists' => 'El campo Rol es obligatorio.',
        ];
    }
}
