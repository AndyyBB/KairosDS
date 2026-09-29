<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TipoIncidencia extends Model
{
    protected $table = 'tipos_incidencia';

    protected $fillable = ['codigo', 'descripcion'];

    public function incidencias(): HasMany
    {
        return $this->hasMany(Incidencia::class, 'tipo_incidencia_id');
    }
}
