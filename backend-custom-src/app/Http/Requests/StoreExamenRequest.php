<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidaExamen;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreExamenRequest extends FormRequest
{
    use ValidaExamen;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $hoy = now('America/La_Paz')->toDateString();

        return [
            'materia_id' => ['bail', 'required', 'integer', 'exists:materias,id'],
            'ambiente_id' => ['bail', 'required', 'integer', 'exists:ambientes,id'],
            'fecha' => ['bail', 'required', 'date_format:Y-m-d', 'after_or_equal:'.$hoy],
            'hora_inicio' => ['bail', 'required', 'date_format:H:i'],
            'duracion_min' => ['bail', 'required', 'integer', 'between:5,300'],
            'normas' => ['nullable', 'array'],
            'normas.*.tipo' => ['required_with:normas', 'in:general,particular'],
            'normas.*.estudiante_id' => ['nullable', 'integer', 'exists:estudiantes,id'],
            'normas.*.descripcion' => ['required_with:normas', 'string', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [
            fn (Validator $validator) => $this->validarAmbienteLibre(
                $validator,
                $this->input('ambiente_id'),
                $this->input('fecha'),
                $this->input('hora_inicio'),
                $this->input('duracion_min'),
            ),
        ];
    }
}
