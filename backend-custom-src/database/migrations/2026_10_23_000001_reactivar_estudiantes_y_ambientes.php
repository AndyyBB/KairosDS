<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Los estudiantes y ambientes ya no se "desactivan": se eliminan definitivamente desde las
// pantallas "Eliminar estudiante" y "Eliminar ambiente". Los registros que quedaron
// desactivados con la version anterior se reactivan, porque ningun estudiante inactivo
// podia registrar su ingreso ni aparecer al habilitar estudiantes.
return new class extends Migration
{
    public function up(): void
    {
        DB::table('estudiantes')->where('activo', false)->update(['activo' => true]);
        DB::table('ambientes')->where('activo', false)->update(['activo' => true]);
    }

    public function down(): void
    {
        // No se puede saber que registros estaban desactivados: no se revierte.
    }
};
