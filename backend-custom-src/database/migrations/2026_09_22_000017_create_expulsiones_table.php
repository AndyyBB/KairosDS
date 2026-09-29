<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expulsiones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ingreso_id')->unique()->constrained('ingresos')->restrictOnDelete();
            $table->text('motivo');
            $table->timestamp('fecha_hora')->useCurrent();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expulsiones');
    }
};
