<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MetodoVerificacion extends Model
{
    protected $table = 'metodos_verificacion';

    protected $fillable = ['codigo', 'descripcion'];

    public function ingresos(): HasMany
    {
        return $this->hasMany(Ingreso::class, 'metodo_verificacion_id');
    }
}
