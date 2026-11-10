<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Sprint 4 (observacion 1 de la licenciada): al registrar un estudiante el nombre se pide en
// dos campos, Nombres y Apellidos. La columna nombre_completo se conserva (la usan las listas,
// el control de ingreso, los reportes y el historial) y se arma sola con "Nombres Apellidos".
// Los estudiantes que ya existen se separan asi: las dos ultimas palabras son los apellidos y
// el resto los nombres (con dos palabras: una y una).
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS nombres varchar(50) NULL');
        DB::statement('ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS apellidos varchar(50) NULL');

        foreach (DB::table('estudiantes')->whereNull('nombres')->get(['id', 'nombre_completo']) as $e) {
            $palabras = preg_split('/\s+/', trim((string) $e->nombre_completo)) ?: [];
            $n = count($palabras);
            $apellidos = $n >= 3 ? array_slice($palabras, -2) : ($n === 2 ? [$palabras[1]] : []);
            $nombres = array_slice($palabras, 0, $n - count($apellidos));
            DB::table('estudiantes')->where('id', $e->id)->update([
                'nombres' => mb_substr(implode(' ', $nombres), 0, 50),
                'apellidos' => mb_substr(implode(' ', $apellidos), 0, 50),
            ]);
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE estudiantes DROP COLUMN IF EXISTS apellidos');
        DB::statement('ALTER TABLE estudiantes DROP COLUMN IF EXISTS nombres');
    }
};
