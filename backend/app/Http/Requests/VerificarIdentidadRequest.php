<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// HU-10: verificacion de identidad (codigo universitario, documento de identidad o QR).
class VerificarIdentidadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $valor = match ($this->input('metodo')) {
            // Limite de 15 caracteres alfanumericos.
            'codigo' => ['bail', 'required', 'string', 'regex:/^[A-Za-z0-9]{1,15}$/'],
            // El documento puede traer un espacio (por ejemplo "6012457 CB").
            'documento' => ['bail', 'required', 'string', 'regex:/^[A-Za-z0-9 ]{1,15}$/'],
            default => ['bail', 'required', 'string', 'regex:/^[A-Za-z0-9]{1,15}$/'],
        };

        return [
            'examen_id' => ['bail', 'required', 'integer', 'exists:examenes,id'],
            'metodo' => ['required', Rule::in(['codigo', 'documento', 'qr'])],
            'valor' => $valor,
        ];
    }

    public function messages(): array
    {
        $esQr = $this->input('metodo') === 'qr';

        return [
            'examen_id.required' => 'Seleccione un examen.',
            'examen_id.integer' => 'Seleccione un examen.',
            'examen_id.exists' => 'Seleccione un examen.',
            'metodo.required' => 'Seleccione un método de verificación.',
            'metodo.in' => 'Seleccione un método de verificación.',
            'valor.required' => $esQr
                ? 'Código QR no válido.'
                : 'Ingrese el código universitario o documento de identidad.',
            'valor.string' => $esQr ? 'Código QR no válido.' : 'Ingrese el código universitario o documento de identidad.',
            'valor.regex' => match ($this->input('metodo')) {
                'qr' => 'Código QR no válido.',
                'documento' => 'El documento de identidad admite como máximo 15 caracteres alfanuméricos.',
                default => 'El código universitario admite como máximo 15 caracteres alfanuméricos.',
            },
        ];
    }
}
