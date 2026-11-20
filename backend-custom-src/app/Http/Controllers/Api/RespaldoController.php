<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Respaldo;
use App\Support\Historial;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// HU-28: Respaldo de registros (solo el administrador).
// El respaldo se genera desde PHP (sin depender de pg_dump), asi funciona igual en el
// servidor del laboratorio, al que solo se accede por FTP. El archivo .sql contiene los
// INSERT de todos los registros, en el orden de sus llaves foraneas, para poder
// recuperarlos sobre una base creada con las migraciones del sistema.
class RespaldoController extends Controller
{
    private const TZ = 'America/La_Paz';

    // Tablas internas de Laravel que no son registros del sistema.
    private const EXCLUIDAS = [
        'migrations', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs',
        'sessions', 'password_reset_tokens', 'personal_access_tokens',
    ];

    public function generar(Request $request)
    {
        $ahora = Carbon::now(self::TZ);
        $nombre = 'kairos_respaldo_'.$ahora->format('Y-m-d_H-i-s').'.sql';
        $relativa = 'respaldos/'.$nombre;
        $carpeta = storage_path('app/respaldos');
        $ruta = $carpeta.DIRECTORY_SEPARATOR.$nombre;
        $usuario = $request->user();

        try {
            if (! is_dir($carpeta) && ! mkdir($carpeta, 0775, true) && ! is_dir($carpeta)) {
                throw new \RuntimeException('No se pudo crear la carpeta de respaldos.');
            }
            $this->escribir($ruta, $ahora, $usuario?->nombre_completo);
            $tamano = filesize($ruta) ?: 0;

            $respaldo = Respaldo::create([
                'usuario_id' => $usuario?->id,
                'nombre_archivo' => $nombre,
                'ruta' => $relativa,
                'tamano_bytes' => $tamano,
                'estado' => 'completado',
                'fecha_hora' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
            if (is_file($ruta)) {
                @unlink($ruta);
            }
            Respaldo::create([
                'usuario_id' => $usuario?->id,
                'nombre_archivo' => $nombre,
                'ruta' => $relativa,
                'tamano_bytes' => 0,
                'estado' => 'fallido',
                'fecha_hora' => now(),
            ]);
            Historial::registrar('Generar respaldo', 'Respaldos', "Respaldo {$nombre}: fallido");

            return response()->json(['message' => 'No se pudo generar el respaldo. Intente nuevamente.', 'estado' => 'FALLIDO'], 500);
        }

        Historial::registrar('Generar respaldo', 'Respaldos', "Respaldo {$nombre} ({$this->tamanoLegible($respaldo->tamano_bytes)})", $respaldo);

        return response()->json([
            'message' => 'Respaldo generado con éxito a las '.Historial::horaActual().'.',
            'respaldo' => $this->datos($respaldo->load('usuario.rol')),
        ], 201);
    }

    public function descargar(Respaldo $respaldo)
    {
        $ruta = storage_path('app/'.$respaldo->ruta);
        if ($respaldo->estado !== 'completado' || ! is_file($ruta)) {
            return response()->json(['message' => 'El archivo de respaldo no está disponible.'], 404);
        }

        return response()->download($ruta, $respaldo->nombre_archivo, ['Content-Type' => 'application/sql; charset=UTF-8']);
    }

    private function datos(Respaldo $r): array
    {
        return [
            'id' => $r->id,
            'archivo' => $r->nombre_archivo,
            'tamano' => $this->tamanoLegible((int) $r->tamano_bytes),
            'fecha_hora' => Carbon::parse($r->fecha_hora)->setTimezone(self::TZ)->format('d/m/Y H:i:s'),
            'generado_por' => $r->usuario ? $r->usuario->nombre_completo.' ('.$r->usuario->rol?->nombre.')' : '—',
            'estado' => mb_strtoupper($r->estado),
        ];
    }

    private function tamanoLegible(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 1, ',', '.').' MB';
        }

        return number_format(max($bytes, 1) / 1024, 1, ',', '.').' KB';
    }

