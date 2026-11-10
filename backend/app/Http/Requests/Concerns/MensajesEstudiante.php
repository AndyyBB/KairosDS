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
            'codigo_universitario.string' => 'El código universitario solo contiene números.',
            'codigo_universitario.max' => 'El campo Código universitario tiene un límite de 15 caracteres numéricos.',
            'codigo_universitario.regex' => 'El código universitario solo contiene números.',
            'codigo_universitario.unique' => 'El código universitario ya está registrado.',

            'documento_identidad.required' => 'El campo Documento de identidad es obligatorio.',
            'documento_identidad.string' => 'El campo Documento de identidad no es válido.',
            'documento_identidad.max' => 'El campo Documento de identidad tiene un límite de 20 caracteres.',
            'documento_identidad.unique' => 'El documento de identidad ya está registrado.',

            'nombres.required' => 'El campo Nombres es obligatorio.',
            'nombres.string' => 'Los nombres solo contienen letras.',
            'nombres.max' => 'El campo Nombres tiene un límite de 50 caracteres.',
            'nombres.regex' => 'Los nombres solo contienen letras.',
            'apellidos.required' => 'El campo Apellidos es obligatorio.',
            'apellidos.string' => 'Los apellidos solo contienen letras.',
            'apellidos.max' => 'El campo Apellidos tiene un límite de 50 caracteres.',
            'apellidos.regex' => 'Los apellidos solo contienen letras.',

            'correo_institucional.required' => 'El campo Correo institucional es obligatorio.',
            'correo_institucional.string' => 'El correo electrónico no es válido.',
            'correo_institucional.regex' => 'El correo electrónico no es válido.',
            'correo_institucional.max' => 'El correo electrónico no es válido.',
            'correo_institucional.unique' => 'El correo electrónico ya está registrado.',

            // Un estudiante puede pertenecer a mas de una carrera.
            'carreras.required' => 'El campo Carrera es obligatorio.',
            'carreras.array' => 'El campo Carrera es obligatorio.',
            'carreras.min' => 'El campo Carrera es obligatorio.',
            'carreras.*.required' => 'El campo Carrera es obligatorio.',
            'carreras.*.integer' => 'El campo Carrera es obligatorio.',
            'carreras.*.exists' => 'El campo Carrera es obligatorio.',
            'carreras.*.distinct' => 'No se puede seleccionar dos veces la misma carrera.',
        ];
    }
}
