<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrera;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Habilitacion;
use App\Models\Incidencia;
use App\Models\InscripcionExamen;
use App\Models\IntentoIngreso;
use App\Models\TipoIncidencia;
use App\Support\Historial;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Importacion de la lista de estudiantes de un examen desde Excel (reemplaza a la
// invitacion por correo, HU-41). El frontend lee el archivo .xlsx y envia sus filas; aqui se
// validan TODAS antes de guardar nada:
// - Si alguna fila tiene un error (dato faltante o con formato invalido, carrera que no
//   existe, dato repetido dentro del mismo Excel), se rechaza TODO el archivo.
// - Las filas validas de estudiantes nuevos se registran y quedan INSCRITAS y HABILITADAS
//   en el examen elegido.
// - Si una fila corresponde a un estudiante que YA esta registrado en el sistema (mismo
//   codigo, documento, correo o nombres y apellidos), es un DUPLICADO: no se registra, no se
//   inscribe ni se habilita, y queda una incidencia en la central de riesgos del examen.
// Con "confirmar" en falso solo se revisa el archivo (vista previa); con "confirmar" en
// verdadero se guarda.
class ImportacionController extends Controller
{
    public const MAX_FILAS = 3000;

    // Motivo con el que el duplicado aparece en la central de riesgos (intentos_ingreso).
    public const MOTIVO_DUPLICADO = \App\Support\Riesgo::DUPLICADO_IMPORTACION;

    // Tipo de incidencia de los duplicados de la importacion.
    public const TIPO_DUPLICADO = 'DUPLICADO';

    // Plantilla vacia con las columnas del formato valido.
    public function plantilla()
    {
        return response()->download(
            resource_path('plantillas/plantilla_importar_estudiantes.xlsx'),
            'plantilla_importar_estudiantes.xlsx'
        );
    }

    public function importar(Request $request, Examen $examen)
    {
        if (in_array($examen->estado_actual, ['finalizado', 'cancelado'], true)) {
            return response()->json([
                'message' => 'No se puede importar estudiantes a un examen '.$examen->estado_actual.'.',
            ], 422);
        }

        $data = $request->validate([
            'filas' => ['required', 'array', 'min:1', 'max:'.self::MAX_FILAS],
            'filas.*.fila' => ['required', 'integer', 'min:1'],
            'filas.*.codigo_universitario' => ['nullable'],
            'filas.*.documento_identidad' => ['nullable'],
            'filas.*.nombres' => ['nullable'],
            'filas.*.apellidos' => ['nullable'],
            'filas.*.correo_institucional' => ['nullable'],
            'filas.*.carrera' => ['nullable'],
            'confirmar' => ['sometimes', 'boolean'],
        ], [
            'filas.required' => 'El archivo no tiene estudiantes.',
            'filas.min' => 'El archivo no tiene estudiantes.',
            'filas.max' => 'El archivo tiene más de '.self::MAX_FILAS.' estudiantes. Divídelo en varios archivos.',
        ]);

        $revision = $this->revisar($data['filas']);
        $errores = collect($revision)->sum(fn ($f) => count($f['errores']));

        $resumen = [
            'total' => count($revision),
            'nuevos' => collect($revision)->where('estado', 'nuevo')->count(),
            'duplicados' => collect($revision)->where('estado', 'duplicado')->count(),
            'errores' => $errores,
        ];

        // Se rechaza todo el archivo si alguna fila tiene un error.
        if ($errores > 0) {
            return response()->json([
                'message' => $errores === 1
                    ? 'El archivo tiene 1 error. Corrige el Excel y vuelve a subirlo: no se importó ningún estudiante.'
                    : "El archivo tiene {$errores} errores. Corrige el Excel y vuelve a subirlo: no se importó ningún estudiante.",
                'filas' => $revision,
                'resumen' => $resumen,
            ], 422);
        }

        if (! ($data['confirmar'] ?? false)) {
            return response()->json(['filas' => $revision, 'resumen' => $resumen]);
        }

        $usuarioId = $request->user()->id;
        $tipoDuplicado = $this->tipoDuplicado();

        DB::transaction(function () use ($revision, $examen, $usuarioId, $tipoDuplicado) {
            $hoy = now('America/La_Paz')->toDateString();
            $ahora = Carbon::now();

            foreach ($revision as $f) {
                if ($f['estado'] === 'nuevo') {
                    $estudiante = Estudiante::create([
                        'codigo_universitario' => $f['codigo_universitario'],
                        'documento_identidad' => $f['documento_identidad'],
                        'nombres' => $f['nombres'],
                        'apellidos' => $f['apellidos'],
                        'correo_institucional' => $f['correo_institucional'],
                        'carrera_id' => $f['carrera_id'],
                    ]);
                    $estudiante->carreras()->attach($f['carrera_id'], ['fecha_inicio' => $hoy]);

                    InscripcionExamen::create([
                        'examen_id' => $examen->id,
                        'estudiante_id' => $estudiante->id,
                        'registrado_por' => $usuarioId,
                    ]);
                    Habilitacion::create([
                        'examen_id' => $examen->id,
                        'estudiante_id' => $estudiante->id,
                        'habilitado' => true,
                        'registrado_por' => $usuarioId,
                    ]);

                    continue;
                }

                // Duplicado: queda en la central de riesgos del examen con su incidencia.
                $intento = IntentoIngreso::create([
                    'examen_id' => $examen->id,
                    'estudiante_id' => $f['estudiante_existente_id'],
                    'codigo_ingresado' => mb_substr($f['codigo_universitario'], 0, 30),
                    'motivo_rechazo' => self::MOTIVO_DUPLICADO,
                    'fecha_hora' => $ahora,
                    'usuario_id' => $usuarioId,
                ]);
                Incidencia::create([
                    'examen_id' => $examen->id,
                    'estudiante_id' => $f['estudiante_existente_id'],
                    'tipo_incidencia_id' => $tipoDuplicado,
                    'descripcion' => mb_substr('Importación desde Excel, fila '.$f['fila'].': '
                        .$f['codigo_universitario'].' — '.$f['nombres'].' '.$f['apellidos'].'. '
                        .implode(' ', $f['duplicado']).' No se registró, no se inscribió ni se habilitó en el examen.', 0, 1000),
                    'fecha_hora' => $ahora,
                    'usuario_id' => $usuarioId,
                    'intento_id' => $intento->id,
                ]);
            }
        });

        $examen->loadMissing('materia');
        Historial::registrar(
            'Importar',
            'Estudiantes',
            'Importación de la lista de estudiantes del examen '.($examen->materia?->nombre ?? $examen->id)
                .' del '.$examen->fecha?->format('d/m/Y').': '.$resumen['nuevos'].' registrados, inscritos y habilitados; '
                .$resumen['duplicados'].' duplicados enviados a la central de riesgos.',
            $examen
        );

        $hora = now('America/La_Paz')->format('H:i:s');
        $mensaje = match (true) {
            $resumen['nuevos'] === 0 => "Ningún estudiante nuevo para registrar ({$hora}).",
            $resumen['nuevos'] === 1 => "1 estudiante registrado, inscrito y habilitado con éxito a las {$hora}.",
            default => "{$resumen['nuevos']} estudiantes registrados, inscritos y habilitados con éxito a las {$hora}.",
        };
        if ($resumen['duplicados'] > 0) {
            $mensaje .= $resumen['duplicados'] === 1
                ? ' 1 estudiante duplicado no se importó y quedó como incidencia en la central de riesgos.'
                : ' '.$resumen['duplicados'].' estudiantes duplicados no se importaron y quedaron como incidencia en la central de riesgos.';
        }

        return response()->json(['message' => $mensaje, 'filas' => $revision, 'resumen' => $resumen], 201);
    }

    // ---------------------------------------------------------------------

    // Revisa cada fila: limpia los datos, valida el formato, busca la carrera y detecta
    // repetidos dentro del archivo y estudiantes ya registrados (duplicados).
    private function revisar(array $filas): array
    {
        $carreras = Carrera::where('activo', true)->get();
        $porNombre = [];
        foreach ($carreras as $c) {
            $porNombre[self::clave($c->nombre)] = $c;
            $porNombre[self::clave($c->codigo)] = $c;
        }

        // Datos ya registrados (tambien los estudiantes eliminados, que se conservan).
        $existentes = Estudiante::query()->get(['id', 'codigo_universitario', 'documento_identidad', 'correo_institucional', 'nombre_completo']);
        $porCodigo = $porDocumento = $porCorreo = $porNombreCompleto = [];
        foreach ($existentes as $e) {
            $porCodigo[mb_strtolower(trim((string) $e->codigo_universitario))] = $e->id;
            $doc = self::numeroDocumento((string) $e->documento_identidad);
            if ($doc !== '') {
                $porDocumento[$doc] = $e->id;
            }
            $porCorreo[mb_strtolower(trim((string) $e->correo_institucional))] = $e->id;
            $porNombreCompleto[self::normalizar((string) $e->nombre_completo)] = $e->id;
        }

        $vistos = ['codigo' => [], 'documento' => [], 'correo' => [], 'nombre' => []];
        $resultado = [];

        foreach ($filas as $fila) {
            $f = [
                'fila' => (int) $fila['fila'],
                'codigo_universitario' => self::texto($fila['codigo_universitario'] ?? ''),
                'documento_identidad' => self::texto($fila['documento_identidad'] ?? ''),
                'nombres' => self::texto($fila['nombres'] ?? ''),
                'apellidos' => self::texto($fila['apellidos'] ?? ''),
                'correo_institucional' => mb_strtolower(self::texto($fila['correo_institucional'] ?? '')),
                'carrera' => self::texto($fila['carrera'] ?? ''),
                'carrera_id' => null,
                'errores' => [],
                'duplicado' => [],
                'estudiante_existente_id' => null,
            ];
            $err = &$f['errores'];

            // Formato de cada dato (mismos mensajes que "Registrar estudiante").
            if ($f['codigo_universitario'] === '') {
                $err[] = 'El campo Código universitario es obligatorio.';
            } elseif (! preg_match('/^[0-9]+$/', $f['codigo_universitario'])) {
                $err[] = 'El código universitario solo contiene números.';
            } elseif (mb_strlen($f['codigo_universitario']) > 15) {
                $err[] = 'El campo Código universitario tiene un límite de 15 caracteres numéricos.';
            }

            if ($f['documento_identidad'] === '') {
                $err[] = 'El campo Documento de identidad es obligatorio.';
            } elseif (mb_strlen($f['documento_identidad']) > 20) {
                $err[] = 'El campo Documento de identidad tiene un límite de 20 caracteres.';
            } elseif (self::numeroDocumento($f['documento_identidad']) === '') {
                $err[] = 'El campo Documento de identidad no es válido.';
            }

            foreach (['nombres' => 'Nombres', 'apellidos' => 'Apellidos'] as $campo => $etiqueta) {
                if ($f[$campo] === '') {
                    $err[] = "El campo {$etiqueta} es obligatorio.";
                } elseif (! preg_match('/^[\pL\s]+$/u', $f[$campo])) {
                    $err[] = 'Los '.mb_strtolower($etiqueta).' solo contienen letras.';
                } elseif (mb_strlen($f[$campo]) > 50) {
                    $err[] = "El campo {$etiqueta} tiene un límite de 50 caracteres.";
                }
            }

            if ($f['correo_institucional'] === '') {
                $err[] = 'El campo Correo institucional es obligatorio.';
            } elseif (! preg_match('/^[0-9]+@est\.umss\.edu$/', $f['correo_institucional'])
                || mb_strlen($f['correo_institucional']) > 100
                || ($f['codigo_universitario'] !== '' && $f['correo_institucional'] !== mb_strtolower($f['codigo_universitario']).'@est.umss.edu')) {
                $err[] = 'El correo institucional no es válido: debe ser CódigoUniversitario@est.umss.edu.';
            }

            if ($f['carrera'] === '') {
                $err[] = 'El campo Carrera es obligatorio.';
            } elseif (! isset($porNombre[self::clave($f['carrera'])])) {
                $err[] = 'La carrera "'.$f['carrera'].'" no existe en el sistema.';
            } else {
                $f['carrera_id'] = $porNombre[self::clave($f['carrera'])]->id;
            }

            // Datos repetidos dentro del mismo archivo: es un error del Excel.
            $claves = [
                'codigo' => [mb_strtolower($f['codigo_universitario']), 'El código universitario'],
                'documento' => [self::numeroDocumento($f['documento_identidad']), 'El documento de identidad'],
                'correo' => [$f['correo_institucional'], 'El correo institucional'],
                'nombre' => [self::normalizar($f['nombres'].' '.$f['apellidos']), 'El estudiante con estos nombres y apellidos'],
            ];
            foreach ($claves as $tipo => [$valor, $texto]) {
                if ($valor === '' || $valor === ' ') {
                    continue;
                }
                if (isset($vistos[$tipo][$valor])) {
                    $err[] = "{$texto} está repetido en la fila {$vistos[$tipo][$valor]} del archivo.";
                } else {
                    $vistos[$tipo][$valor] = $f['fila'];
                }
            }

            // Estudiante ya registrado en el sistema: duplicado (central de riesgos).
            if (! $err) {
                $coincide = function (array $mapa, string $valor, string $texto) use (&$f) {
                    if ($valor !== '' && isset($mapa[$valor])) {
                        $f['duplicado'][] = $texto;
                        $f['estudiante_existente_id'] ??= $mapa[$valor];
                    }
                };
                $coincide($porCodigo, mb_strtolower($f['codigo_universitario']), 'El código universitario ya está registrado.');
                $coincide($porDocumento, self::numeroDocumento($f['documento_identidad']), 'El documento de identidad ya está registrado.');
                $coincide($porCorreo, $f['correo_institucional'], 'El correo institucional ya está registrado.');
                $coincide($porNombreCompleto, self::normalizar($f['nombres'].' '.$f['apellidos']), 'Ya existe un estudiante registrado con estos nombres y apellidos.');
            }
            unset($err);

            $f['estado'] = $f['errores'] ? 'error' : ($f['duplicado'] ? 'duplicado' : 'nuevo');
            $resultado[] = $f;
        }

        return $resultado;
    }

    private function tipoDuplicado(): int
    {
        return TipoIncidencia::firstOrCreate(
            ['codigo' => self::TIPO_DUPLICADO],
            ['descripcion' => 'Estudiante duplicado en la importación']
        )->id;
    }

    // Texto de una celda: sin espacios de mas. Los numeros de Excel llegan sin decimales.
    private static function texto(mixed $valor): string
    {
        if (is_float($valor) && floor($valor) === $valor) {
            $valor = number_format($valor, 0, '.', '');
        }

        return trim(preg_replace('/\s+/u', ' ', (string) $valor));
    }

    private static function normalizar(string $texto): string
    {
        return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $texto)));
    }

    // Para comparar carreras: sin mayusculas, sin tildes y sin espacios de mas.
    private static function clave(string $texto): string
    {
        $t = self::normalizar($texto);

        return strtr($t, ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ñ' => 'n']);
    }

    // Numero del documento sin la extension del departamento (CB, LP, SC, ...).
    private static function numeroDocumento(string $documento): string
    {
        return preg_replace('/[^0-9]/', '', $documento);
    }
}
