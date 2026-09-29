<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intentos_ingreso', function (Blueprint $table) {
            $table->id();
            $table->foreignId('examen_id')->constrained('examenes')->cascadeOnDelete();
            $table->foreignId('estudiante_id')->nullable()->constrained('estudiantes');
            $table->string('codigo_ingresado', 30);
            $table->string('motivo_rechazo', 50);
            $table->timestamp('fecha_hora')->useCurrent();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });

        DB::statement("ALTER TABLE intentos_ingreso ADD CONSTRAINT chk_intentos_motivo CHECK (motivo_rechazo IN ('no inscrito','no habilitado','ingreso duplicado','no encontrado'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('intentos_ingreso');
    }
};
