<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegistrarIngresoRequest;
use App\Http\Requests\VerificarIdentidadRequest;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Habilitacion;
use App\Models\Ingreso;
use App\Models\InscripcionExamen;
use App\Models\IntentoIngreso;
use App\Models\MetodoVerificacion;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

// Sprint 2: HU-10 (verificacion de identidad), HU-11 (validacion de habilitacion),
// HU-12 (registro de ingreso), HU-13 (ingreso unico) y HU-26 (intentos no correspondientes).
class ControlIngresoController extends Controller
{
    private const TZ = 'America/La_Paz';

    private const METODOS = [
        'codigo' => 'codigo_universitario',
        'documento' => 'documento_identidad',
        'qr' => 'codigo_qr',
    ];

    // HU-10 (1): examenes programados para la fecha actual.
    public function examenes()
    {
        $hoy = Carbon::now(self::TZ)->toDateString();

        return Examen::with(['materia', 'ambiente', 'ambientes'])
            ->whereDate('fecha', $hoy)
            ->where('estado', '!=', 'cancelado')
            ->orderBy('hora_inicio')
            ->orderBy('id')
            ->get()
            ->map(fn (Examen $e) => $this->resumenExamen($e))
            ->values();
    }

    // HU-10 + HU-11 + HU-26: verifica la identidad, valida la habilitacion y,
    // si el estudiante no corresponde al examen, registra el intento.
    public function verificar(VerificarIdentidadRequest $request)
    {
        $data = $request->validated();
        $examen = Examen::with(['materia', 'ambiente', 'ambientes'])->findOrFail($data['examen_id']);
        $metodo = $data['metodo'];

        $estudiante = $this->buscarEstudiante($metodo, $data['valor']);

        if (! $estudiante) {
            return response()->json([
                'message' => $metodo === 'qr' ? 'Código QR no válido.' : 'Estudiante no encontrado.',
            ], 404);
        }

        $estudiante->load(['carrera', 'carreras']);

        [$estado, $habilitacion] = $this->estadoDeHabilitacion($examen, $estudiante);

        $motivo = null;
        $mensajeEstado = null;
        if ($estado === 'no_inscrito') {
            $mensajeEstado = 'El estudiante no está inscrito en este examen.';
        } elseif ($estado === 'no_habilitado') {
            $motivo = $habilitacion?->observacion
                ?: 'El estudiante no tiene una habilitación registrada para este examen.';
        }

        // HU-26: intento de ingreso a un examen que no le corresponde.
        $intentoRegistrado = false;
        if ($estado !== 'habilitado') {
            $this->registrarIntento(
                $request,
                $examen,
                $estudiante,
                $estado === 'no_inscrito' ? 'No inscrito en el examen' : 'No habilitado'
            );
            $intentoRegistrado = true;
        }

        // HU-13: ingreso previo del estudiante en este examen.
        $ingresoPrevio = null;
        if ($estado === 'habilitado' && $habilitacion) {
            $existente = Ingreso::with('usuario')->where('habilitacion_id', $habilitacion->id)->first();
            if ($existente) {
                $ingresoPrevio = $this->datosIngresoPrevio($existente);
            }
        }

        return response()->json([
            'message' => 'Identidad verificada.',
            'estudiante' => $this->datosEstudiante($estudiante),
            'estado' => $estado,
            'motivo' => $motivo,
            'mensaje_estado' => $mensajeEstado,
            'examen' => $this->resumenExamen($examen),
            'ingreso_previo' => $ingresoPrevio,
            'intento_registrado' => $intentoRegistrado,
            'mensaje_intento' => $intentoRegistrado ? 'Intento de ingreso no correspondiente registrado.' : null,
        ]);
    }

