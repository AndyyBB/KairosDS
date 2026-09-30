<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesAmbiente;
use Illuminate\Foundation\Http\FormRequest;

class StoreAmbienteRequest extends FormRequest
{
    use MensajesAmbiente;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['bail', 'required', 'string', 'max:50', 'unique:ambientes,nombre'],
            'capacidad_maxima' => ['bail', 'required', 'integer', 'min:1'],
            'ubicacion' => ['bail', 'required', 'string', 'max:100'],
        ];
    }
}
