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

    // HU-08 (Sprint 4, observacion 13 de la licenciada): al editar un examen solo se pueden
    // cambiar los ambientes (aulas), la duracion y las normas. La asignatura, la fecha y la
    // hora de inicio no se modifican: si llegan en la peticion se ignoran (no estan en estas
    // reglas). Para otra fecha u hora se elimina el examen (si no tiene registros) y se
    // programa uno nuevo.
    public function rules(): array
    {
        return [
            'ambientes' => ['bail', 'sometimes', 'required', 'array', 'min:1'],
            'ambientes.*' => ['bail', 'required', 'integer', 'distinct', 'exists:ambientes,id'],
            'duracion_min' => ['bail', 'sometimes', 'required', 'integer', 'between:5,300'],
            // Las normas generales del examen se pueden reemplazar al editar.
            'normas' => ['sometimes', 'nullable', 'array'],
            'normas.*.tipo' => ['required_with:normas', 'in:general,particular'],
            'normas.*.estudiante_id' => ['nullable', 'integer', 'exists:estudiantes,id'],
            'normas.*.descripcion' => ['required_with:normas', 'string', 'max:500'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $examen = $this->route('examen');
                $this->validarAmbienteLibre(
                    $validator,
                    $this->has('ambientes')
                        ? (array) $this->input('ambientes')
                        : ($examen?->ambientes()->pluck('ambientes.id')->all() ?: $examen?->ambiente_id),
                    // La fecha y la hora son siempre las del examen (no se editan).
                    $examen?->fecha?->toDateString(),
                    $examen?->hora_inicio,
                    $this->input('duracion_min', $examen?->duracion_min),
                    $examen?->id,
                );
            },
        ];
    }
}
