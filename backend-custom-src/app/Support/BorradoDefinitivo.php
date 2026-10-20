<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

// Eliminacion definitiva de registros (estudiantes, examenes...) junto con los datos que
// dependen de ellos. Debe llamarse dentro de una transaccion.
class BorradoDefinitivo
{
    // Los intentos de ingreso no se pueden modificar ni eliminar a mano (HU-26); solo se
    // borran cuando se elimina el examen o el estudiante al que pertenecen. Esta marca
    // (valida solo dentro de la transaccion actual) se lo indica al trigger de la base.
    public static function permitirBorrarIntentos(): void
    {
        DB::statement("SET LOCAL kairos.borrado_definitivo = 'on'");
    }

    // Borra los ingresos (con sus detalles y expulsiones) de las habilitaciones indicadas.
    public static function borrarIngresosDeHabilitaciones($habilitacionIds): void
    {
        $habilitacionIds = collect($habilitacionIds)->all();
        if (empty($habilitacionIds)) {
            return;
        }

        $ingresoIds = DB::table('ingresos')->whereIn('habilitacion_id', $habilitacionIds)->pluck('id')->all();
        if (! empty($ingresoIds)) {
            DB::table('expulsiones')->whereIn('ingreso_id', $ingresoIds)->delete();
            DB::table('detalles_ingreso')->whereIn('ingreso_id', $ingresoIds)->delete();
            DB::table('ingresos')->whereIn('id', $ingresoIds)->delete();
        }
    }
}
