<?php

namespace App\Http\Requests;

use App\Http\Controllers\Api\AuthController;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    // HU-16: solo se exige que los dos campos esten completos. No se valida el formato del
    // correo para no dar pistas sobre cual de los datos esta mal.
    public function rules(): array
    {
        return [
            'correo_electronico' => ['required', 'string', 'max:150'],
            'password' => ['required', 'string', 'max:255'],
        ];
    }

    // Un unico mensaje, sin indicar que campo falta o esta mal.
    protected function failedValidation(Validator $validator)
    {
        $vacios = blank($this->input('correo_electronico')) || blank($this->input('password'));

        throw new HttpResponseException(response()->json([
            'message' => $vacios ? 'Ingrese su correo electrónico y contraseña.' : AuthController::MENSAJE_FALLO,
        ], 422));
    }
}
