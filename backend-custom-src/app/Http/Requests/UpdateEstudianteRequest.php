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
            'codigo_universitario' => ['bail', 'sometimes', 'required', 'string', 'max:15', 'regex:/^[0-9]+$/', Rule::unique('estudiantes', 'codigo_universitario')->ignore($id)],
            'documento_identidad' => ['bail', 'sometimes', 'required', 'string', 'max:20', Rule::unique('estudiantes', 'documento_identidad')->ignore($id)],
            'nombre_completo' => ['bail', 'sometimes', 'required', 'string', 'max:100', 'regex:/^[\pL\s]+$/u'],
            'correo_institucional' => ['bail', 'sometimes', 'required', 'string', 'max:100', 'regex:/^[0-9]+@est\.umss\.edu$/i', Rule::unique('estudiantes', 'correo_institucional')->ignore($id)],
            'carreras' => ['bail', 'sometimes', 'required', 'array', 'min:1'],
            'carreras.*' => ['bail', 'required', 'integer', 'distinct', 'exists:carreras,id'],
            'activo' => ['sometimes', 'boolean'],
        ];
    }

    // Criterio 10: el correo institucional tiene el formato
    // "CódigoUniversitario@est.umss.edu" (la parte antes de @ es el código).
    public function after(): array
    {
        return [function (\Illuminate\Validation\Validator $validator) {
            if ($validator->errors()->hasAny(['codigo_universitario', 'correo_institucional'])) {
                return;
            }
            $actual = $this->route('estudiante');
            $codigo = $this->input('codigo_universitario', $actual?->codigo_universitario);
            $correo = $this->input('correo_institucional', $actual?->correo_institucional);
            if (! $codigo || ! $correo) {
                return;
            }
            if (strcasecmp($correo, $codigo.'@est.umss.edu') !== 0) {
                $validator->errors()->add('correo_institucional', 'El correo electrónico no es válido.');
            }
        }];
    }
}
