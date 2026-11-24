<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// HU-41: invitacion por correo para que un estudiante se inscriba en un examen.
class InvitacionExamen extends Model
{
    protected $table = 'invitaciones_examen';

    protected $fillable = ['examen_id', 'estudiante_id', 'token', 'enviada_por', 'enviada_en', 'aceptada_en'];

    protected $casts = [
        'enviada_en' => 'datetime',
        'aceptada_en' => 'datetime',
    ];

    // El codigo de la invitacion nunca se devuelve en las respuestas de la API.
    protected $hidden = ['token'];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'examen_id');
    }

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Estudiante::class, 'estudiante_id');
    }

    public function remitente(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'enviada_por');
    }
}
