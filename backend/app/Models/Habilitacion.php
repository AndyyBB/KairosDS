<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Habilitacion extends Model
{
    protected $table = 'habilitaciones';

    protected $fillable = [
        'estudiante_id',
        'examen_id',
        'habilitado',
        'motivo_id',
        'observacion',
        'registrado_por',
    ];

    protected $casts = ['habilitado' => 'boolean'];

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Estudiante::class, 'estudiante_id');
    }

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'examen_id');
    }

    public function motivo(): BelongsTo
    {
        return $this->belongsTo(MotivoInhabilitacion::class, 'motivo_id');
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'registrado_por');
    }

    public function ingreso(): HasOne
    {
        return $this->hasOne(Ingreso::class, 'habilitacion_id');
    }
}
