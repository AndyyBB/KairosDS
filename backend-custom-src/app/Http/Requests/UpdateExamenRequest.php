<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExamenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'materia_id' => ['sometimes', 'required', 'integer', 'exists:materias,id'],
            'ambiente_id' => ['sometimes', 'required', 'integer', 'exists:ambientes,id'],
            'fecha' => ['sometimes', 'required', 'date'],
            'hora_inicio' => ['sometimes', 'required', 'date_format:H:i'],
            'duracion_min' => ['sometimes', 'required', 'integer', 'min:15', 'max:300'],
            'estado' => ['sometimes', 'required', 'in:programado,en curso,finalizado,cancelado'],
        ];
    }
}
