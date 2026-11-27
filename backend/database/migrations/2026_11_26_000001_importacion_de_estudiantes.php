<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Presentacion final: "Importar lista de estudiantes" (desde Excel) reemplaza a la invitacion
// por correo (HU-41).
// - Se elimina la tabla de invitaciones.
// - Los estudiantes duplicados de una importacion quedan en la central de riesgos del examen
//   con el motivo "Registro duplicado en la importación" y una incidencia de tipo DUPLICADO.
return new class extends Migration
{
    private const MOTIVOS = [
        'No habilitado', 'No inscrito en el examen', 'no encontrado', 'ingreso duplicado',
        'No registrado en el sistema', 'Código QR no válido', 'Ya está rindiendo otro examen',
    ];

    public function up(): void
    {
        DB::statement('DROP TABLE IF EXISTS invitaciones_examen');

        $this->restriccion([...self::MOTIVOS, 'Registro duplicado en la importación']);

        DB::statement("INSERT INTO tipos_incidencia (codigo, descripcion)
            SELECT 'DUPLICADO', 'Estudiante duplicado en la importación'
            WHERE NOT EXISTS (SELECT 1 FROM tipos_incidencia WHERE codigo = 'DUPLICADO')");
    }

    public function down(): void
    {
        $this->restriccion(self::MOTIVOS, true);
        DB::statement("DELETE FROM tipos_incidencia WHERE codigo = 'DUPLICADO'
            AND NOT EXISTS (SELECT 1 FROM incidencias i WHERE i.tipo_incidencia_id = tipos_incidencia.id)");
        // La tabla de invitaciones no se vuelve a crear: la funcion fue retirada.
    }

    private function restriccion(array $motivos, bool $noValidar = false): void
    {
        $lista = implode(', ', array_map(fn ($m) => DB::getPdo()->quote($m), $motivos));
        DB::statement('ALTER TABLE intentos_ingreso DROP CONSTRAINT IF EXISTS chk_intentos_motivo');
        DB::statement("ALTER TABLE intentos_ingreso ADD CONSTRAINT chk_intentos_motivo
            CHECK (motivo_rechazo::text = ANY (ARRAY[{$lista}]::text[]))".($noValidar ? ' NOT VALID' : ''));
    }
};
