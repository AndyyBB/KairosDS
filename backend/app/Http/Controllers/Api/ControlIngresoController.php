<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegistrarIngresoRequest;
use App\Http\Requests\VerificarIdentidadRequest;
use App\Models\Ambiente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Habilitacion;
use App\Models\Incidencia;
use App\Models\TipoIncidencia;
use App\Models\Ingreso;
use App\Models\InscripcionExamen;
use App\Models\IntentoIngreso;
use App\Models\MetodoVerificacion;
use App\Support\Historial;
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
    // Con ?con_ingresos=1 (pantallas "Editar ingreso" y "Eliminar ingreso") se devuelven los
    // examenes de cualquier fecha que tienen al menos un ingreso registrado.
    public function examenes(Request $request)
    {
        if ($request->boolean('con_ingresos')) {
            return Examen::with(['materia', 'ambiente', 'ambientes'])
                ->whereHas('habilitaciones', fn ($q) => $q->whereIn(
                    'habilitaciones.id',
                    Ingreso::query()->select('habilitacion_id')
                ))
                ->orderByDesc('fecha')
                ->orderByDesc('hora_inicio')
                ->limit(200)
                ->get()
                ->map(fn (Examen $e) => $this->resumenExamen($e))
                ->values();
        }

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
            // Sprint 4 (observacion 9): el intento con un codigo o documento que no pertenece a
            // ningun estudiante (o con un QR no valido) queda en la central de riesgos.
            $intento = $this->registrarIntento(
                $request,
                $examen,
                null,
                $metodo === 'qr' ? 'Código QR no válido' : 'No registrado en el sistema',
                $data['valor']
            );

            return response()->json([
                'message' => $metodo === 'qr' ? 'Código QR no válido.' : 'Estudiante no encontrado.',
                'riesgo' => $this->datosRiesgo($intento),
                'mensaje_riesgo' => 'Intento registrado en la central de riesgos.',
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
        $intento = null;
        if ($estado !== 'habilitado') {
            $intento = $this->registrarIntento(
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

        // Sprint 4 (observacion 8): el estudiante ya esta rindiendo otro examen en un horario
        // que se cruza con este (y no registro su salida).
        $otroExamen = null;
        if ($estado === 'habilitado' && ! $ingresoPrevio) {
            $otro = $this->ingresoEnOtroExamen($examen, $estudiante);
            $otroExamen = $otro ? $this->datosOtroExamen($otro) : null;
            // Sprint 4 (observacion 9): tambien queda en la central de riesgos.
            if ($otroExamen) {
                $intento = $this->registrarIntento($request, $examen, $estudiante, 'Ya está rindiendo otro examen');
                $intentoRegistrado = true;
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
            'otro_examen' => $otroExamen,
            'intento_registrado' => $intentoRegistrado,
            'mensaje_intento' => $intentoRegistrado ? 'Intento de ingreso no correspondiente registrado en la central de riesgos.' : null,
            'riesgo' => $intento ? $this->datosRiesgo($intento) : null,
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

        // Sprint 4 (observacion 8): no puede ingresar si ya esta rindiendo otro examen, salvo
        // que se registre su salida de ese examen con una observacion.
        $otro = $this->ingresoEnOtroExamen($examen, $estudiante);
        $observacion = null;
        if ($otro && ! ($data['registrar_salida'] ?? false)) {
            $d = $this->datosOtroExamen($otro);

            return response()->json([
                'message' => $d['mensaje'],
                'otro_examen' => $d,
            ], 409);
        }

        $metodoId = MetodoVerificacion::where('codigo', self::METODOS[$data['metodo']])->value('id')
            ?? MetodoVerificacion::orderBy('id')->value('id');

        try {
            if ($otro) {
                // Salida del otro examen: fecha y hora del servidor, observacion y usuario.
                $observacion = trim($data['observacion']);
                $d = $this->datosOtroExamen($otro);
                $otro->update([
                    'fecha_hora_salida' => Carbon::now(),
                    'observacion_salida' => $observacion,
                    'salida_registrada_por' => $request->user()->id,
                ]);
                Historial::registrar(
                    'Registrar salida',
                    'Control de ingreso',
                    "Salida de {$estudiante->codigo_universitario} del examen {$d['asignatura']} ({$d['fecha']} {$d['hora']}) "
                        ."para ingresar a {$examen->materia?->nombre}: {$observacion}",
                    $otro
                );
                $observacion = "Salió del examen {$d['asignatura']} ({$d['hora']}) para ingresar a este examen: {$observacion}";
            }

            // HU-12 (2, 3, 4): fecha y hora del servidor, usuario responsable y ambiente del examen.
            $ingreso = Ingreso::create([
                'habilitacion_id' => $habilitacion->id,
                'ambiente_id' => $examen->ambiente_id,
                'metodo_verificacion_id' => $metodoId,
                'fecha_hora_ingreso' => Carbon::now(),
                'ambiente_correcto' => true,
                'usuario_id' => $request->user()->id,
                'observacion' => $observacion,
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

    // Ambientes disponibles para corregir el ambiente de un ingreso.
    public function ambientes()
    {
        return Ambiente::where('activo', true)->orderBy('nombre')->get(['id', 'nombre']);
    }

    // Sprint 4 (observaciones 19 y 20): los ingresos registrados no se modifican ni se eliminan.
    public function ingresoInmutable()
    {
        return response()->json(['message' => 'Los ingresos registrados no se pueden modificar ni eliminar.'], 403);
    }

    // ---------------- Sprint 4 (observacion 9): CENTRAL DE RIESGOS ----------------

    // Tipos de incidencia que se pueden registrar desde la central de riesgos.
    private const TIPOS_RIESGO = [
        'INTENTO_INDEBIDO' => 'Intento de ingreso indebido',
        'SUPLANTACION' => 'Sospecha de suplantación de identidad',
        'IDENTIFICACION' => 'Problema de identificación',
        'NO_HABILITADO' => 'Estudiante no habilitado',
        'OTRA' => 'Otra situación',
    ];

    // Intentos de ingreso indebido del examen (central de riesgos), del mas reciente al mas antiguo.
    public function riesgos(Examen $examen)
    {
        $intentos = IntentoIngreso::with(['estudiante', 'usuario', 'incidencia.tipoIncidencia'])
            ->where('examen_id', $examen->id)
            ->orderByDesc('fecha_hora')
            ->orderByDesc('id')
            ->limit(500)
            ->get();

        // Antecedentes: cuantas veces se registro el mismo codigo o documento (en cualquier examen).
        $antecedentes = IntentoIngreso::whereIn('codigo_ingresado', $intentos->pluck('codigo_ingresado')->unique())
            ->selectRaw('codigo_ingresado, count(*) AS total')
            ->groupBy('codigo_ingresado')
            ->pluck('total', 'codigo_ingresado');

        return response()->json([
            'riesgos' => $intentos->map(fn (IntentoIngreso $i) => $this->datosRiesgo($i, (int) ($antecedentes[$i->codigo_ingresado] ?? 1)))->values(),
            'tipos' => $this->tiposRiesgo(),
        ]);
    }

    public function tiposRiesgo(): array
    {
        $tipos = TipoIncidencia::whereIn('codigo', array_keys(self::TIPOS_RIESGO))->get()->keyBy('codigo');

        return collect(self::TIPOS_RIESGO)
            ->filter(fn ($_, $codigo) => $tipos->has($codigo))
            ->map(fn ($nombre, $codigo) => ['id' => $tipos[$codigo]->id, 'codigo' => $codigo, 'nombre' => $nombre])
            ->values()
            ->all();
    }

    // Registra, en ese mismo momento, la incidencia de un intento de la central de riesgos.
    public function registrarIncidenciaRiesgo(Request $request, IntentoIngreso $intento)
    {
        $tiposValidos = collect($this->tiposRiesgo())->pluck('id')->all();
        $data = $request->validate([
            'tipo_incidencia_id' => ['required', 'integer', \Illuminate\Validation\Rule::in($tiposValidos)],
            'descripcion' => ['bail', 'required', 'string', 'max:500'],
        ], [
            'tipo_incidencia_id.required' => 'El campo Tipo de incidencia es obligatorio.',
            'tipo_incidencia_id.in' => 'El campo Tipo de incidencia es obligatorio.',
            'descripcion.required' => 'El campo Descripción es obligatorio.',
            'descripcion.max' => 'La descripción tiene un límite de 500 caracteres.',
        ]);

        if (Incidencia::where('intento_id', $intento->id)->exists()) {
            return response()->json(['message' => 'Este intento ya tiene una incidencia registrada.'], 409);
        }

        $incidencia = Incidencia::create([
            'examen_id' => $intento->examen_id,
            'estudiante_id' => $intento->estudiante_id,
            'tipo_incidencia_id' => $data['tipo_incidencia_id'],
            'descripcion' => trim($data['descripcion']).' (Intento: '.$intento->codigo_ingresado.' — '.$intento->motivo_rechazo.')',
            'fecha_hora' => Carbon::now(),
            'usuario_id' => $request->user()->id,
            'intento_id' => $intento->id,
        ]);

        $hora = $this->hora($incidencia->fecha_hora);

        return response()->json([
            'message' => "Incidencia registrada con éxito a las {$hora}.",
            'riesgo' => $this->datosRiesgo($intento->fresh(['estudiante', 'usuario', 'incidencia.tipoIncidencia'])),
        ], 201);
    }

    private function datosRiesgo(IntentoIngreso $i, ?int $antecedentes = null): array
    {
        $i->loadMissing(['estudiante', 'usuario', 'incidencia.tipoIncidencia']);
        $fecha = Carbon::parse($i->fecha_hora)->setTimezone(self::TZ);
        $alto = in_array($i->motivo_rechazo, ['No registrado en el sistema', 'Código QR no válido', 'no encontrado'], true);
        $antecedentes ??= IntentoIngreso::where('codigo_ingresado', $i->codigo_ingresado)->count();

        return [
            'id' => $i->id,
            'fecha' => $fecha->format('d/m/Y'),
            'hora' => $fecha->format('H:i:s'),
            'codigo' => $i->codigo_ingresado,
            'nombre' => $i->estudiante?->nombre_completo,
            'registrado' => (bool) $i->estudiante_id,
            'motivo' => $i->motivo_rechazo,
            'nivel' => $alto ? 'Alto' : 'Medio',
            'antecedentes' => $antecedentes,
            'registrado_por' => $i->usuario?->nombre_completo,
            'incidencia' => $i->incidencia ? [
                'id' => $i->incidencia->id,
                'tipo' => self::TIPOS_RIESGO[$i->incidencia->tipoIncidencia?->codigo] ?? $i->incidencia->tipoIncidencia?->descripcion,
                'hora' => $this->hora($i->incidencia->fecha_hora),
                'descripcion' => $i->incidencia->descripcion,
            ] : null,
        ];
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
            $columna = "regexp_replace(upper(documento_identidad), '[^A-Z0-9]', '', 'g')";

            // Coincidencia exacta ("5901346CB" o "5901346 CB"); si solo se escribe el
            // numero ("5901346") tambien se encuentra el documento con su complemento
            // de expedicion de 1 a 3 letras ("5901346 CB").
            $exacto = (clone $query)->whereRaw("$columna = ?", [$normalizado])->first();
            if ($exacto || ! ctype_digit($normalizado)) {
                return $exacto;
            }

            return $query
                ->whereRaw("$columna ~ ?", ['^'.$normalizado.'[A-Z]{1,3}$'])
                ->orderBy('id')
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

    // HU-26 + Sprint 4 (central de riesgos): registra el intento de ingreso indebido. El
    // estudiante puede no existir (codigo o documento no registrado, QR no valido): se guarda
    // lo que se ingreso. Devuelve el intento (o el mismo intento si se repite en pocos segundos).
    private function registrarIntento(Request $request, Examen $examen, ?Estudiante $estudiante, string $motivo, ?string $valor = null): IntentoIngreso
    {
        $codigo = mb_substr(trim($estudiante?->codigo_universitario ?? (string) $valor), 0, 30);

        // Evita duplicar el intento si se repite la misma verificacion en pocos segundos.
        $reciente = IntentoIngreso::where('examen_id', $examen->id)
            ->where('codigo_ingresado', $codigo)
            ->where('usuario_id', $request->user()->id)
            ->where('motivo_rechazo', $motivo)
            ->where('fecha_hora', '>=', Carbon::now()->subSeconds(5))
            ->latest('id')
            ->first();

        if ($reciente) {
            return $reciente;
        }

        return IntentoIngreso::create([
            'examen_id' => $examen->id,
            'estudiante_id' => $estudiante?->id,
            'codigo_ingresado' => $codigo,
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
            ->with(['habilitacion.estudiante.carreras', 'habilitacion.estudiante.carrera', 'usuario', 'ambiente'])
            ->orderByDesc('fecha_hora_ingreso')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (Ingreso $i) => $this->filaIngreso($i))
            ->values();

        return [
            'ingresados' => $consulta->count(),
            'habilitados' => Habilitacion::where('examen_id', $examen->id)->where('habilitado', true)->count(),
            'ultimos' => $ultimos,
        ];
    }

    // Sprint 4 (observacion 8): ingreso del estudiante, sin salida registrada, en OTRO examen
    // (no cancelado) cuyo horario se cruza con el del examen actual.
    private function ingresoEnOtroExamen(Examen $examen, Estudiante $estudiante): ?Ingreso
    {
        $inicio = Carbon::parse($examen->fecha->toDateString().' '.substr((string) $examen->hora_inicio, 0, 8));
        $fin = (clone $inicio)->addMinutes(max((int) $examen->duracion_min, 1));

        return Ingreso::query()
            ->whereNull('fecha_hora_salida')
            ->whereHas('habilitacion', fn ($q) => $q
                ->where('estudiante_id', $estudiante->id)
                ->where('examen_id', '!=', $examen->id)
                ->whereHas('examen', fn ($e) => $e
                    ->where('estado', '!=', 'cancelado')
                    ->whereRaw('(fecha + hora_inicio) < ?::timestamp', [$fin->format('Y-m-d H:i:s')])
                    ->whereRaw('(fecha + hora_inicio + make_interval(mins => GREATEST(COALESCE(duracion_min, 0), 1))) > ?::timestamp', [$inicio->format('Y-m-d H:i:s')])))
            ->with(['habilitacion.examen.materia', 'ambiente'])
            ->orderByDesc('fecha_hora_ingreso')
            ->first();
    }

    private function datosOtroExamen(Ingreso $ingreso): array
    {
        $ex = $ingreso->habilitacion?->examen;
        $asignatura = $ex?->materia?->nombre ?? 'otro examen';
        $hora = substr((string) $ex?->hora_inicio, 0, 5);
        $ingresoHora = $this->hora($ingreso->fecha_hora_ingreso);

        return [
            'ingreso_id' => $ingreso->id,
            'examen_id' => $ex?->id,
            'asignatura' => $asignatura,
            'fecha' => $ex?->fecha ? Carbon::parse($ex->fecha)->format('d/m/Y') : null,
            'hora' => $hora,
            'ambiente' => $ingreso->ambiente?->nombre,
            'hora_ingreso' => $ingresoHora,
            'mensaje' => "El estudiante ya está rindiendo otro examen: {$asignatura} ({$hora}"
                .($ingreso->ambiente?->nombre ? ", {$ingreso->ambiente->nombre}" : '')
                ."), ingresó a las {$ingresoHora}.",
        ];
    }

    // Fila de un ingreso con los datos completos del estudiante.
    private function filaIngreso(Ingreso $i): array
    {
        return [
            'id' => $i->id,
            'hora' => $this->hora($i->fecha_hora_ingreso),
            'fecha' => $i->fecha_hora_ingreso ? Carbon::parse($i->fecha_hora_ingreso)->setTimezone(self::TZ)->format('d/m/Y') : null,
            'codigo' => $i->habilitacion?->estudiante?->codigo_universitario,
            'nombre' => $i->habilitacion?->estudiante?->nombre_completo,
            'documento' => $i->habilitacion?->estudiante?->documento_identidad,
            'carrera' => $i->habilitacion?->estudiante
                ? $this->datosEstudiante($i->habilitacion->estudiante)['carrera']
                : null,
            'correo' => $i->habilitacion?->estudiante?->correo_institucional,
            'ambiente_id' => $i->ambiente_id,
            'ambiente' => $i->ambiente?->nombre,
            'registrado_por' => $i->usuario?->nombre_completo,
            'salida' => $i->fecha_hora_salida ? $this->hora($i->fecha_hora_salida) : null,
            'observacion' => $i->observacion,
        ];
    }
}
