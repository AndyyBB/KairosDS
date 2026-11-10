<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesEstudiante;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// HU-06: Edicion de estudiantes (Sprint 4, observacion 11 de la licenciada).
// Solo se aceptan el correo institucional y las carreras. El codigo universitario es el
// identificador del estudiante y, junto con el documento de identidad y el nombre, no se
// modifica: si llegan en la peticion se ignoran (no estan en estas reglas).
class UpdateEstudianteRequest extends FormRequest
{
    use MensajesEstudiante {
        messages as mensajesBase;
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('estudiante')?->id;

        return [
            'correo_institucional' => ['bail', 'sometimes', 'required', 'string', 'max:100', 'email', Rule::unique('estudiantes', 'correo_institucional')->ignore($id)],
            'carreras' => ['bail', 'sometimes', 'required', 'array', 'min:1'],
            'carreras.*' => ['bail', 'required', 'integer', 'distinct', 'exists:carreras,id'],
        ];
    }

    public function messages(): array
    {
        return [
            ...$this->mensajesBase(),
            'correo_institucional.email' => 'El correo electrónico no es válido.',
        ];
    }
}
