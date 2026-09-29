<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ambiente extends Model
{
    protected $table = 'ambientes';

    protected $fillable = ['nombre', 'capacidad_maxima', 'ubicacion', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function examenes(): HasMany
    {
        return $this->hasMany(Examen::class, 'ambiente_id');
    }
}
