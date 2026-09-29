<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Examen extends Model
{
    protected $table = 'examenes';

    protected $fillable = [
        'materia_id',
        'ambiente_id',
        'fecha',
        'hora_inicio',
        'duracion_min',
        'estado',
        'creado_por',
    ];

    protected $casts = ['fecha' => 'date'];

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function ambiente(): BelongsTo
    {
        return $this->belongsTo(Ambiente::class, 'ambiente_id');
    }

    public function creador(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'creado_por');
    }

    public function normas(): HasMany
    {
        return $this->hasMany(NormaExamen::class, 'examen_id');
    }

    public function habilitaciones(): HasMany
    {
        return $this->hasMany(Habilitacion::class, 'examen_id');
    }

    public function intentosIngreso(): HasMany
    {
        return $this->hasMany(IntentoIngreso::class, 'examen_id');
    }

    public function incidencias(): HasMany
    {
        return $this->hasMany(Incidencia::class, 'examen_id');
    }
}
