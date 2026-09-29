<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'usuarios';

    protected $fillable = [
        'nombre_completo',
        'correo_electronico',
        'contrasena_hash',
        'rol_id',
        'intentos_fallidos',
        'bloqueado_hasta',
        'ultimo_acceso',
        'activo',
    ];

    protected $hidden = ['contrasena_hash'];

    protected $casts = [
        'bloqueado_hasta' => 'datetime',
        'ultimo_acceso' => 'datetime',
        'activo' => 'boolean',
    ];

    // Laravel espera el campo "password" para Auth; lo mapeamos a contrasena_hash.
    public function getAuthPassword()
    {
        return $this->contrasena_hash;
    }

    public function getEmailForPasswordReset()
    {
        return $this->correo_electronico;
    }

    public function rol(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }
}
