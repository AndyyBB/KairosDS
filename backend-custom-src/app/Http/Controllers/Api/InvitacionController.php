<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\InvitacionExamenMail;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\InscripcionExamen;
use App\Models\InvitacionExamen;
use App\Support\Historial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

// HU-41: Invitacion por correo para inscribirse en un examen.
// - El administrador o el docente elige un examen programado, marca a los estudiantes y
//   presiona "Enviar invitaciones": a cada uno le llega un correo con el boton
//   "Aceptar invitación".
// - Al aceptar (pantalla publica, sin iniciar sesion), el estudiante queda INSCRITO en el
//   examen. Despues el docente lo marca como Habilitado o No habilitado (HU-04).
class InvitacionController extends Controller
{
    private const TZ = 'America/La_Paz';

    // Maximo de invitaciones por envio (cada correo tarda; asi la pantalla no se queda esperando).
    private const MAXIMO = 200;

    // Estudiantes activos con el estado de su invitacion en el examen.
    // mostrar: no_inscritos (por defecto) | pendientes (invitados que aun no aceptaron) | todos
    public function index(Request $request, Examen $examen)
    {
        $inscritos = InscripcionExamen::where('examen_id', $examen->id)->pluck('estudiante_id');
        $pendientes = InvitacionExamen::where('examen_id', $examen->id)->whereNull('aceptada_en')->pluck('estudiante_id');

        $consulta = $this->estudiantesFiltrados($request)->with(['carrera', 'carreras']);
        $mostrar = $request->query('mostrar', 'no_inscritos');
        if ($mostrar === 'no_inscritos') {
            $consulta->whereNotIn('id', $inscritos);
        } elseif ($mostrar === 'pendientes') {
            $consulta->whereIn('id', $pendientes)->whereNotIn('id', $inscritos);
        }

        $pagina = $consulta->orderBy('nombre_completo')
            ->paginate(min((int) $request->query('per_page', 10), 100));

        $ids = $pagina->pluck('id');
        $invitaciones = InvitacionExamen::where('examen_id', $examen->id)
            ->whereIn('estudiante_id', $ids)
            ->get()
            ->keyBy('estudiante_id');
        $inscritosPagina = $inscritos->intersect($ids)->all();

        $pagina->getCollection()->transform(function (Estudiante $e) use ($invitaciones, $inscritosPagina) {
            $inv = $invitaciones->get($e->id);
            $inscrito = in_array($e->id, $inscritosPagina, true);
            $e->setAttribute('inscrito', $inscrito);
            // aceptada: se inscribio con la invitacion | inscrito: inscrito por otro medio |
            // enviada: invitado, todavia no acepto | null: sin invitacion.
            $e->setAttribute('invitacion', match (true) {
                $inscrito && $inv?->aceptada_en !== null => 'aceptada',
                $inscrito => 'inscrito',
                $inv !== null => 'enviada',
                default => null,
            });
            $e->setAttribute('invitada_en', $inv?->enviada_en?->copy()->setTimezone(self::TZ)->format('d/m/Y H:i'));

            return $e;
        });

        $datos = $pagina->toArray();
        $datos['total_inscritos'] = $inscritos->count();
        $datos['total_pendientes'] = $pendientes->diff($inscritos)->count();

        return response()->json($datos);
    }

    // Envia la invitacion a los estudiantes seleccionados (o a todos los de la busqueda).
    // Los que ya estan inscritos no reciben invitacion.
    public function enviar(Request $request, Examen $examen)
    {
        if ($examen->estado_actual !== 'programado') {
            return response()->json([
                'message' => 'Solo se envían invitaciones a exámenes programados (que todavía no empezaron).',
            ], 422);
        }

        $data = $request->validate([
            'estudiante_ids' => ['required_without:todos', 'array', 'min:1'],
            'estudiante_ids.*' => ['integer', 'exists:estudiantes,id'],
            'todos' => ['sometimes', 'boolean'],
        ], [
            'estudiante_ids.required_without' => 'Seleccione al menos un estudiante.',
            'estudiante_ids.min' => 'Seleccione al menos un estudiante.',
            'estudiante_ids.*.exists' => 'El estudiante no existe.',
        ]);

        $inscritos = InscripcionExamen::where('examen_id', $examen->id)->pluck('estudiante_id');
        $consulta = ! empty($data['todos'])
            ? $this->estudiantesFiltrados($request)
            : Estudiante::where('activo', true)->whereIn('id', $data['estudiante_ids']);
        // "Invitar a todos" con el filtro "Invitados que no aceptaron": solo se reenvia a ellos.
        if (! empty($data['todos']) && $request->input('mostrar') === 'pendientes') {
            $consulta->whereIn('id', InvitacionExamen::where('examen_id', $examen->id)->whereNull('aceptada_en')->pluck('estudiante_id'));
        }
        $estudiantes = $consulta->whereNotIn('id', $inscritos)->orderBy('nombre_completo')->get();

        if ($estudiantes->isEmpty()) {
            return response()->json(['message' => 'Los estudiantes seleccionados ya están inscritos en este examen.'], 422);
        }
        if ($estudiantes->count() > self::MAXIMO) {
            return response()->json([
                'message' => 'Solo se pueden enviar hasta '.self::MAXIMO.' invitaciones a la vez. Usa la búsqueda o el filtro de carrera para enviarlas por partes.',
            ], 422);
        }

        // Cada correo tarda unos segundos: se amplia el tiempo maximo de la peticion.
        @set_time_limit(300);

        $examen->loadMissing(['materia', 'ambiente', 'ambientes']);
        $usuario = $request->user();
        $enviadas = 0;
        $fallidas = [];

        foreach ($estudiantes as $estudiante) {
            $token = Str::random(48);
            try {
                Mail::to($estudiante->correo_institucional)
                    ->send(new InvitacionExamenMail($estudiante, $examen, $token, $usuario?->nombre_completo));
            } catch (\Throwable $e) {
                $fallidas[] = $estudiante->nombre_completo;
                Log::warning('No se pudo enviar la invitacion a '.$estudiante->correo_institucional.': '.$e->getMessage());

                continue;
            }

            // Solo se guarda la invitacion si el correo se envio. Si ya tenia una, el codigo
            // anterior se reemplaza (deja de servir).
            InvitacionExamen::updateOrCreate(
                ['examen_id' => $examen->id, 'estudiante_id' => $estudiante->id],
                ['token' => $token, 'enviada_por' => $usuario?->id, 'enviada_en' => now(), 'aceptada_en' => null],
            );
            $enviadas++;
        }

        if ($enviadas === 0) {
            return response()->json(['message' => 'No se pudo enviar el correo. Intente nuevamente en unos minutos.'], 503);
        }

        Historial::registrar(
            'Enviar invitaciones',
            'Exámenes',
            ($enviadas === 1 ? '1 invitación enviada' : "$enviadas invitaciones enviadas")
                .' al examen '.$this->describirExamen($examen),
            $examen,
            null,
            ['invitaciones_enviadas' => $enviadas, 'no_enviadas' => count($fallidas)],
        );

        $mensaje = ($enviadas === 1 ? 'Invitación enviada' : "$enviadas invitaciones enviadas")
            .' con éxito a las '.Historial::horaActual().'.';
        if ($fallidas) {
            $mensaje .= ' No se pudo enviar a: '.implode(', ', $fallidas).'.';
        }

        return response()->json([
            'message' => $mensaje,
            'enviadas' => $enviadas,
            'no_enviadas' => count($fallidas),
        ], 201);
    }

