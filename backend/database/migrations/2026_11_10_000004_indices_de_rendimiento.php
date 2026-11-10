<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Hito 5 (Sprint 4): ajustes de rendimiento. Indices para las consultas mas usadas durante un
// examen masivo (ver pruebas/rendimiento/README.md).
return new class extends Migration
{
    public function up(): void
    {
        // Control de ingreso: verificar por codigo (sin distinguir mayusculas) y por documento
        // con o sin la extension del departamento ("5901346" o "5901346 CB").
        DB::statement('CREATE INDEX IF NOT EXISTS idx_estudiantes_codigo_mayus ON estudiantes (upper(codigo_universitario))');
        DB::statement("CREATE INDEX IF NOT EXISTS idx_estudiantes_documento_normalizado
            ON estudiantes ((regexp_replace(upper(documento_identidad), '[^A-Z0-9]', '', 'g')))");
        // Examenes del dia y filtros por fecha; alerta de examen duplicado (asignatura + fecha).
        DB::statement('CREATE INDEX IF NOT EXISTS idx_examenes_fecha_hora ON examenes (fecha, hora_inicio)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_examenes_materia_fecha ON examenes (materia_id, fecha)');
        // Central de riesgos: antecedentes de un codigo o documento.
        DB::statement('CREATE INDEX IF NOT EXISTS idx_intentos_codigo ON intentos_ingreso (codigo_ingresado)');
        // Ingresos de un examen (ultimos ingresos, reportes).
        DB::statement('CREATE INDEX IF NOT EXISTS idx_habilitaciones_examen ON habilitaciones (examen_id, habilitado)');
    }

    public function down(): void
    {
        foreach (['idx_estudiantes_codigo_mayus', 'idx_estudiantes_documento_normalizado', 'idx_examenes_fecha_hora',
            'idx_examenes_materia_fecha', 'idx_intentos_codigo', 'idx_habilitaciones_examen'] as $indice) {
            DB::statement("DROP INDEX IF EXISTS $indice");
        }
    }
};
