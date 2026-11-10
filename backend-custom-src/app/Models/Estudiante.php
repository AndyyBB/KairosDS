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
    // carrera principal (la primera) y la tabla estudiante_carrera todas, con su periodo
    // de vigencia. `carreras` son solo las VIGENTES (sin fecha_fin).
    public function carreras(): BelongsToMany
    {
        return $this->belongsToMany(Carrera::class, 'estudiante_carrera', 'estudiante_id', 'carrera_id')
            ->wherePivotNull('fecha_fin')
            ->withPivot('fecha_inicio')
            ->orderBy('carreras.nombre');
    }

    // Sprint 4: historial completo de carreras (vigentes y terminadas) con su periodo.
    public function historialCarreras(): BelongsToMany
    {
        return $this->belongsToMany(Carrera::class, 'estudiante_carrera', 'estudiante_id', 'carrera_id')
            ->withPivot('id', 'fecha_inicio', 'fecha_fin')
            ->orderByPivot('fecha_inicio')
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
