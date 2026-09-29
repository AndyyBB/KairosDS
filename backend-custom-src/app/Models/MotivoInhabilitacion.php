<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MotivoInhabilitacion extends Model
{
    protected $table = 'motivos_inhabilitacion';

    protected $fillable = ['codigo', 'descripcion', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function habilitaciones(): HasMany
    {
        return $this->hasMany(Habilitacion::class, 'motivo_id');
    }
}
