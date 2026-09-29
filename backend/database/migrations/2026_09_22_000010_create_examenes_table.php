<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examenes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('materia_id')->constrained('materias')->restrictOnDelete();
            $table->foreignId('ambiente_id')->constrained('ambientes')->restrictOnDelete();
            $table->date('fecha');
            $table->time('hora_inicio');
            $table->integer('duracion_min');
            $table->string('estado', 20)->default('programado');
            $table->foreignId('creado_por')->constrained('usuarios')->restrictOnDelete();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
            $table->unique(['ambiente_id', 'fecha', 'hora_inicio']);
        });

        DB::statement("ALTER TABLE examenes ADD CONSTRAINT chk_examenes_duracion CHECK (duracion_min BETWEEN 15 AND 300)");
        DB::statement("ALTER TABLE examenes ADD CONSTRAINT chk_examenes_estado CHECK (estado IN ('programado','en curso','finalizado','cancelado'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('examenes');
    }
};
