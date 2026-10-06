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
            'ambientes.required' => 'El campo Ambiente es obligatorio.',
            'ambientes.array' => 'El campo Ambiente es obligatorio.',
            'ambientes.min' => 'El campo Ambiente es obligatorio.',
            'ambientes.*.required' => 'El campo Ambiente es obligatorio.',
            'ambientes.*.integer' => 'El campo Ambiente es obligatorio.',
            'ambientes.*.exists' => 'El campo Ambiente es obligatorio.',
            'ambientes.*.distinct' => 'No se puede seleccionar dos veces el mismo ambiente.',

            'normas.array' => 'El campo Normas del examen tiene un límite de 500 caracteres.',
            'normas.*.descripcion.string' => 'El campo Normas del examen tiene un límite de 500 caracteres.',
            'normas.*.descripcion.max' => 'El campo Normas del examen tiene un límite de 500 caracteres.',
        ];
    }

    // Si el examen es para hoy, la hora de inicio debe ser posterior a la hora
    // actual (no se permite una hora pasada ni la misma hora actual).
    protected function validarHoraFutura(Validator $validator, $fecha, $hora): void
    {
        if ($validator->errors()->hasAny(['fecha', 'hora_inicio']) || ! $fecha || ! $hora) {
            return;
        }

        $ahora = now('America/La_Paz')->startOfMinute();
        $inicio = Carbon::createFromFormat('Y-m-d H:i', $fecha.' '.substr($hora, 0, 5), 'America/La_Paz');

        if ($inicio->lte($ahora)) {
            $validator->errors()->add('hora_inicio', 'La hora de inicio debe ser posterior a la hora actual.');
        }
    }

    // Criterio 9: si el ambiente ya tiene un examen programado en el mismo
    // horario (los rangos hora_inicio..hora_inicio+duracion se traslapan),
    // se muestra "El ambiente ya está ocupado en ese horario."
    // Con varios ambientes se revisa cada uno y se indica cual esta ocupado.
    protected function validarAmbienteLibre(Validator $validator, $ambienteIds, $fecha, $hora, $duracion, ?int $ignorarId = null): void
    {
        $clave = is_array($ambienteIds) ? 'ambientes' : 'ambiente_id';
        $ids = array_values(array_filter(array_map('intval', (array) $ambienteIds)));

        if ($validator->errors()->hasAny(['ambiente_id', 'ambientes', 'ambientes.*', 'fecha', 'hora_inicio', 'duracion_min'])) {
            return;
        }
        if (! $ids || ! $fecha || ! $hora || ! $duracion) {
            return;
        }

        $inicio = Carbon::createFromFormat('H:i', substr($hora, 0, 5));
        $fin = $inicio->copy()->addMinutes((int) $duracion);

        $choques = Examen::with(['ambiente', 'ambientes'])
            ->whereDate('fecha', $fecha)
            ->where('estado', '!=', 'cancelado')
            ->when($ignorarId, fn ($q) => $q->where('id', '!=', $ignorarId))
            ->where(fn ($q) => $q->whereIn('ambiente_id', $ids)
                ->orWhereHas('ambientes', fn ($a) => $a->whereIn('ambientes.id', $ids)))
            ->get()
            ->filter(function ($otro) use ($inicio, $fin) {
                $otroInicio = Carbon::createFromFormat('H:i', substr($otro->hora_inicio, 0, 5));
                $otroFin = $otroInicio->copy()->addMinutes((int) $otro->duracion_min);

                return $inicio->lt($otroFin) && $fin->gt($otroInicio);
            });

        // Nombres de los ambientes pedidos que ya estan ocupados (sin repetir).
        $nombres = [];
        foreach ($choques as $otro) {
            foreach ($otro->ambientes as $ambiente) {
                if (in_array((int) $ambiente->id, $ids, true)) {
                    $nombres[$ambiente->id] = $ambiente->nombre;
                }
            }
            if (in_array((int) $otro->ambiente_id, $ids, true) && $otro->ambiente) {
                $nombres[$otro->ambiente_id] = $otro->ambiente->nombre;
            }
        }
        $ocupados = collect(array_values($nombres));

        if ($ocupados->count() === 1) {
            $validator->errors()->add($clave, "El ambiente {$ocupados[0]} ya está ocupado en ese horario.");
        } elseif ($ocupados->count() > 1) {
            $validator->errors()->add($clave, 'Los ambientes '.$ocupados->join(', ', ' y ').' ya están ocupados en ese horario.');
        }
    }
}
