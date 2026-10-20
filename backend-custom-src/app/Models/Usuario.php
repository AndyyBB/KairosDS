<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\PersonalAccessToken;

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

    public function esAdministrador(): bool
    {
        return $this->rol?->nombre === 'administrador';
    }

    // Permisos "modulo.accion" que el rol tiene en este momento en la base de datos.
    // El administrador siempre tiene todos.
    public function permisosCodigos(): array
    {
        if ($this->esAdministrador()) {
            return Permiso::orderBy('id')->pluck('codigo')->all();
        }

        return self::conVerImplicito(
            $this->rol
                ? $this->rol->permisos()->orderBy('permisos.id')->pluck('codigo')->all()
                : []
        );
    }

    // HU-17: "Ver" no se configura aparte: quien puede registrar, editar o eliminar
    // en un modulo tambien puede ver su lista.
    public static function conVerImplicito(array $codigos): array
    {
        foreach ($codigos as $codigo) {
            [$modulo, $accion] = array_pad(explode('.', $codigo, 2), 2, '');
            if ($accion !== 'ver' && $modulo !== '' && ! in_array("$modulo.ver", $codigos, true)) {
                $codigos[] = "$modulo.ver";
            }
        }

        return array_values($codigos);
    }

    // HU-17: los permisos se guardan en el token al iniciar sesion, de modo que un
    // cambio en el rol se aplica en el siguiente inicio de sesion del usuario.
    // (Los tokens anteriores a esta funcionalidad no tienen marca de sesion y
    // usan los permisos vigentes del rol.)
    public function permisosDeSesion(): array
    {
        $token = $this->currentAccessToken();
        $habilidades = $token instanceof PersonalAccessToken ? ($token->abilities ?? []) : [];

        if (in_array('sesion', $habilidades, true)) {
            return self::conVerImplicito(array_values(array_diff($habilidades, ['sesion'])));
        }

        return $this->permisosCodigos();
    }
}
