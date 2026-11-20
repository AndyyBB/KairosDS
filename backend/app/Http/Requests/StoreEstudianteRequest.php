<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\MensajesEstudiante;
use App\Models\Estudiante;
use Illuminate\Foundation\Http\FormRequest;

class StoreEstudianteRequest extends FormRequest
{
    use MensajesEstudiante;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo_universitario' => ['bail', 'required', 'string', 'max:15', 'regex:/^[0-9]+$/', 'unique:estudiantes,codigo_universitario'],
            'documento_identidad' => ['bail', 'required', 'string', 'max:20', 'unique:estudiantes,documento_identidad'],
            // Sprint 4 (observacion 1): Nombres y Apellidos son dos campos separados.
            'nombres' => ['bail', 'required', 'string', 'max:50', 'regex:/^[\pL\s]+$/u'],
            'apellidos' => ['bail', 'required', 'string', 'max:50', 'regex:/^[\pL\s]+$/u'],
            'correo_institucional' => ['bail', 'required', 'string', 'max:100', 'regex:/^[0-9]+@est\.umss\.edu$/i', 'unique:estudiantes,correo_institucional'],
            'carreras' => ['bail', 'required', 'array', 'min:1'],
            'carreras.*' => ['bail', 'required', 'integer', 'distinct', 'exists:carreras,id'],
        ];
    }

    // Criterio 10: el correo institucional tiene el formato
    // "CódigoUniversitario@est.umss.edu" (la parte antes de @ es el código).
    public function after(): array
    {
        return [function (\Illuminate\Validation\Validator $validator) {
            $this->validarDuplicados($validator);

            if ($validator->errors()->hasAny(['codigo_universitario', 'correo_institucional'])) {
                return;
            }
            $codigo = $this->input('codigo_universitario');
            $correo = $this->input('correo_institucional');
            if (! $codigo || ! $correo) {
                return;
            }
            if (strcasecmp($correo, $codigo.'@est.umss.edu') !== 0) {
                $validator->errors()->add('correo_institucional', 'El correo electrónico no es válido.');
            }
        }];
    }

    // Sprint 4 (observacion de la licenciada): dos estudiantes pueden tener el mismo nombre
    // de pila, pero no los mismos nombres Y apellidos, ni el mismo documento de identidad.
    // Se compara sin importar mayusculas ni espacios; en el documento se compara el numero
    // sin la extension (por ejemplo "7902727" y "7902727 CB" son el mismo documento).
    private function validarDuplicados(\Illuminate\Validation\Validator $validator): void
    {
        $errores = $validator->errors();

        if (! $errores->hasAny(['nombres', 'apellidos'])) {
            $nombre = self::normalizar($this->input('nombres').' '.$this->input('apellidos'));
            $repetido = Estudiante::query()->pluck('nombre_completo')
                ->contains(fn ($n) => self::normalizar((string) $n) === $nombre);
            if ($repetido) {
                $errores->add('nombres', 'Ya existe un estudiante registrado con estos nombres y apellidos.');
            }
        }

        if (! $errores->has('documento_identidad')) {
            $numero = self::numeroDocumento((string) $this->input('documento_identidad'));
            if ($numero !== '') {
                $repetido = Estudiante::query()->pluck('documento_identidad')
                    ->contains(fn ($d) => self::numeroDocumento((string) $d) === $numero);
                if ($repetido) {
                    $errores->add('documento_identidad', 'El documento de identidad ya está registrado.');
                }
            }
        }
    }

    private static function normalizar(string $texto): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $texto)));
    }

    // Numero del documento sin la extension del departamento (CB, LP, SC, ...).
    private static function numeroDocumento(string $documento): string
    {
        return preg_replace('/[^0-9]/', '', $documento);
    }
}
