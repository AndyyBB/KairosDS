<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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

    // Se envia siempre junto al examen para que el estado mostrado coincida
    // con la fecha y hora reales (el campo `estado` guardado solo se usa para
    // distinguir los cancelados).
    protected $appends = ['estado_actual'];

    // programado / en curso / finalizado segun la hora actual (La Paz);
    // cancelado se respeta tal cual.
    protected function estadoActual(): Attribute
    {
        return Attribute::get(function () {
            if ($this->estado === 'cancelado') {
                return 'cancelado';
            }
            if (! $this->fecha || ! $this->hora_inicio) {
                return $this->estado;
            }

            $tz = 'America/La_Paz';
            $inicio = Carbon::parse($this->fecha->format('Y-m-d').' '.substr($this->hora_inicio, 0, 5), $tz);
            $fin = $inicio->copy()->addMinutes((int) $this->duracion_min);
            $ahora = Carbon::now($tz);

            if ($ahora->lt($inicio)) {
                return 'programado';
            }

            return $ahora->lt($fin) ? 'en curso' : 'finalizado';
        });
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class, 'materia_id');
    }

    public function ambiente(): BelongsTo
    {
        return $this->belongsTo(Ambiente::class, 'ambiente_id');
    }

    // HU-02: todos los ambientes donde se toma el examen.
    public function ambientes(): BelongsToMany
    {
        return $this->belongsToMany(Ambiente::class, 'examen_ambiente', 'examen_id', 'ambiente_id')
            ->orderBy('ambientes.nombre');
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
