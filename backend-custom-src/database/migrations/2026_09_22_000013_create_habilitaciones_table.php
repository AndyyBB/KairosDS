<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('habilitaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estudiante_id')->constrained('estudiantes')->restrictOnDelete();
            $table->foreignId('examen_id')->constrained('examenes')->cascadeOnDelete();
            $table->boolean('habilitado')->default(true);
            $table->foreignId('motivo_id')->nullable()->constrained('motivos_inhabilitacion');
            $table->string('observacion', 200)->nullable();
            $table->foreignId('registrado_por')->constrained('usuarios');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
            $table->unique(['estudiante_id', 'examen_id']);
            $table->index(['examen_id', 'estudiante_id']);
        });

        DB::statement('ALTER TABLE habilitaciones ADD CONSTRAINT chk_habilitaciones_motivo CHECK (habilitado = TRUE OR motivo_id IS NOT NULL)');
    }

    public function down(): void
    {
        Schema::dropIfExists('habilitaciones');
    }
};
