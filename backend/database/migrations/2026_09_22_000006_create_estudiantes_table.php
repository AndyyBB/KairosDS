<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estudiantes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_universitario', 15)->unique();
            $table->string('documento_identidad', 20)->unique();
            $table->string('nombre_completo', 100);
            $table->string('correo_institucional', 100)->unique();
            $table->foreignId('carrera_id')->constrained('carreras')->restrictOnDelete();
            $table->boolean('activo')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estudiantes');
    }
};
