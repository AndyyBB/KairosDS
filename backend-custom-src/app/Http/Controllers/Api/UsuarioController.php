<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUsuarioRequest;
use App\Http\Requests\UpdateUsuarioRequest;
use App\Mail\CuentaCreada;
use App\Models\Role;
use App\Models\Usuario;
use App\Support\Historial;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UsuarioController extends Controller
{
    // Los usuarios eliminados (baja logica, Sprint 4) ya no aparecen.
    public function index()
    {
        return Usuario::with('rol')->whereNull('eliminado_en')->orderBy('nombre_completo')->get();
    }

    // Catalogo de roles disponibles, usado por el formulario de HU-15.
    public function roles()
    {
        return Role::orderBy('nombre')->get();
    }

    // HU-15: Registro de usuarios
    public function store(StoreUsuarioRequest $request)
    {
        $data = $request->validated();

        $usuario = Usuario::create([
            'nombres' => trim($data['nombres']),
            'apellidos' => trim($data['apellidos']),
            'correo_electronico' => $data['correo_electronico'],
            'contrasena_hash' => Hash::make($data['password']),
            'rol_id' => $data['rol_id'],
        ]);
        $usuario->load('rol');
        // Sprint 4 (observacion 17): el rol queda vigente desde ahora.
        $this->abrirPeriodoRol($usuario, (int) $usuario->rol_id, $request->user()?->id);

        // Sprint 4 (observacion 4): se avisa al usuario por correo que se creo su cuenta.
        // Si el correo no se puede enviar, la cuenta igual queda creada y se informa.
        $correoEnviado = true;
        try {
            Mail::to($usuario->correo_electronico)->send(new CuentaCreada($usuario, $request->user()?->nombre_completo));
        } catch (\Throwable $e) {
            $correoEnviado = false;
            Log::warning('No se pudo enviar el correo de cuenta creada a '.$usuario->correo_electronico.': '.$e->getMessage());
        }

        return response()->json([
            ...$usuario->toArray(),
            'correo_enviado' => $correoEnviado,
            'message' => $correoEnviado
                ? 'Usuario registrado con éxito. Se envió un correo a '.$usuario->correo_electronico.' para avisarle que se creó su cuenta.'
                : 'Usuario registrado con éxito, pero no se pudo enviar el correo de aviso. Revisa la configuración de correo del servidor.',
        ], 201);
    }

    public function show(Usuario $usuario)
    {
        return [...$usuario->load('rol')->toArray(), 'historial_roles' => $this->historialRoles($usuario)];
    }

    // HU-32 (Sprint 4, observacion 17): solo se cambian el rol, el estado y la contrasena
    // (ver UpdateUsuarioRequest). El cambio de rol se guarda por periodos (desde / hasta).
    public function update(UpdateUsuarioRequest $request, Usuario $usuario)
    {
        if ($usuario->eliminado_en) {
            return response()->json(['message' => 'El usuario fue eliminado y ya no se puede editar.'], 422);
        }

        $data = $request->validated();
        $yo = $request->user();
        $cambiaRol = array_key_exists('rol_id', $data) && (int) $data['rol_id'] !== (int) $usuario->rol_id;

        if ($cambiaRol && $yo?->id === $usuario->id) {
            return $this->errorCampo('rol_id', 'No puedes cambiar tu propio rol.');
        }
        if ($cambiaRol && $usuario->esAdministrador() && $this->adminsActivos() <= 1) {
            return $this->errorCampo('rol_id', 'No se puede quitar el rol de administrador al único administrador activo.');
        }

        // Al desactivar una cuenta se protege la propia cuenta y al ultimo administrador activo.
        if (array_key_exists('activo', $data) && ! $data['activo'] && $usuario->activo) {
            if ($yo?->id === $usuario->id) {
                return $this->errorCampo('activo', 'No puedes desactivar tu propia cuenta.');
            }
            if ($usuario->esAdministrador() && $this->adminsActivos() <= 1) {
                return $this->errorCampo('activo', 'No se puede desactivar al único administrador activo.');
            }
        }

        if (! empty($data['password'])) {
            $data['contrasena_hash'] = Hash::make($data['password']);
        }
        unset($data['password']);

        DB::transaction(function () use ($usuario, $data, $cambiaRol, $yo) {
            if ($cambiaRol) {
                $this->cerrarPeriodoRol($usuario);
                $this->abrirPeriodoRol($usuario, (int) $data['rol_id'], $yo?->id);
            }
            $usuario->update($data);
        });

        // Un usuario desactivado o con otro rol vuelve a iniciar sesion (sus permisos cambiaron).
        if ((array_key_exists('activo', $data) && ! $data['activo']) || $cambiaRol) {
            $usuario->tokens()->delete();
        }

        return [...$usuario->load('rol')->toArray(), 'historial_roles' => $this->historialRoles($usuario)];
    }

    // HU-33 (Sprint 4, observacion 18): la eliminacion es LOGICA. El usuario no se borra de la
    // base de datos: queda marcado como eliminado y NO ACTIVO, ya no puede iniciar sesion ni
    // aparece en el sistema, y se conservan los examenes, habilitaciones, ingresos e
    // incidencias que registro (y su nombre en el historial). No se puede eliminar la propia
    // cuenta ni al ultimo administrador activo.
    public function destroy(Request $request, Usuario $usuario)
    {
        if ($usuario->eliminado_en) {
            return response()->json(['message' => 'El usuario ya fue eliminado.'], 422);
        }
        if ($request->user()?->id === $usuario->id) {
            return response()->json(['message' => 'No puedes eliminar tu propia cuenta.'], 409);
        }
        if ($usuario->esAdministrador() && $usuario->activo && $this->adminsActivos() <= 1) {
            return response()->json(['message' => 'No se puede eliminar al único administrador activo.'], 409);
        }

        DB::transaction(function () use ($request, $usuario) {
            $this->cerrarPeriodoRol($usuario);
            $usuario->forceFill([
                'activo' => false,
                'eliminado_en' => now(),
                'eliminado_por' => $request->user()?->id,
            ])->saveQuietly();
            $usuario->tokens()->delete();

            // HU-27: queda en el historial como eliminacion.
            Historial::registrar(
                'Eliminar',
                'Usuarios',
                "Usuario {$usuario->nombre_completo} ({$usuario->correo_electronico}) eliminado: queda como NO ACTIVO y se conserva todo lo que registró",
                $usuario,
                ['activo' => true],
                ['activo' => false]
            );
        });

        return response()->json(['message' => 'Usuario eliminado con éxito.']);
    }

    private function adminsActivos(): int
    {
        return Usuario::where('activo', true)
            ->whereNull('eliminado_en')
            ->whereHas('rol', fn ($q) => $q->where('nombre', 'administrador'))
            ->count();
    }

    private function errorCampo(string $campo, string $mensaje)
    {
        return response()->json(['message' => $mensaje, 'errors' => [$campo => [$mensaje]]], 422);
    }

    private function abrirPeriodoRol(Usuario $usuario, int $rolId, ?int $asignadoPor): void
    {
        DB::table('usuario_rol_vigencia')->insert([
            'usuario_id' => $usuario->id,
            'rol_id' => $rolId,
            'vigente_desde' => now('UTC'),
            'asignado_por' => $asignadoPor,
            'created_at' => now('UTC'),
        ]);
    }

    private function cerrarPeriodoRol(Usuario $usuario): void
    {
        DB::table('usuario_rol_vigencia')
            ->where('usuario_id', $usuario->id)
            ->whereNull('vigente_hasta')
            ->update(['vigente_hasta' => now('UTC')]);
    }

    // Periodos del rol del usuario, del mas reciente al mas antiguo (hora de La Paz).
    private function historialRoles(Usuario $usuario): array
    {
        $tz = 'America/La_Paz';

        return DB::table('usuario_rol_vigencia as v')
            ->join('roles as r', 'r.id', '=', 'v.rol_id')
            ->leftJoin('usuarios as a', 'a.id', '=', 'v.asignado_por')
            ->where('v.usuario_id', $usuario->id)
            ->orderByDesc('v.vigente_desde')
            ->orderByDesc('v.id')
            ->get(['v.id', 'r.nombre as rol', 'v.vigente_desde', 'v.vigente_hasta', 'a.nombre_completo as asignado_por'])
            ->map(fn ($v) => [
                'id' => $v->id,
                'rol' => $v->rol,
                'desde' => Carbon::parse($v->vigente_desde, 'UTC')->setTimezone($tz)->format('d/m/Y H:i'),
                'hasta' => $v->vigente_hasta ? Carbon::parse($v->vigente_hasta, 'UTC')->setTimezone($tz)->format('d/m/Y H:i') : null,
                'asignado_por' => $v->asignado_por,
            ])
            ->all();
    }
}
