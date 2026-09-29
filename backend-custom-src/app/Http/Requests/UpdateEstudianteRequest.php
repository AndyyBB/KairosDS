<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEstudianteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('estudiante')?->id;

        return [
            'codigo_universitario' => ['sometimes', 'required', 'string', 'max:15', Rule::unique('estudiantes', 'codigo_universitario')->ignore($id)],
            'documento_identidad' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('estudiantes', 'documento_identidad')->ignore($id)],
            'nombre_completo' => ['sometimes', 'required', 'string', 'max:100'],
            'correo_institucional' => ['sometimes', 'required', 'email', 'max:100', Rule::unique('estudiantes', 'correo_institucional')->ignore($id)],
            'carrera_id' => ['sometimes', 'required', 'integer', 'exists:carreras,id'],
            'activo' => ['sometimes', 'boolean'],
        ];
    }
}
