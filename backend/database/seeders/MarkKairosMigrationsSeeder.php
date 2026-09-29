<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * kairos_db ya tiene sus 22 tablas creadas directamente (no via migrate).
 * Este seeder marca las migraciones correspondientes como "ya aplicadas"
 * en la tabla migrations, para que "php artisan migrate" no intente
 * recrearlas y falle con "relation already exists".
 */
class MarkKairosMigrationsSeeder extends Seeder
{
    protected array $tablas = [
        'roles', 'permisos', 'rol_permiso', 'usuarios', 'carreras', 'estudiantes',
        'materias', 'inscripciones', 'ambientes', 'examenes', 'normas_examen',
        'motivos_inhabilitacion', 'habilitaciones', 'metodos_verificacion',
        'ingresos', 'detalles_ingreso', 'expulsiones', 'tipos_incidencia',
        'intentos_ingreso', 'incidencias', 'historial_operaciones', 'respaldos',
    ];

    public function run(): void
    {
        $batch = (int) (DB::table('migrations')->max('batch') ?? 0) + 1;
        $archivos = collect(File::files(database_path('migrations')));

        foreach ($this->tablas as $tabla) {
            $archivo = $archivos->first(
                fn ($f) => str_ends_with($f->getFilename(), "_create_{$tabla}_table.php")
            );

            if (! $archivo) {
                $this->command?->warn("No se encontro migracion para: {$tabla}");
                continue;
            }

            $nombre = pathinfo($archivo->getFilename(), PATHINFO_FILENAME);

            if (! DB::table('migrations')->where('migration', $nombre)->exists()) {
                DB::table('migrations')->insert([
                    'migration' => $nombre,
                    'batch' => $batch,
                ]);
                $this->command?->info("Marcada como aplicada: {$nombre}");
            }
        }
    }
}
