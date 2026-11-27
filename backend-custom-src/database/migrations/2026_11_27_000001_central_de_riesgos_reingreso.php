<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Presentacion final (observacion de la licenciada en Control de ingreso): si se vuelve a
// verificar a un estudiante que ya registro su ingreso o que fue expulsado del examen, el
// intento queda en la central de riesgos ("Ingreso ya registrado" / "Estudiante expulsado")
// y se puede registrar su incidencia en ese momento.
return new class extends Migration
{
    private const MOTIVOS = [
        'No habilitado', 'No inscrito en el examen', 'no encontrado', 'ingreso duplicado',
        'No registrado en el sistema', 'Código QR no válido', 'Ya está rindiendo otro examen',
        'Registro duplicado en la importación',
    ];

    private const NUEVOS = ['Ingreso ya registrado', 'Estudiante expulsado'];

    private const TIPOS = [
        'INGRESO_REPETIDO' => 'Intento de ingreso repetido',
        'EXPULSADO' => 'Intento de ingreso de un estudiante expulsado',
    ];

    public function up(): void
    {
        $this->restriccion([...self::MOTIVOS, ...self::NUEVOS]);
        foreach (self::TIPOS as $codigo => $descripcion) {
            DB::table('tipos_incidencia')->updateOrInsert(['codigo' => $codigo], ['descripcion' => $descripcion]);
        }
    }

    public function down(): void
    {
        $this->restriccion(self::MOTIVOS, true);
        DB::table('tipos_incidencia')
            ->whereIn('codigo', array_keys(self::TIPOS))
            ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('incidencias')->whereColumn('incidencias.tipo_incidencia_id', 'tipos_incidencia.id'))
            ->delete();
    }

    private function restriccion(array $motivos, bool $noValidar = false): void
    {
        $lista = implode(', ', array_map(fn ($m) => DB::getPdo()->quote($m), $motivos));
        DB::statement('ALTER TABLE intentos_ingreso DROP CONSTRAINT IF EXISTS chk_intentos_motivo');
        DB::statement("ALTER TABLE intentos_ingreso ADD CONSTRAINT chk_intentos_motivo
            CHECK (motivo_rechazo::text = ANY (ARRAY[{$lista}]::text[]))".($noValidar ? ' NOT VALID' : ''));
    }
};
