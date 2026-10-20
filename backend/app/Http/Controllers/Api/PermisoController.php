<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permiso;
use App\Models\Role;
use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// HU-17: configuracion de permisos por rol (modulo x accion).
class PermisoController extends Controller
{
    private const MODULOS = [
        'estudiantes' => 'Estudiantes',
        'ambientes' => 'Ambientes',
        'examenes' => 'Examenes',
        'habilitaciones' => 'Habilitaciones',
        'control_ingreso' => 'Control de ingreso',
        'usuarios' => 'Usuarios',
    ];

    // "Ver" no se configura: queda habilitado al marcar Registrar, Editar o Eliminar.
    // (Reportes aun no tiene pantallas, por eso no aparece en la tabla y sus permisos se conservan.)
    private const ACCIONES = ['registrar', 'editar', 'eliminar'];

    // Roles en el orden del mockup: Administrador, Docente, Personal de control de ingreso.
    public function roles()
    {
        $orden = ['administrador' => 1, 'docente' => 2, 'personal de control de ingreso' => 3];

        return Role::all()
            ->sortBy(fn (Role $r) => $orden[$r->nombre] ?? 99)
            ->values();
    }

    // HU-17 (2, 3, 4): tabla de modulos y acciones del rol seleccionado.
    public function show(Role $rol)
    {
        $esAdmin = $rol->nombre === 'administrador';
        $activos = $esAdmin
            ? Permiso::pluck('codigo')->all()
            : $rol->permisos()->pluck('codigo')->all();

        $modulos = [];
        foreach (self::MODULOS as $codigo => $etiqueta) {
            $fila = ['modulo' => $codigo, 'etiqueta' => $etiqueta];
            foreach (self::ACCIONES as $accion) {
                $fila[$accion] = in_array("$codigo.$accion", $activos, true);
            }
            $modulos[] = $fila;
        }

        return response()->json([
            'rol' => ['id' => $rol->id, 'nombre' => $rol->nombre],
            // El rol Administrador tiene todos los permisos y no se puede modificar.
            'bloqueado' => $esAdmin,
            'modulos' => $modulos,
        ]);
    }

    // HU-17 (5, 6): guarda los permisos del rol seleccionado.
    public function update(Request $request, Role $rol)
    {
        if ($rol->nombre === 'administrador') {
            return response()->json([
                'message' => 'El rol Administrador tiene todos los permisos y no se puede modificar.',
            ], 422);
        }

        $codigos = Permiso::pluck('codigo')->all();

        $data = $request->validate([
            'permisos' => ['present', 'array'],
            'permisos.*' => ['string', Rule::in($codigos)],
        ]);

        // Se ignora cualquier "ver" enviado y se calcula a partir de las demas acciones;
        // los permisos de modulos que no estan en la tabla (Reportes) se conservan.
        $enTabla = array_keys(self::MODULOS);
        $marcados = array_values(array_filter($data['permisos'], function ($codigo) use ($enTabla) {
            [$modulo, $accion] = explode('.', $codigo, 2);

            return in_array($modulo, $enTabla, true) && $accion !== 'ver';
        }));
        $fuera = $rol->permisos()->pluck('codigo')->filter(
            fn ($codigo) => ! in_array(explode('.', $codigo, 2)[0], $enTabla, true)
        )->all();

        $codigosFinales = array_unique(array_merge(Usuario::conVerImplicito($marcados), $fuera));
        $ids = Permiso::whereIn('codigo', $codigosFinales)->pluck('id')->all();
        $rol->permisos()->sync($ids);

        return response()->json(['message' => 'Permisos actualizados con éxito.']);
    }
}
