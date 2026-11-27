<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Presentacion final: si se vuelve a verificar a un estudiante que ya ingreso y tiene una
// situacion excepcional registrada en el examen (por ejemplo, malestar o emergencia de salud),
// el intento queda en la central de riesgos con el motivo "Situación excepcional registrada".
return new class extends Migration
{
    private const MOTIVOS = [
        'No habilitado', 'No inscrito en el examen', 'no encontrado', 'ingreso duplicado',
        'No registrado en el sistema', 'Código QR no válido', 'Ya está rindiendo otro examen',
        'Registro duplicado en la importación', 'Ingreso ya registrado', 'Estudiante expulsado',
    ];

    public function up(): void
    {
        $this->restriccion([...self::MOTIVOS, 'Situación excepcional registrada']);
    }

    public function down(): void
    {
        $this->restriccion(self::MOTIVOS, true);
    }

    private function restriccion(array $motivos, bool $noValidar = false): void
    {
        $lista = implode(', ', array_map(fn ($m) => DB::getPdo()->quote($m), $motivos));
        DB::statement('ALTER TABLE intentos_ingreso DROP CONSTRAINT IF EXISTS chk_intentos_motivo');
        DB::statement("ALTER TABLE intentos_ingreso ADD CONSTRAINT chk_intentos_motivo
            CHECK (motivo_rechazo::text = ANY (ARRAY[{$lista}]::text[]))".($noValidar ? ' NOT VALID' : ''));
    }
};
