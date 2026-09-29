<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ambientes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 50)->unique();
            $table->integer('capacidad_maxima');
            $table->string('ubicacion', 100);
            $table->boolean('activo')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });

        DB::statement('ALTER TABLE ambientes ADD CONSTRAINT chk_ambientes_capacidad CHECK (capacidad_maxima > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('ambientes');
    }
};
