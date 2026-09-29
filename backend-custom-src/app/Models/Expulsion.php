<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expulsion extends Model
{
    protected $table = 'expulsiones';

    protected $fillable = ['ingreso_id', 'motivo', 'fecha_hora', 'usuario_id'];

    protected $casts = ['fecha_hora' => 'datetime'];

    public function ingreso(): BelongsTo
    {
        return $this->belongsTo(Ingreso::class, 'ingreso_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}
