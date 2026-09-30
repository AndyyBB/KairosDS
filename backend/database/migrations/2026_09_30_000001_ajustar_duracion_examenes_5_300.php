<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// HU-02: "La duración está entre 5 y 300 minutos."
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE examenes DROP CONSTRAINT IF EXISTS examenes_duracion_min_check');
        DB::statement('ALTER TABLE examenes DROP CONSTRAINT IF EXISTS chk_examenes_duracion');
        DB::statement('ALTER TABLE examenes ADD CONSTRAINT chk_examenes_duracion CHECK (duracion_min BETWEEN 5 AND 300)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE examenes DROP CONSTRAINT IF EXISTS chk_examenes_duracion');
        DB::statement('ALTER TABLE examenes ADD CONSTRAINT chk_examenes_duracion CHECK (duracion_min BETWEEN 15 AND 300)');
    }
};
