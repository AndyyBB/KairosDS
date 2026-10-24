<?php

namespace App\Observers;

use App\Support\Historial;
use Illuminate\Database\Eloquent\Model;

// HU-27: registra automaticamente en el historial los registros, ediciones y
// eliminaciones de los modelos observados (ver AppServiceProvider).
class HistorialObserver
{
    public function created(Model $modelo): void
    {
        Historial::modelo($modelo, 'created');
    }

    public function updated(Model $modelo): void
    {
        Historial::modelo($modelo, 'updated');
    }

    public function deleted(Model $modelo): void
    {
        Historial::modelo($modelo, 'deleted');
    }
}
