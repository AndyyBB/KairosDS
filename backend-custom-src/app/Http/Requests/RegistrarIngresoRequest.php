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
        ];
    }
}