    // ------------------------------------------------------------------ archivo .sql
    private function escribir(string $ruta, Carbon $ahora, ?string $autor): void
    {
        $f = fopen($ruta, 'w');
        if (! $f) {
            throw new \RuntimeException('No se pudo crear el archivo de respaldo.');
        }
        try {
            $pdo = DB::connection()->getPdo();
            $tablas = $this->tablasOrdenadas();

            fwrite($f, "-- Kairos Digital Systems - Sistema de Control de Ingreso a Examenes Masivos\n");
            fwrite($f, '-- Respaldo de registros generado el '.$ahora->format('d/m/Y H:i:s')." (hora de La Paz)\n");
            fwrite($f, '-- Generado por: '.($autor ?? 'sistema')."\n");
            fwrite($f, "-- Contiene los registros de todas las tablas del sistema. Las contrasenas estan cifradas.\n");
            fwrite($f, "-- Para recuperarlos: crear la base con las migraciones del sistema y ejecutar este archivo.\n\n");
            fwrite($f, "BEGIN;\n\n");

            $secuencias = [];
            foreach ($tablas as $tabla) {
                $columnas = DB::table('information_schema.columns')
                    ->where('table_schema', 'public')
                    ->where('table_name', $tabla)
                    ->where(fn ($q) => $q->whereNull('is_generated')->orWhere('is_generated', 'NEVER'))
                    ->orderBy('ordinal_position')
                    ->get(['column_name', 'column_default']);
                $nombres = $columnas->pluck('column_name')->all();
                foreach ($columnas as $c) {
                    if ($c->column_default && str_starts_with((string) $c->column_default, 'nextval(')) {
                        $secuencias[] = [$tabla, $c->column_name];
                    }
                }
                $lista = implode(', ', array_map(fn ($c) => '"'.$c.'"', $nombres));
                fwrite($f, "-- Tabla: {$tabla}\n");

                $consulta = DB::table($tabla)->select($nombres);
                $orden = in_array('id', $nombres, true) ? 'id' : $nombres[0];
                $total = 0;
                foreach ($consulta->orderBy($orden)->lazy(500, $orden) as $fila) {
                    $valores = [];
                    foreach ($nombres as $c) {
                        $v = $fila->{$c};
                        $valores[] = match (true) {
                            $v === null => 'NULL',
                            is_bool($v) => $v ? 'TRUE' : 'FALSE',
                            is_int($v), is_float($v) => (string) $v,
                            default => $pdo->quote((string) $v),
                        };
                    }
                    fwrite($f, "INSERT INTO \"{$tabla}\" ({$lista}) VALUES (".implode(', ', $valores).");\n");
                    $total++;
                }
                fwrite($f, "-- {$total} registros\n\n");
            }

            foreach ($secuencias as [$tabla, $col]) {
                fwrite($f, "SELECT setval(pg_get_serial_sequence('\"{$tabla}\"', '{$col}'), "
                    ."COALESCE((SELECT MAX(\"{$col}\") FROM \"{$tabla}\"), 1), "
                    ."(SELECT MAX(\"{$col}\") FROM \"{$tabla}\") IS NOT NULL);\n");
            }
            fwrite($f, "\nCOMMIT;\n");
        } finally {
            fclose($f);
        }
    }

    // Tablas del sistema ordenadas para que cada tabla vaya despues de las que referencia.
    private function tablasOrdenadas(): array
    {
        $tablas = DB::table('information_schema.tables')
            ->where('table_schema', 'public')
            ->where('table_type', 'BASE TABLE')
            ->whereNotIn('table_name', self::EXCLUIDAS)
            ->orderBy('table_name')
            ->pluck('table_name')
            ->all();

        $depende = array_fill_keys($tablas, []);
        $fks = DB::select("SELECT c.conrelid::regclass::text AS hija, c.confrelid::regclass::text AS padre
            FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE c.contype = 'f' AND n.nspname = 'public'");
        foreach ($fks as $fk) {
            $hija = trim($fk->hija, '"');
            $padre = trim($fk->padre, '"');
            if (isset($depende[$hija], $depende[$padre]) && $hija !== $padre) {
                $depende[$hija][] = $padre;
            }
        }

        $orden = [];
        $visitado = [];
        $visitar = function ($t) use (&$visitar, &$orden, &$visitado, $depende) {
            if (isset($visitado[$t])) {
                return;
            }
            $visitado[$t] = true;
            foreach ($depende[$t] as $p) {
                $visitar($p);
            }
            $orden[] = $t;
        };
        foreach ($tablas as $t) {
            $visitar($t);
        }

        return $orden;
    }
}
