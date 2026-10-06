<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesEstudiante;
use Illuminate\Foundation\Http\FormRequest;

class StoreEstudianteRequest extends FormRequest
{
    use MensajesEstudiante;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo_universitario' => ['bail', 'required', 'string', 'max:15', 'regex:/^[0-9]+$/', 'unique:estudiantes,codigo_universitario'],
            'documento_identidad' => ['bail', 'required', 'string', 'max:20', 'unique:estudiantes,documento_identidad'],
            'nombre_completo' => ['bail', 'required', 'string', 'max:100', 'regex:/^[\pL\s]+$/u'],
            'correo_institucional' => ['bail', 'required', 'string', 'max:100', 'regex:/^[0-9]+@est\.umss\.edu$/i', 'unique:estudiantes,correo_institucional'],
            'carreras' => ['bail', 'required', 'array', 'min:1'],
            'carreras.*' => ['bail', 'required', 'integer', 'distinct', 'exists:carreras,id'],
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
            $codigo = $this->input('codigo_universitario');
            $correo = $this->input('correo_institucional');
            if (! $codigo || ! $correo) {
                return;
            }
            if (strcasecmp($correo, $codigo.'@est.umss.edu') !== 0) {
                $validator->errors()->add('correo_institucional', 'El correo electrónico no es válido.');
            }
        }];
    }
}
