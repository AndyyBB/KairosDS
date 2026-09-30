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
            'codigo_universitario' => ['bail', 'required', 'string', 'max:15', 'regex:/^[A-Za-z0-9]+$/', 'unique:estudiantes,codigo_universitario'],
            'documento_identidad' => ['bail', 'required', 'string', 'max:20', 'unique:estudiantes,documento_identidad'],
            'nombre_completo' => ['bail', 'required', 'string', 'max:100', 'regex:/^[\pL\s]+$/u'],
            'correo_institucional' => ['bail', 'required', 'string', 'max:100', 'regex:/^[A-Za-z0-9]+@est\.umss\.edu$/i', 'unique:estudiantes,correo_institucional'],
            'carrera_id' => ['bail', 'required', 'integer', 'exists:carreras,id'],
        ];
    }
}
