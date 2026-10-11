<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Materia extends Model
{
    protected $table = 'materias';

    protected $fillable = ['sigla', 'nombre', 'carrera_id', 'nivel', 'activo'];

    protected $casts = ['activo' => 'boolean'];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'carrera_id');
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class, 'materia_id');
    }

    public function examenes(): HasMany
    {
        return $this->hasMany(Examen::class, 'materia_id');
    }
}