    // Pantalla publica "Aceptar invitación" (el enlace del correo). No requiere iniciar sesion:
    // el codigo unico de la invitacion identifica al estudiante y al examen.
    public function aceptar(string $token)
    {
        $invitacion = InvitacionExamen::with(['estudiante', 'examen.materia', 'examen.ambiente', 'examen.ambientes'])
            ->where('token', $token)
            ->first();

        if (! $invitacion || ! $invitacion->estudiante?->activo || ! $invitacion->examen) {
            return response()->json([
                'message' => 'La invitación no es válida. Puede que se haya enviado una invitación más reciente: revisa tu correo.',
            ], 404);
        }

        $examen = $invitacion->examen;
        $datos = [
            'estudiante' => $invitacion->estudiante->nombre_completo,
            'examen' => $this->datosExamen($examen),
        ];

        $yaInscrito = InscripcionExamen::where('examen_id', $examen->id)
            ->where('estudiante_id', $invitacion->estudiante_id)
            ->exists();
        if ($yaInscrito) {
            if (! $invitacion->aceptada_en) {
                $invitacion->update(['aceptada_en' => now()]);
            }

            return response()->json(['message' => 'Ya estás inscrito en este examen.', ...$datos]);
        }

        if ($examen->estado_actual !== 'programado') {
            return response()->json([
                'message' => 'El examen ya no admite inscripciones (está '.$examen->estado_actual.').',
                ...$datos,
            ], 422);
        }

        DB::transaction(function () use ($invitacion, $examen) {
            InscripcionExamen::firstOrCreate(
                ['examen_id' => $examen->id, 'estudiante_id' => $invitacion->estudiante_id],
                ['registrado_por' => $invitacion->enviada_por],
            );
            $invitacion->update(['aceptada_en' => now()]);
        });

        return response()->json(['message' => 'Invitación aceptada. Quedaste inscrito en el examen.', ...$datos]);
    }

    private function datosExamen(Examen $examen): array
    {
        $ambientes = $examen->ambientes->pluck('nombre')->all();
        if (! $ambientes && $examen->ambiente) {
            $ambientes = [$examen->ambiente->nombre];
        }

        return [
            'materia' => $examen->materia?->nombre,
            'fecha' => $examen->fecha?->format('d/m/Y'),
            'hora' => substr((string) $examen->hora_inicio, 0, 5),
            'duracion_min' => (int) $examen->duracion_min,
            'ambientes' => implode(', ', $ambientes),
        ];
    }

    private function describirExamen(Examen $examen): string
    {
        $d = $this->datosExamen($examen);

        return trim(($d['materia'] ?? '').' del '.$d['fecha'].' '.$d['hora']);
    }

    private function estudiantesFiltrados(Request $request)
    {
        return Estudiante::query()
            ->where('activo', true)
            ->when($request->input('buscar'), function ($q, $buscar) {
                $q->where(function ($qq) use ($buscar) {
                    $qq->where('codigo_universitario', 'ilike', "%{$buscar}%")
                        ->orWhere('documento_identidad', 'ilike', "%{$buscar}%")
                        ->orWhere('nombre_completo', 'ilike', "%{$buscar}%")
                        ->orWhere('correo_institucional', 'ilike', "%{$buscar}%");
                });
            })
            ->when($request->input('carrera_id'), function ($q, $carreraId) {
                $q->where(function ($qq) use ($carreraId) {
                    $qq->where('carrera_id', $carreraId)
                        ->orWhereHas('carreras', fn ($c) => $c->where('carreras.id', $carreraId));
                });
            });
    }
}
