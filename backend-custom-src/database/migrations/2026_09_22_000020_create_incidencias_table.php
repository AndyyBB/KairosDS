<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incidencias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('examen_id')->constrained('examenes')->cascadeOnDelete();
            $table->foreignId('estudiante_id')->nullable()->constrained('estudiantes');
            $table->foreignId('tipo_incidencia_id')->constrained('tipos_incidencia');
            $table->text('descripcion');
            $table->timestamp('fecha_hora')->useCurrent();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidencias');
    }
};
