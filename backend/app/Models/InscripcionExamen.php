<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Estudiante inscrito en un examen concreto (tabla inscripciones_examen).
class InscripcionExamen extends Model
{
    protected $table = 'inscripciones_examen';

    protected $fillable = ['examen_id', 'estudiante_id', 'registrado_por'];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'examen_id');
    }

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Estudiante::class, 'estudiante_id');
    }
}
