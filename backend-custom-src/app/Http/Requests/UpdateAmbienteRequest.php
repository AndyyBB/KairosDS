<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesAmbiente;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAmbienteRequest extends FormRequest
{
    use MensajesAmbiente;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('ambiente')?->id;

        return [
            'nombre' => ['sometimes', 'bail', 'required', 'string', 'max:50', Rule::unique('ambientes', 'nombre')->ignore($id)],
            'capacidad_maxima' => ['sometimes', 'bail', 'required', 'integer', 'min:1'],
            'ubicacion' => ['sometimes', 'bail', 'required', 'string', 'max:100'],
            'activo' => ['sometimes', 'boolean'],
        ];
    }
}
