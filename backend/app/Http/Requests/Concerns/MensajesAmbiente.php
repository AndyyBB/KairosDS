<?php

namespace App\Http\Requests\Concerns;

// Mensajes de validacion de HU-03 (textos de los criterios de aceptacion).
trait MensajesAmbiente
{
    public function messages(): array
    {
        return [
            'nombre.required' => 'El campo Nombre del ambiente es obligatorio.',
            'nombre.string' => 'El campo Nombre del ambiente es obligatorio.',
            'nombre.max' => 'El campo Nombre del ambiente tiene un límite de 50 caracteres.',
            'nombre.unique' => 'Este ambiente ya está registrado.',
            'capacidad_maxima.required' => 'El campo Capacidad máxima es obligatorio.',
            'capacidad_maxima.integer' => 'La capacidad es un número mayor a 0.',
            'capacidad_maxima.min' => 'La capacidad es un número mayor a 0.',
            'ubicacion.required' => 'El campo Ubicación es obligatorio.',
            'ubicacion.string' => 'El campo Ubicación es obligatorio.',
            'ubicacion.max' => 'El campo Ubicación tiene un límite de 100 caracteres.',
        ];
    }
}
