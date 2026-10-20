<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Eliminacion definitiva de examenes y estudiantes: los intentos de ingreso siguen sin
// poder modificarse ni eliminarse a mano (HU-26), pero se borran cuando se elimina el
// examen o el estudiante al que pertenecen (la aplicacion activa la marca
// kairos.borrado_definitivo solo dentro de esa transaccion).
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION bloquear_cambios_intentos() RETURNS trigger AS $fn$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('kairos.borrado_definitivo', true) = 'on' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Los intentos registrados no se pueden modificar ni eliminar.';
END;
$fn$ LANGUAGE plpgsql;
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION bloquear_cambios_intentos() RETURNS trigger AS $fn$
BEGIN
    RAISE EXCEPTION 'Los intentos registrados no se pueden modificar ni eliminar.';
END;
$fn$ LANGUAGE plpgsql;
SQL);
    }
};
