<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('respaldos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
            $table->string('nombre_archivo', 150);
            $table->string('ruta', 255);
            $table->bigInteger('tamano_bytes');
            $table->string('estado', 20);
            $table->timestamp('fecha_hora')->useCurrent();
        });

        DB::statement("ALTER TABLE respaldos ADD CONSTRAINT chk_respaldos_estado CHECK (estado IN ('completado','fallido','en proceso'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('respaldos');
    }
};
