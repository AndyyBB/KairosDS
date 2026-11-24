<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// HU-41 (Sprint 4): invitacion por correo para inscribirse en un examen.
// El administrador o el docente envia la invitacion al correo institucional del estudiante;
// el correo trae el boton "Aceptar invitación" con un codigo unico (token). Al aceptarla, el
// estudiante queda inscrito en el examen. Se guarda una invitacion por estudiante y examen
// (si se reenvia, se genera un codigo nuevo y el anterior deja de servir).
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE TABLE IF NOT EXISTS invitaciones_examen (
            id bigserial PRIMARY KEY,
            examen_id bigint NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
            estudiante_id bigint NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
            token varchar(64) NOT NULL,
            enviada_por bigint NULL REFERENCES usuarios(id) ON DELETE SET NULL,
            enviada_en timestamp NOT NULL,
            aceptada_en timestamp NULL,
            created_at timestamp NULL,
            updated_at timestamp NULL,
            CONSTRAINT invitaciones_examen_unica UNIQUE (examen_id, estudiante_id),
            CONSTRAINT invitaciones_examen_token UNIQUE (token)
        )');
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS invitaciones_examen');
    }
};
