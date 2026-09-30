<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHabilitacionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estudiante_id' => ['required', 'integer', 'exists:estudiantes,id'],
            'habilitado' => ['required', 'boolean'],
            'motivo_id' => ['nullable', 'integer', 'exists:motivos_inhabilitacion,id'],
            'observacion' => ['required_if:habilitado,false', 'nullable', 'string', 'max:200'],
        ];
    }

    public function messages(): array
    {
        return [
            'observacion.required_if' => 'El motivo de inhabilitación es obligatorio.',
            'observacion.max' => 'El motivo de inhabilitación tiene un límite de 200 caracteres.',
            'estudiante_id.required' => 'El estudiante es obligatorio.',
            'estudiante_id.exists' => 'El estudiante no existe.',
            'habilitado.required' => 'Debe seleccionar Habilitado o No habilitado.',
            'habilitado.boolean' => 'Debe seleccionar Habilitado o No habilitado.',
        ];
    }
}
