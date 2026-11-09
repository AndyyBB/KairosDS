<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Sprint 4 (observacion 4 de la licenciada): el nombre de los usuarios se registra en dos
// campos, Nombres y Apellidos. La columna nombre_completo se conserva (la usan las listas,
// los reportes y el historial) y se arma sola con "Nombres Apellidos".
// Los usuarios que ya existen se separan asi: las dos ultimas palabras son los apellidos y
// el resto los nombres (si se equivoca en algun caso, se corrige desde "Editar usuario").
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombres varchar(60) NULL');
        DB::statement('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS apellidos varchar(60) NULL');

        foreach (DB::table('usuarios')->whereNull('nombres')->get(['id', 'nombre_completo']) as $u) {
            $palabras = preg_split('/\s+/', trim((string) $u->nombre_completo)) ?: [];
            $n = count($palabras);
            $apellidos = $n >= 3 ? array_slice($palabras, -2) : ($n === 2 ? [$palabras[1]] : []);
            $nombres = array_slice($palabras, 0, $n - count($apellidos));
            DB::table('usuarios')->where('id', $u->id)->update([
                'nombres' => mb_substr(implode(' ', $nombres), 0, 60),
                'apellidos' => mb_substr(implode(' ', $apellidos), 0, 60),
            ]);
        }
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE usuarios DROP COLUMN IF EXISTS apellidos');
        DB::statement('ALTER TABLE usuarios DROP COLUMN IF EXISTS nombres');
    }
};
