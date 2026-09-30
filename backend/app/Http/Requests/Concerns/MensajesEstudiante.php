<?php

namespace App\Http\Requests\Concerns;

// Mensajes de validacion de HU-01 (Registro de estudiantes), textuales
// segun los criterios de aceptacion del Sprint Planning.
trait MensajesEstudiante
{
    public function messages(): array
    {
        return [
            'codigo_universitario.required' => 'El campo Código universitario es obligatorio.',
            'codigo_universitario.string' => 'El campo Código universitario tiene un límite de 15 caracteres alfanuméricos.',
            'codigo_universitario.max' => 'El campo Código universitario tiene un límite de 15 caracteres alfanuméricos.',
            'codigo_universitario.regex' => 'El campo Código universitario tiene un límite de 15 caracteres alfanuméricos.',
            'codigo_universitario.unique' => 'El código universitario ya está registrado.',

            'documento_identidad.required' => 'El campo Documento de identidad es obligatorio.',
            'documento_identidad.string' => 'El campo Documento de identidad no es válido.',
            'documento_identidad.max' => 'El campo Documento de identidad tiene un límite de 20 caracteres.',
            'documento_identidad.unique' => 'El documento de identidad ya está registrado.',

            'nombre_completo.required' => 'El campo Nombre completo es obligatorio.',
            'nombre_completo.string' => 'El nombre solo contiene letras.',
            'nombre_completo.max' => 'El campo Nombre completo tiene un límite de 100 caracteres.',
            'nombre_completo.regex' => 'El nombre solo contiene letras.',

            'correo_institucional.required' => 'El campo Correo institucional es obligatorio.',
            'correo_institucional.string' => 'El correo electrónico no es válido.',
            'correo_institucional.regex' => 'El correo electrónico no es válido.',
            'correo_institucional.max' => 'El correo electrónico no es válido.',
            'correo_institucional.unique' => 'El correo electrónico ya está registrado.',

            'carrera_id.required' => 'El campo Carrera es obligatorio.',
            'carrera_id.integer' => 'El campo Carrera es obligatorio.',
            'carrera_id.exists' => 'El campo Carrera es obligatorio.',
        ];
    }
}
