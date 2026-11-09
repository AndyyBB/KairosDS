<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// HU-12: registro de ingreso de un estudiante habilitado.
class RegistrarIngresoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'examen_id' => ['bail', 'required', 'integer', 'exists:examenes,id'],
            'estudiante_id' => ['bail', 'required', 'integer', 'exists:estudiantes,id'],
            'metodo' => ['required', Rule::in(['codigo', 'documento', 'qr'])],
            // Sprint 4: si el estudiante esta rindiendo otro examen, se puede registrar su
            // salida de ese examen con una observacion obligatoria y luego su ingreso.
            'registrar_salida' => ['sometimes', 'boolean'],
            'observacion' => ['bail', 'nullable', 'required_if:registrar_salida,true,1', 'string', 'max:300'],
        ];
    }

    public function messages(): array
    {
        return [
            'examen_id.required' => 'Seleccione un examen.',
            'examen_id.integer' => 'Seleccione un examen.',
            'examen_id.exists' => 'Seleccione un examen.',
            'estudiante_id.required' => 'Estudiante no encontrado.',
            'estudiante_id.integer' => 'Estudiante no encontrado.',
            'estudiante_id.exists' => 'Estudiante no encontrado.',
            'metodo.required' => 'Seleccione un método de verificación.',
            'metodo.in' => 'Seleccione un método de verificación.',
            'observacion.required_if' => 'La observación es obligatoria para registrar la salida del otro examen.',
            'observacion.max' => 'La observación tiene un límite de 300 caracteres.',
        ];
    }
}
