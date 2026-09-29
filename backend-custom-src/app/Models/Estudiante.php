<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Estudiante extends Model
{
    protected $table = 'estudiantes';

    protected $fillable = [
        'codigo_universitario',
        'documento_identidad',
        'nombre_completo',
        'correo_institucional',
        'carrera_id',
        'activo',
    ];

    protected $casts = ['activo' => 'boolean'];

    public function carrera(): BelongsTo
    {
        return $this->belongsTo(Carrera::class, 'carrera_id');
    }

    public function inscripciones(): HasMany
    {
        return $this->hasMany(Inscripcion::class, 'estudiante_id');
    }

    public function habilitaciones(): HasMany
    {
        return $this->hasMany(Habilitacion::class, 'estudiante_id');
    }
}
