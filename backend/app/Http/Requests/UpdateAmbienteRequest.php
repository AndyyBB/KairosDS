<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesAmbiente;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAmbienteRequest extends FormRequest
{
    use MensajesAmbiente;

    public function authorize(): bool
    {
        return true;
    }

    // HU-30 (Sprint 4, observacion 15 de la licenciada): de un ambiente solo se puede editar
    // la capacidad maxima. El nombre es su identificador y, junto con la ubicacion, queda
    // fijo: si llegan en la peticion se ignoran (no estan en estas reglas).
    public function rules(): array
    {
        return [
            'capacidad_maxima' => ['bail', 'required', 'integer', 'min:1', 'max:1000'],
        ];
    }
}
