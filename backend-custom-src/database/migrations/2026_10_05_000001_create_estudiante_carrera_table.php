<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// HU-01: un mismo estudiante puede pertenecer a mas de una carrera.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE TABLE IF NOT EXISTS estudiante_carrera (
            estudiante_id BIGINT NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
            carrera_id BIGINT NOT NULL REFERENCES carreras(id) ON DELETE RESTRICT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            PRIMARY KEY (estudiante_id, carrera_id)
        )');

        // Cada estudiante existente conserva su carrera actual.
        DB::statement('INSERT INTO estudiante_carrera (estudiante_id, carrera_id)
            SELECT id, carrera_id FROM estudiantes ON CONFLICT DO NOTHING');
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiante_carrera');
    }
};