    // HU-12 + HU-13: registra el ingreso (uno solo por estudiante y examen).
    public function registrarIngreso(RegistrarIngresoRequest $request)
    {
        $data = $request->validated();
        $examen = Examen::with(['materia', 'ambiente', 'ambientes'])->findOrFail($data['examen_id']);
        $estudiante = Estudiante::where('activo', true)->find($data['estudiante_id']);

        if (! $estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        [$estado, $habilitacion] = $this->estadoDeHabilitacion($examen, $estudiante);

        // HU-12 (1): solo los estudiantes habilitados pueden registrar su ingreso.
        if ($estado !== 'habilitado') {
            return response()->json([
                'message' => $estado === 'no_inscrito'
                    ? 'El estudiante no está inscrito en este examen.'
                    : 'El estudiante no está habilitado para este examen.',
            ], 422);
        }

        // HU-13 (1): comprobar si ya tiene un ingreso en este examen.
        $existente = Ingreso::with('usuario')->where('habilitacion_id', $habilitacion->id)->first();
        if ($existente) {
            return $this->respuestaDuplicado($existente);
        }

        $metodoId = MetodoVerificacion::where('codigo', self::METODOS[$data['metodo']])->value('id')
            ?? MetodoVerificacion::orderBy('id')->value('id');

        try {
            // HU-12 (2, 3, 4): fecha y hora del servidor, usuario responsable y ambiente del examen.
            $ingreso = Ingreso::create([
                'habilitacion_id' => $habilitacion->id,
                'ambiente_id' => $examen->ambiente_id,
                'metodo_verificacion_id' => $metodoId,
                'fecha_hora_ingreso' => Carbon::now(),
                'ambiente_correcto' => true,
                'usuario_id' => $request->user()->id,
            ]);
        } catch (QueryException $e) {
            // HU-13 (6): si dos usuarios registran a la vez, la restriccion unica de la
            // base de datos deja un solo registro y el segundo recibe el aviso de duplicado.
            if (($e->errorInfo[0] ?? $e->getCode()) == '23505') {
                $existente = Ingreso::with('usuario')->where('habilitacion_id', $habilitacion->id)->first();
                if ($existente) {
                    return $this->respuestaDuplicado($existente);
                }
            }
            throw $e;
        }

        $ingreso->load('usuario');
        $hora = $this->hora($ingreso->fecha_hora_ingreso);

        return response()->json([
            'message' => "Ingreso registrado con éxito a las {$hora}.",
            'ingreso' => [
                'id' => $ingreso->id,
                'hora' => $hora,
                'fecha_hora' => $ingreso->fecha_hora_ingreso,
                'registrado_por' => $ingreso->usuario?->nombre_completo,
            ],
            'resumen' => $this->resumenIngresos($examen),
        ], 201);
    }

    // HU-12 (6, 7, 8): ultimos ingresos y contador "XX ingresados / XX habilitados".
    public function ingresos(Examen $examen)
    {
        return response()->json($this->resumenIngresos($examen));
    }

    // HU-26 (8): intentos registrados del examen seleccionado.
    public function intentos(Examen $examen)
    {
        $intentos = IntentoIngreso::with(['estudiante', 'usuario'])
            ->where('examen_id', $examen->id)
            ->orderByDesc('fecha_hora')
            ->orderByDesc('id')
            ->limit(500)
            ->get()
            ->map(function (IntentoIngreso $i) {
                $fecha = Carbon::parse($i->fecha_hora)->setTimezone(self::TZ);

                return [
                    'id' => $i->id,
                    'fecha' => $fecha->format('d/m/Y'),
                    'hora' => $fecha->format('H:i:s'),
                    'codigo' => $i->codigo_ingresado,
                    'nombre' => $i->estudiante?->nombre_completo,
                    'motivo' => $i->motivo_rechazo,
                    'registrado_por' => $i->usuario?->nombre_completo,
                ];
            })
            ->values();

        return response()->json($intentos);
    }

    // HU-12 (9): solo el administrador puede modificar un registro de ingreso.
    public function actualizarIngreso(Request $request, Ingreso $ingreso)
    {
        $data = $request->validate([
            'ambiente_id' => ['required', 'integer', 'exists:ambientes,id'],
        ], [
            'ambiente_id.required' => 'El ambiente es obligatorio.',
            'ambiente_id.exists' => 'El ambiente no existe.',
        ]);

        $ingreso->update($data);

        return response()->json($ingreso->load(['ambiente', 'usuario']));
    }

    public function eliminarIngreso(Ingreso $ingreso)
    {
        $ingreso->delete();

        return response()->json(['message' => 'Ingreso eliminado.']);
    }

    // HU-26 (9): los intentos registrados no se pueden modificar ni eliminar.
    public function intentoInmutable()
    {
        return response()->json(['message' => 'Los intentos registrados no se pueden modificar ni eliminar.'], 403);
    }

    // ---------------------------------------------------------------------

    private function buscarEstudiante(string $metodo, string $valor): ?Estudiante
    {
        $query = Estudiante::query()->where('activo', true);

        if ($metodo === 'documento') {
            $normalizado = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $valor));

            return $query
                ->whereRaw("regexp_replace(upper(documento_identidad), '[^A-Z0-9]', '', 'g') = ?", [$normalizado])
                ->first();
        }

