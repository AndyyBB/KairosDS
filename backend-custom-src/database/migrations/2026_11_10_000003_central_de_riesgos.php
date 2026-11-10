<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Sprint 4 (observacion 9 de la licenciada): CENTRAL DE RIESGOS en el control de ingreso.
// Todo intento de ingreso que no corresponde queda registrado, tambien cuando el codigo o
// documento NO pertenece a ningun estudiante registrado, cuando el QR no es valido o cuando
// el estudiante ya esta rindiendo otro examen. Desde la misma pantalla se puede registrar en
// ese momento una incidencia vinculada al intento (incidencias.intento_id).
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE intentos_ingreso DROP CONSTRAINT IF EXISTS chk_intentos_motivo');
        DB::statement("ALTER TABLE intentos_ingreso ADD CONSTRAINT chk_intentos_motivo CHECK (motivo_rechazo::text = ANY (ARRAY[
            'No habilitado', 'No inscrito en el examen', 'no encontrado', 'ingreso duplicado',
            'No registrado en el sistema', 'Código QR no válido', 'Ya está rindiendo otro examen'
        ]::text[]))");

        DB::statement('ALTER TABLE incidencias ADD COLUMN IF NOT EXISTS intento_id bigint NULL REFERENCES intentos_ingreso(id)');
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS incidencias_intento_unico ON incidencias (intento_id) WHERE intento_id IS NOT NULL');

        DB::statement("INSERT INTO tipos_incidencia (codigo, descripcion)
            SELECT 'INTENTO_INDEBIDO', 'Intento de ingreso indebido'
            WHERE NOT EXISTS (SELECT 1 FROM tipos_incidencia WHERE codigo = 'INTENTO_INDEBIDO')");
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS incidencias_intento_unico');
        DB::statement('ALTER TABLE incidencias DROP COLUMN IF EXISTS intento_id');
        DB::statement("DELETE FROM tipos_incidencia WHERE codigo = 'INTENTO_INDEBIDO'
            AND NOT EXISTS (SELECT 1 FROM incidencias i WHERE i.tipo_incidencia_id = tipos_incidencia.id)");
        DB::statement('ALTER TABLE intentos_ingreso DROP CONSTRAINT IF EXISTS chk_intentos_motivo');
        DB::statement("ALTER TABLE intentos_ingreso ADD CONSTRAINT chk_intentos_motivo CHECK (motivo_rechazo::text = ANY (ARRAY[
            'No habilitado', 'No inscrito en el examen', 'no encontrado', 'ingreso duplicado'
        ]::text[])) NOT VALID");
    }
};
