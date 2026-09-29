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
            'motivo_id' => ['required_if:habilitado,false', 'nullable', 'integer', 'exists:motivos_inhabilitacion,id'],
            'observacion' => ['nullable', 'string', 'max:200'],
        ];
    }
}