        // El codigo universitario (tambien el contenido del QR) no distingue mayusculas.
        return $query->whereRaw('upper(codigo_universitario) = ?', [strtoupper($valor)])->first();
    }

    // Devuelve [estado, habilitacion]: habilitado | no_habilitado | no_inscrito.
    private function estadoDeHabilitacion(Examen $examen, Estudiante $estudiante): array
    {
        $inscrito = InscripcionExamen::where('estudiante_id', $estudiante->id)
            ->where('examen_id', $examen->id)
            ->exists();

        if (! $inscrito) {
            return ['no_inscrito', null];
        }

        $habilitacion = Habilitacion::where('estudiante_id', $estudiante->id)
            ->where('examen_id', $examen->id)
            ->first();

        if ($habilitacion && $habilitacion->habilitado) {
            return ['habilitado', $habilitacion];
        }

        return ['no_habilitado', $habilitacion];
    }

    private function registrarIntento(Request $request, Examen $examen, Estudiante $estudiante, string $motivo): void
    {
        // Evita duplicar el intento si se repite la misma verificacion en pocos segundos.
        $reciente = IntentoIngreso::where('examen_id', $examen->id)
            ->where('estudiante_id', $estudiante->id)
            ->where('usuario_id', $request->user()->id)
            ->where('motivo_rechazo', $motivo)
            ->where('fecha_hora', '>=', Carbon::now()->subSeconds(5))
            ->exists();

        if ($reciente) {
            return;
        }

        IntentoIngreso::create([
            'examen_id' => $examen->id,
            'estudiante_id' => $estudiante->id,
            'codigo_ingresado' => $estudiante->codigo_universitario,
            'motivo_rechazo' => $motivo,
            'fecha_hora' => Carbon::now(),
            'usuario_id' => $request->user()->id,
        ]);
    }

    private function respuestaDuplicado(Ingreso $existente)
    {
        $datos = $this->datosIngresoPrevio($existente);

        return response()->json([
            'message' => $datos['mensaje'],
            'ingreso_previo' => $datos,
        ], 409);
    }

    private function datosIngresoPrevio(Ingreso $ingreso): array
    {
        $hora = $this->hora($ingreso->fecha_hora_ingreso);

        return [
            'hora' => $hora,
            'registrado_por' => $ingreso->usuario?->nombre_completo,
            'mensaje' => "El estudiante ya registró su ingreso a este examen a las {$hora}.",
        ];
    }

    private function hora($fechaHora): string
    {
        return Carbon::parse($fechaHora)->setTimezone(self::TZ)->format('H:i:s');
    }

    private function datosEstudiante(Estudiante $estudiante): array
    {
        $carreras = $estudiante->carreras->pluck('nombre');
        if ($carreras->isEmpty() && $estudiante->carrera) {
            $carreras = collect([$estudiante->carrera->nombre]);
        }

        return [
            'id' => $estudiante->id,
            'nombre_completo' => $estudiante->nombre_completo,
            'codigo_universitario' => $estudiante->codigo_universitario,
            'documento_identidad' => $estudiante->documento_identidad,
            'carrera' => $carreras->implode(', '),
            'correo_institucional' => $estudiante->correo_institucional,
        ];
    }

    private function resumenExamen(Examen $examen): array
    {
        $ambientes = $examen->ambientes->pluck('nombre');
        if ($ambientes->isEmpty() && $examen->ambiente) {
            $ambientes = collect([$examen->ambiente->nombre]);
        }

        return [
            'id' => $examen->id,
            'asignatura' => $examen->materia?->nombre,
            'fecha' => $examen->fecha?->format('d/m/Y'),
            'hora' => substr((string) $examen->hora_inicio, 0, 5),
            'ambiente' => $ambientes->implode(', '),
            'estado' => $examen->estado_actual,
        ];
    }

    private function resumenIngresos(Examen $examen): array
    {
        $consulta = Ingreso::query()
            ->whereHas('habilitacion', fn ($q) => $q->where('examen_id', $examen->id));

        $ultimos = (clone $consulta)
            ->with(['habilitacion.estudiante', 'usuario'])
            ->orderByDesc('fecha_hora_ingreso')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (Ingreso $i) => [
                'id' => $i->id,
                'hora' => $this->hora($i->fecha_hora_ingreso),
                'codigo' => $i->habilitacion?->estudiante?->codigo_universitario,
                'nombre' => $i->habilitacion?->estudiante?->nombre_completo,
                'registrado_por' => $i->usuario?->nombre_completo,
            ])
            ->values();

        return [
            'ingresados' => $consulta->count(),
            'habilitados' => Habilitacion::where('examen_id', $examen->id)->where('habilitado', true)->count(),
            'ultimos' => $ultimos,
        ];
    }
}
