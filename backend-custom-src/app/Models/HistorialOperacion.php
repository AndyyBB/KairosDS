<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialOperacion extends Model
{
    protected $table = 'historial_operaciones';

    public $timestamps = false;

    protected $fillable = [
        'usuario_id',
        'usuario_nombre',
        'usuario_rol',
        'modulo',
        'detalle',
        'accion',
        'entidad',
        'entidad_id',
        'datos_anteriores',
        'datos_nuevos',
        'direccion_ip',
        'fecha_hora',
    ];

    protected $casts = [
        'datos_anteriores' => 'array',
        'datos_nuevos' => 'array',
        'fecha_hora' => 'datetime',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
