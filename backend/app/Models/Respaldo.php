<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Respaldo extends Model
{
    protected $table = 'respaldos';

    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'nombre_archivo',
        'ruta',
        'tamano_bytes',
        'estado',
        'fecha_hora',
    ];

    protected $casts = ['fecha_hora' => 'datetime'];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
