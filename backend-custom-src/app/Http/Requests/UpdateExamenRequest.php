<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidaExamen;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateExamenRequest extends FormRequest
{
    use ValidaExamen;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'materia_id' => ['bail', 'sometimes', 'required', 'integer', 'exists:materias,id'],
            'ambiente_id' => ['bail', 'sometimes', 'required', 'integer', 'exists:ambientes,id'],
            'fecha' => ['bail', 'sometimes', 'required', 'date_format:Y-m-d'],
            'hora_inicio' => ['bail', 'sometimes', 'required', 'date_format:H:i'],
            'duracion_min' => ['bail', 'sometimes', 'required', 'integer', 'between:5,300'],
            'estado' => ['sometimes', 'required', 'in:programado,en curso,finalizado,cancelado'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $examen = $this->route('examen');
                $this->validarAmbienteLibre(
                    $validator,
                    $this->input('ambiente_id', $examen?->ambiente_id),
                    $this->input('fecha', $examen?->fecha?->toDateString()),
                    $this->input('hora_inicio', $examen?->hora_inicio),
                    $this->input('duracion_min', $examen?->duracion_min),
                    $examen?->id,
                );
            },
        ];
    }
}
