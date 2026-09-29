<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ingresos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('habilitacion_id')->unique()->constrained('habilitaciones')->restrictOnDelete();
            $table->foreignId('ambiente_id')->constrained('ambientes');
            $table->foreignId('metodo_verificacion_id')->constrained('metodos_verificacion');
            $table->timestamp('fecha_hora_ingreso')->useCurrent();
            $table->boolean('ambiente_correcto');
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
            $table->index('fecha_hora_ingreso');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ingresos');
    }
};
