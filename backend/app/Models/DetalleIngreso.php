<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetalleIngreso extends Model
{
    protected $table = 'detalles_ingreso';

    protected $fillable = ['ingreso_id', 'campo', 'valor'];

    public function ingreso(): BelongsTo
    {
        return $this->belongsTo(Ingreso::class, 'ingreso_id');
    }
}
