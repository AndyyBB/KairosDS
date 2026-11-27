<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Presentacion final: al registrar una expulsion (HU-24) o una situacion excepcional (HU-25),
// tambien queda automaticamente en la central de riesgos del examen ("Expulsión del examen" /
// "Situación excepcional"), con su incidencia.
return new class extends Migration
{
    private const MOTIVOS = [
        'No habilitado', 'No inscrito en el examen', 'no encontrado', 'ingreso duplicado',
        'No registrado en el sistema', 'Código QR no válido', 'Ya está rindiendo otro examen',
        'Registro duplicado en la importación', 'Ingreso ya registrado', 'Estudiante expulsado',
        'Situación excepcional registrada',
    ];

    public function up(): void
    {
        $this->restriccion([...self::MOTIVOS, 'Expulsión del examen', 'Situación excepcional']);
        DB::table('tipos_incidencia')->updateOrInsert(['codigo' => 'EXPULSION'], ['descripcion' => 'Expulsión del examen']);
    }

    public function down(): void
    {
        $this->restriccion(self::MOTIVOS, true);
        DB::table('tipos_incidencia')->where('codigo', 'EXPULSION')
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
