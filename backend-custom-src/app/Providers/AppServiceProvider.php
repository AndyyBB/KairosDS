<?php

namespace App\Providers;

use App\Models\Ambiente;
use App\Models\Estudiante;
use App\Models\Examen;
use App\Models\Expulsion;
use App\Models\Habilitacion;
use App\Models\Incidencia;
use App\Models\Ingreso;
use App\Models\IntentoIngreso;
use App\Models\Usuario;
use App\Observers\HistorialObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // HU-27: registros, ediciones y eliminaciones que quedan en el historial de operaciones.
        foreach ([Estudiante::class, Ambiente::class, Examen::class, Usuario::class, Habilitacion::class,
            Ingreso::class, IntentoIngreso::class, Expulsion::class, Incidencia::class] as $modelo) {
            $modelo::observe(HistorialObserver::class);
        }
    }
}
