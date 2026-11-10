<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $table = 'roles';

    protected $fillable = ['nombre', 'descripcion'];

    public function usuarios(): HasMany
    {
        return $this->hasMany(Usuario::class, 'rol_id');
    }

    public function permisos(): BelongsToMany
    {
        return $this->belongsToMany(Permiso::class, 'rol_permiso', 'rol_id', 'permiso_id');
    }

    // Sprint 4 (observacion de la licenciada): cada permiso del rol tiene una fecha de
    // inicio y, opcionalmente, una fecha de fin (tabla rol_permiso_vigencia). Un permiso
    // sin ningun periodo registrado se considera vigente sin limite de tiempo.
    //
    // Permisos que el rol tiene asignados y que todavia no vencieron (incluye los que
    // empiezan mas adelante).
    public function permisosAsignados(): BelongsToMany
    {
        return $this->permisosConPeriodo(false);
    }

    // Permisos que el rol puede usar en este momento (ya iniciaron y no vencieron).
    public function permisosVigentes(): BelongsToMany
    {
        return $this->permisosConPeriodo(true);
    }

    private function permisosConPeriodo(bool $yaIniciado): BelongsToMany
    {
        $ahora = now()->utc()->format('Y-m-d H:i:s');
        $periodo = 'FROM rol_permiso_vigencia v WHERE v.rol_id = rol_permiso.rol_id AND v.permiso_id = rol_permiso.permiso_id';

        return $this->permisos()->where(function ($q) use ($ahora, $yaIniciado, $periodo) {
            $q->whereRaw("NOT EXISTS (SELECT 1 $periodo)")
                ->orWhereRaw(
                    "EXISTS (SELECT 1 $periodo AND (v.vigente_hasta IS NULL OR v.vigente_hasta > ?)"
                    .($yaIniciado ? ' AND v.vigente_desde <= ?' : '').')',
                    $yaIniciado ? [$ahora, $ahora] : [$ahora]
                );
        });
    }
}
