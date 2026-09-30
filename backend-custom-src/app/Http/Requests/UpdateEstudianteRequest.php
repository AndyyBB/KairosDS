<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesEstudiante;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEstudianteRequest extends FormRequest
{
    use MensajesEstudiante;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('estudiante')?->id;

        return [
            'codigo_universitario' => ['bail', 'sometimes', 'required', 'string', 'max:15', 'regex:/^[A-Za-z0-9]+$/', Rule::unique('estudiantes', 'codigo_universitario')->ignore($id)],
            'documento_identidad' => ['bail', 'sometimes', 'required', 'string', 'max:20', Rule::unique('estudiantes', 'documento_identidad')->ignore($id)],
            'nombre_completo' => ['bail', 'sometimes', 'required', 'string', 'max:100', 'regex:/^[\pL\s]+$/u'],
            'correo_institucional' => ['bail', 'sometimes', 'required', 'string', 'max:100', 'regex:/^[A-Za-z0-9]+@est\.umss\.edu$/i', Rule::unique('estudiantes', 'correo_institucional')->ignore($id)],
            'carrera_id' => ['bail', 'sometimes', 'required', 'integer', 'exists:carreras,id'],
            'activo' => ['sometimes', 'boolean'],
        ];
    }
}
