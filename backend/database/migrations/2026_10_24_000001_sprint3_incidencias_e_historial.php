<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Sprint 3 (HU-24, HU-25, HU-27).
// - historial_operaciones: guarda el nombre y el rol del usuario, el modulo y un detalle
//   legible de cada operacion. Si se elimina un usuario, sus operaciones se conservan (el
//   usuario_id queda vacio y se mantiene su nombre).
// - incidencias: ambiente de destino de un "Cambio de ambiente".
// - tipos_incidencia: tipos de situacion excepcional de HU-25.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('historial_operaciones', function (Blueprint $table) {
            $table->string('usuario_nombre', 150)->nullable();
            $table->string('usuario_rol', 50)->nullable();
            $table->string('modulo', 50)->nullable();
            $table->text('detalle')->nullable();
        });

        DB::unprepared(<<<'SQL'
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.conname FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
        WHERE c.conrelid = 'historial_operaciones'::regclass AND c.contype = 'f' AND a.attname = 'usuario_id'
    LOOP
        EXECUTE format('ALTER TABLE historial_operaciones DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;
ALTER TABLE historial_operaciones ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE historial_operaciones ADD CONSTRAINT historial_operaciones_usuario_id_foreign
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL;
UPDATE historial_operaciones h
SET usuario_nombre = u.nombre_completo, usuario_rol = r.nombre
FROM usuarios u LEFT JOIN roles r ON r.id = u.rol_id
WHERE u.id = h.usuario_id AND h.usuario_nombre IS NULL;
-- Registros anteriores: modulo, accion y detalle legibles.
UPDATE historial_operaciones SET modulo = CASE entidad
        WHEN 'examenes' THEN 'Exámenes' WHEN 'usuarios' THEN 'Usuarios' WHEN 'estudiantes' THEN 'Estudiantes'
        WHEN 'ambientes' THEN 'Ambientes' WHEN 'habilitaciones' THEN 'Habilitaciones' WHEN 'ingresos' THEN 'Control de ingreso'
        ELSE initcap(entidad) END
WHERE modulo IS NULL;
UPDATE historial_operaciones SET accion = CASE
        WHEN accion ILIKE 'crear%' OR accion ILIKE 'registrar%' THEN 'Registrar'
        WHEN accion ILIKE 'editar%' OR accion ILIKE 'actualizar%' THEN 'Editar'
        WHEN accion ILIKE 'eliminar%' THEN 'Eliminar'
        ELSE accion END
WHERE detalle IS NULL;
UPDATE historial_operaciones SET detalle = 'Examen de ' || (datos_nuevos->>'materia')
        || CASE WHEN datos_nuevos->>'fecha' ~ '^\d{4}-\d{2}-\d{2}' THEN ' del ' || to_char((datos_nuevos->>'fecha')::date, 'DD/MM/YYYY') ELSE '' END
WHERE detalle IS NULL AND entidad = 'examenes' AND datos_nuevos ? 'materia';
UPDATE historial_operaciones SET detalle = 'Usuario ' || (datos_nuevos->>'correo')
WHERE detalle IS NULL AND entidad = 'usuarios' AND datos_nuevos ? 'correo';
SQL);

        Schema::table('incidencias', function (Blueprint $table) {
            $table->foreignId('ambiente_destino_id')->nullable()->constrained('ambientes')->nullOnDelete();
        });

        foreach ([
            'IDENTIFICACION' => 'Problema de identificación',
            'CAMBIO_AMBIENTE' => 'Cambio de ambiente',
            'NO_HABILITADO' => 'Estudiante no habilitado',
            'PROBLEMA_SALUD' => 'Malestar o emergencia de salud',
            'OTRA' => 'Otra situación',
        ] as $codigo => $descripcion) {
            DB::table('tipos_incidencia')->updateOrInsert(['codigo' => $codigo], ['descripcion' => $descripcion]);
        }
    }

    public function down(): void
    {
        Schema::table('incidencias', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ambiente_destino_id');
        });
        Schema::table('historial_operaciones', function (Blueprint $table) {
            $table->dropColumn(['usuario_nombre', 'usuario_rol', 'modulo', 'detalle']);
        });
    }
};
