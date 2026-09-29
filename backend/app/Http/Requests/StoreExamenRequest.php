<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'materia_id' => ['required', 'integer', 'exists:materias,id'],
            'ambiente_id' => ['required', 'integer', 'exists:ambientes,id'],
            'fecha' => ['required', 'date'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'duracion_min' => ['required', 'integer', 'min:15', 'max:300'],
            'normas' => ['nullable', 'array'],
            'normas.*.tipo' => ['required_with:normas', 'in:general,particular'],
            'normas.*.estudiante_id' => ['nullable', 'integer', 'exists:estudiantes,id'],
            'normas.*.descripcion' => ['required_with:normas', 'string'],
        ];
    }
}
