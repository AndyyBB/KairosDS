<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// HU-02: un examen puede tomarse en mas de un ambiente a la vez.
// `examenes.ambiente_id` se mantiene como ambiente principal (el primero
// seleccionado) para no romper ingresos ni el resto del sistema.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE TABLE IF NOT EXISTS examen_ambiente (
            examen_id BIGINT NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
            ambiente_id BIGINT NOT NULL REFERENCES ambientes(id) ON DELETE RESTRICT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            PRIMARY KEY (examen_id, ambiente_id)
        )');

        // Cada examen existente conserva su ambiente actual.
        DB::statement('INSERT INTO examen_ambiente (examen_id, ambiente_id)
            SELECT id, ambiente_id FROM examenes ON CONFLICT DO NOTHING');
    }

    public function down(): void
    {
        Schema::dropIfExists('examen_ambiente');
    }
};
