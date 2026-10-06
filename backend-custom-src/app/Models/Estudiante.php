<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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

    // Un estudiante puede estar en mas de una carrera. `carrera_id` guarda la
    // carrera principal (la primera) y la tabla estudiante_carrera todas.
    public function carreras(): BelongsToMany
    {
        return $this->belongsToMany(Carrera::class, 'estudiante_carrera', 'estudiante_id', 'carrera_id')
            ->orderBy('carreras.nombre');
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
