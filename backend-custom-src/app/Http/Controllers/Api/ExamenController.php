<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreExamenRequest;
use App\Http\Requests\UpdateExamenRequest;
use App\Models\Examen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExamenController extends Controller
{
    // Busqueda sin tildes (Sprint 4: los registros se encuentran buscando).
    private const SIN_TILDES_SQL = "translate(lower(nombre), 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')";

    private static function sinTildes(string $texto): string
    {
        return strtr(mb_strtolower($texto), ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
    }

    public function index(Request $request)
    {
        return Examen::with([
            'materia',
            'ambiente',
            'ambientes',
            // Normas generales del examen (las que no son de un estudiante en particular).
            'normas' => fn ($q) => $q->whereNull('estudiante_id')->orderBy('id'),
        ])
            ->when($request->query('fecha'), fn ($q, $v) => $q->whereDate('fecha', $v))
            ->when($request->query('materia_id'), fn ($q, $v) => $q->where('materia_id', $v))
            // Filtros (boton "Filtros"): asignatura por nombre, rango de fechas y estado.
            // La busqueda no distingue mayusculas ni tildes ("algebra" encuentra "Álgebra").
            ->when($request->query('buscar'), fn ($q, $v) => $q->whereHas(
                'materia',
                fn ($qq) => $qq->whereRaw(self::SIN_TILDES_SQL.' LIKE ?', ['%'.self::sinTildes($v).'%'])
            ))
            ->when($request->query('ambiente_id'), fn ($q, $v) => $q->where(
                fn ($qq) => $qq->where('ambiente_id', $v)->orWhereHas('ambientes', fn ($a) => $a->where('ambientes.id', $v))
            ))
            ->when($request->query('desde'), fn ($q, $v) => $q->whereDate('fecha', '>=', $v))
            ->when($request->query('hasta'), fn ($q, $v) => $q->whereDate('fecha', '<=', $v))
            ->when($request->query('estado'), fn ($q, $v) => $this->filtrarEstado($q, $v))
            // "Editar examen": solo los examenes que todavia no finalizaron ni fueron cancelados.
            ->when($request->boolean('solo_editables'), fn ($q) => $this->filtrarEstado($q, 'editable'))
            // Examenes cancelados antes de que la eliminacion fuera definitiva: no se
            // listan salvo que se pidan (la Lista de examenes los muestra para poder eliminarlos).
            ->when(! $request->boolean('incluir_cancelados'), fn ($q) => $q->where('estado', '!=', 'cancelado'))
            // Los mas recientes primero: asi el examen recien programado aparece
            // arriba y no queda escondido en una pagina posterior.
            ->orderByDesc('fecha')
            ->orderByDesc('hora_inicio')
            ->paginate(min((int) $request->query('per_page', 20), 100));
    }

    // HU-02: Registro de examenes (Programar examen)
    public function store(StoreExamenRequest $request)
    {
        $data = $request->validated();
        $normas = $data['normas'] ?? [];
        $ambientes = array_values($data['ambientes']);
        unset($data['normas'], $data['ambientes']);

        // Sprint 4 (observaciones 2 y 8): no se registra un examen duplicado. Si ya existe un
        // examen de la misma asignatura el mismo dia en un horario que se cruza, se avisa y se
        // sugiere editar ese examen (por ejemplo, para agregarle aulas).
        if ($duplicado = $this->buscarDuplicado($data['materia_id'], $data['fecha'], $data['hora_inicio'], (int) ($data['duracion_min'] ?? 0))) {
            return $this->respuestaDuplicado($duplicado, $request);
        }

        $examen = DB::transaction(function () use ($data, $normas, $ambientes, $request) {
            // El primer ambiente queda como principal (columna ambiente_id).
            $examen = Examen::create([
                ...$data,
                'ambiente_id' => $ambientes[0],
                'creado_por' => $request->user()->id,
            ]);
            $examen->ambientes()->sync($ambientes);

            foreach ($normas as $norma) {
                $examen->normas()->create($norma);
            }

            return $examen;
        });

        return response()->json($examen->load(['materia', 'ambiente', 'ambientes', 'normas']), 201);
    }

    // Sprint 4: aviso anticipado en "Programar examen". Mientras se llenan la asignatura, la
    // fecha y la hora, la pantalla consulta si ya existe un examen igual para mostrar la alerta
    // antes de presionar "Guardar".
    public function duplicado(Request $request)
    {
        $data = $request->validate([
            'materia_id' => ['required', 'integer'],
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora_inicio' => ['required', 'date_format:H:i'],
            'duracion_min' => ['nullable', 'integer', 'min:0', 'max:300'],
        ]);

        $duplicado = $this->buscarDuplicado($data['materia_id'], $data['fecha'], $data['hora_inicio'], (int) ($data['duracion_min'] ?? 0));

        return response()->json([
            'duplicado' => $duplicado ? $this->datosDuplicado($duplicado, $request) : null,
        ]);
    }

    public function show(Examen $examen)
    {
        return $examen->load(['materia', 'ambiente', 'ambientes', 'normas', 'habilitaciones.estudiante']);
    }

    // HU-08: Edicion de examenes (Sprint 4, observacion 13): solo ambientes, duracion y
    // normas. Un examen finalizado o cancelado ya no se edita.
    public function update(UpdateExamenRequest $request, Examen $examen)
    {
        if (in_array($examen->estado_actual ?? $examen->estado, ['finalizado', 'cancelado'], true)) {
            return response()->json([
                'message' => 'Este examen está '.($examen->estado_actual ?? $examen->estado).': ya no se puede editar.',
            ], 422);
        }

        $data = $request->validated();
        $ambientes = isset($data['ambientes']) ? array_values($data['ambientes']) : null;
        $tieneNormas = array_key_exists('normas', $data);
        $normas = $data['normas'] ?? [];
        unset($data['ambientes'], $data['normas']);

        DB::transaction(function () use ($examen, $data, $ambientes, $tieneNormas, $normas) {
            if ($ambientes) {
                $data['ambiente_id'] = $ambientes[0];
            }
            $examen->update($data);

            if ($ambientes) {
                $examen->ambientes()->sync($ambientes);
            } elseif (isset($data['ambiente_id'])) {
                $examen->ambientes()->sync([$data['ambiente_id']]);
            }

            // Se reemplazan solo las normas generales (las particulares de cada estudiante se conservan).
            if ($tieneNormas) {
                $examen->normas()->whereNull('estudiante_id')->delete();
                foreach ($normas as $norma) {
                    $examen->normas()->create($norma);
                }
            }
        });

        return $examen->load(['materia', 'ambiente', 'ambientes', 'normas']);
    }

    // HU-09: Eliminacion de examenes (Sprint 4, observacion 14 de la licenciada).
    // Un examen solo se puede eliminar si NO tiene registros asociados: estudiantes inscritos,
    // habilitaciones, ingresos, intentos de ingreso, expulsiones ni incidencias. Si no tiene
    // ninguno, se elimina aunque su fecha ya haya pasado (se borran sus normas y aulas).
    public function destroy(Examen $examen)
    {
        $registros = $this->registrosDelExamen($examen);
        if ($registros) {
            return response()->json([
                'message' => 'No se puede eliminar el examen porque tiene registros asociados: '.implode(', ', $registros).'.',
                'registros' => $registros,
            ], 409);
        }

        DB::transaction(function () use ($examen) {
            // normas y examen_ambiente se borran en cascada.
            $examen->delete();
        });

        return response()->json(['message' => 'Examen eliminado con éxito.']);
    }

    // Sprint 4: indica si el examen se puede eliminar (pantalla "Eliminar examen").
    public function eliminable(Examen $examen)
    {
        $registros = $this->registrosDelExamen($examen);

        return response()->json(['eliminable' => ! $registros, 'registros' => $registros]);
    }

    // Registros que impiden eliminar el examen, por ejemplo ["3 estudiantes inscritos", "1 ingreso"].
    private function registrosDelExamen(Examen $examen): array
    {
        $contar = fn (string $tabla) => DB::table($tabla)->where('examen_id', $examen->id)->count();
        $ingresosDelExamen = DB::table('ingresos')
            ->join('habilitaciones', 'habilitaciones.id', '=', 'ingresos.habilitacion_id')
            ->where('habilitaciones.examen_id', $examen->id);
        $ingresos = (clone $ingresosDelExamen)->count();
        $expulsiones = DB::table('expulsiones')
            ->whereIn('ingreso_id', (clone $ingresosDelExamen)->select('ingresos.id'))
            ->count();

        $conteos = [
            ['estudiante inscrito', 'estudiantes inscritos', $contar('inscripciones_examen')],
            ['habilitación', 'habilitaciones', $contar('habilitaciones')],
            ['ingreso', 'ingresos', $ingresos],
            ['intento de ingreso', 'intentos de ingreso', $contar('intentos_ingreso')],
            ['expulsión', 'expulsiones', $expulsiones],
            ['incidencia', 'incidencias', $contar('incidencias')],
        ];

        $partes = [];
        foreach ($conteos as [$singular, $plural, $n]) {
            if ($n > 0) {
                $partes[] = $n.' '.($n === 1 ? $singular : $plural);
            }
        }

        return $partes;
    }

    // Examen no cancelado de la misma asignatura, el mismo dia, cuyo horario se cruza con el
    // nuevo (si no se indica la duracion, basta con la misma hora de inicio).
    private function buscarDuplicado($materiaId, string $fecha, string $hora, int $duracion, ?int $excepto = null): ?Examen
    {
        $hora = substr($hora, 0, 5);
        $minutos = max($duracion, 1);

        return Examen::with(['materia', 'ambiente', 'ambientes'])
            ->where('materia_id', $materiaId)
            ->whereDate('fecha', $fecha)
            ->where('estado', '!=', 'cancelado')
            ->when($excepto, fn ($q) => $q->where('id', '!=', $excepto))
            ->where(function ($q) use ($hora, $minutos) {
                $q->whereRaw("to_char(hora_inicio, 'HH24:MI') = ?", [$hora])
                    ->orWhereRaw(
                        "hora_inicio < (?::time + make_interval(mins => ?)) AND (hora_inicio + make_interval(mins => GREATEST(COALESCE(duracion_min, 0), 1))) > ?::time",
                        [$hora, $minutos, $hora]
                    );
            })
            ->orderBy('hora_inicio')
            ->first();
    }

    private function datosDuplicado(Examen $ex, Request $request): array
    {
        $ambientes = $ex->ambientes->pluck('nombre');
        if ($ambientes->isEmpty() && $ex->ambiente) {
            $ambientes = collect([$ex->ambiente->nombre]);
        }
        $estado = $ex->estado_actual ?? $ex->estado;

        return [
            'id' => $ex->id,
            'asignatura' => $ex->materia?->nombre,
            'fecha' => \Carbon\Carbon::parse($ex->fecha)->format('d/m/Y'),
            'hora' => substr((string) $ex->hora_inicio, 0, 5),
            'duracion' => $ex->duracion_min,
            'ambientes' => $ambientes->implode(', '),
            'estado' => $estado,
            // Se puede ir a editarlo si el usuario tiene el permiso y el examen no termino.
            'editable' => ! in_array($estado, ['finalizado', 'cancelado'], true)
                && in_array('examenes.editar', $request->user()?->permisosDeSesion() ?? [], true),
        ];
    }

    private function respuestaDuplicado(Examen $ex, Request $request)
    {
        $d = $this->datosDuplicado($ex, $request);

        return response()->json([
            'message' => "Ya existe un examen de {$d['asignatura']} el {$d['fecha']} a las {$d['hora']} ({$d['ambientes']}). "
                .'Si necesitas más aulas, edita ese examen en lugar de registrar otro.',
            'duplicado' => $d,
        ], 409);
    }

    // Estado calculado con la fecha, la hora y la duracion del examen (hora de La Paz),
    // igual que el atributo estado_actual del modelo.
    private function filtrarEstado($query, string $estado)
    {
        $ahora = \Carbon\Carbon::now('America/La_Paz')->format('Y-m-d H:i:s');
        $inicio = '(fecha + hora_inicio)';
        $fin = "(fecha + hora_inicio + make_interval(mins => COALESCE(duracion_min, 0)))";

        return match ($estado) {
            'cancelado' => $query->where('estado', 'cancelado'),
            'programado' => $query->where('estado', '!=', 'cancelado')->whereRaw("$inicio > ?::timestamp", [$ahora]),
            'en curso' => $query->where('estado', '!=', 'cancelado')
                ->whereRaw("$inicio <= ?::timestamp", [$ahora])
                ->whereRaw("$fin > ?::timestamp", [$ahora]),
            'finalizado' => $query->where('estado', '!=', 'cancelado')->whereRaw("$fin <= ?::timestamp", [$ahora]),
            'editable' => $query->where('estado', '!=', 'cancelado')->whereRaw("$fin > ?::timestamp", [$ahora]),
            default => $query,
        };
    }
}
