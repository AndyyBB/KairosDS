<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEstudianteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo_universitario' => ['required', 'string', 'max:15', 'unique:estudiantes,codigo_universitario'],
            'documento_identidad' => ['required', 'string', 'max:20', 'unique:estudiantes,documento_identidad'],
            'nombre_completo' => ['required', 'string', 'max:100'],
            'correo_institucional' => ['required', 'email', 'max:100', 'unique:estudiantes,correo_institucional'],
            'carrera_id' => ['required', 'integer', 'exists:carreras,id'],
        ];
    }
}
