<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Ingreso extends Model
{
    protected $table = 'ingresos';

    protected $fillable = [
        'habilitacion_id',
        'ambiente_id',
        'metodo_verificacion_id',
        'fecha_hora_ingreso',
        'ambiente_correcto',
        'usuario_id',
    ];

    protected $casts = [
        'fecha_hora_ingreso' => 'datetime',
        'ambiente_correcto' => 'boolean',
    ];

    public function habilitacion(): BelongsTo
    {
        return $this->belongsTo(Habilitacion::class, 'habilitacion_id');
    }

    public function ambiente(): BelongsTo
    {
        return $this->belongsTo(Ambiente::class, 'ambiente_id');
    }

    public function metodoVerificacion(): BelongsTo
    {
        return $this->belongsTo(MetodoVerificacion::class, 'metodo_verificacion_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleIngreso::class, 'ingreso_id');
    }

    public function expulsion(): HasOne
    {
        return $this->hasOne(Expulsion::class, 'ingreso_id');
    }
}
