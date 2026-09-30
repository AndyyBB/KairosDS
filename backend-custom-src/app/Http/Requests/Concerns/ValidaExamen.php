<?php

namespace App\Http\Requests\Concerns;

use App\Models\Examen;
use Carbon\Carbon;
use Illuminate\Validation\Validator;

// Mensajes y reglas comunes de HU-02 (Registro de examenes), textuales
// segun los criterios de aceptacion del Sprint Planning.
trait ValidaExamen
{
    public function messages(): array
    {
        return [
            'materia_id.required' => 'El campo Asignatura es obligatorio.',
            'materia_id.integer' => 'El campo Asignatura es obligatorio.',
            'materia_id.exists' => 'El campo Asignatura es obligatorio.',

            'fecha.required' => 'El campo Fecha es obligatorio.',
            'fecha.date_format' => 'El campo Fecha tiene el formato día/mes/año.',
            'fecha.after_or_equal' => 'La fecha del examen no puede ser anterior a la fecha actual.',

            'hora_inicio.required' => 'El campo Hora de inicio es obligatorio.',
            'hora_inicio.date_format' => 'El campo Hora de inicio tiene el formato hora:minuto.',

            'duracion_min.required' => 'El campo Duración es obligatorio.',
            'duracion_min.integer' => 'La duración está entre 5 y 300 minutos.',
            'duracion_min.between' => 'La duración está entre 5 y 300 minutos.',

            'ambiente_id.required' => 'El campo Ambiente es obligatorio.',
            'ambiente_id.integer' => 'El campo Ambiente es obligatorio.',
            'ambiente_id.exists' => 'El campo Ambiente es obligatorio.',

            'normas.array' => 'El campo Normas del examen tiene un límite de 500 caracteres.',
            'normas.*.descripcion.string' => 'El campo Normas del examen tiene un límite de 500 caracteres.',
            'normas.*.descripcion.max' => 'El campo Normas del examen tiene un límite de 500 caracteres.',
        ];
    }

    // Criterio 9: si el ambiente ya tiene un examen programado en el mismo
    // horario (los rangos hora_inicio..hora_inicio+duracion se traslapan),
    // se muestra "El ambiente ya está ocupado en ese horario."
    protected function validarAmbienteLibre(Validator $validator, $ambienteId, $fecha, $hora, $duracion, ?int $ignorarId = null): void
    {
        if ($validator->errors()->hasAny(['ambiente_id', 'fecha', 'hora_inicio', 'duracion_min'])) {
            return;
        }
        if (! $ambienteId || ! $fecha || ! $hora || ! $duracion) {
            return;
        }

        $inicio = Carbon::createFromFormat('H:i', substr($hora, 0, 5));
        $fin = $inicio->copy()->addMinutes((int) $duracion);

        $conflicto = Examen::where('ambiente_id', $ambienteId)
            ->whereDate('fecha', $fecha)
            ->where('estado', '!=', 'cancelado')
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->get()
            ->contains(function ($otro) use ($inicio, $fin) {
                $otroInicio = Carbon::createFromFormat('H:i', substr($otro->hora_inicio, 0, 5));
                $otroFin = $otroInicio->copy()->addMinutes((int) $otro->duracion_min);

                return $inicio->lt($otroFin) && $fin->gt($otroInicio);
            });

        if ($conflicto) {
            $validator->errors()->add('ambiente_id', 'El ambiente ya está ocupado en ese horario.');
        }
    }
}
