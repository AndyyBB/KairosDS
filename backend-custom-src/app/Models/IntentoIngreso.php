<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntentoIngreso extends Model
{
    protected $table = 'intentos_ingreso';

    protected $fillable = [
        'examen_id',
        'estudiante_id',
        'codigo_ingresado',
        'motivo_rechazo',
        'fecha_hora',
        'usuario_id',
    ];

    protected $casts = ['fecha_hora' => 'datetime'];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'examen_id');
    }

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Estudiante::class, 'estudiante_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
