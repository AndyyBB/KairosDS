<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HistorialOperacion;
use App\Models\Usuario;
use App\Support\Formato;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// HU-27: Historial de operaciones del sistema (solo el administrador, ver routes/api.php).
// Los registros solo se consultan: no hay rutas para modificarlos ni eliminarlos.
class HistorialController extends Controller
{
    private const MSG_RANGO = 'La fecha Desde no puede ser posterior a la fecha Hasta.';

    public function index(Request $request)
    {
        $data = $request->validate([
            'usuario_id' => ['nullable', 'integer'],
            'modulo' => ['nullable', 'string', 'max:50'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date'],
        ]);
        if (! empty($data['desde']) && ! empty($data['hasta']) && $data['desde'] > $data['hasta']) {
            return response()->json(['message' => self::MSG_RANGO, 'errors' => ['desde' => [self::MSG_RANGO]]], 422);
        }
        [$ini, $fin] = Formato::rangoDias($data['desde'] ?? null, $data['hasta'] ?? null);

        $pagina = HistorialOperacion::with('usuario.rol')
            ->when($data['usuario_id'] ?? null, fn ($q, $v) => $q->where('usuario_id', $v))
            ->when($data['modulo'] ?? null, fn ($q, $v) => $q->whereRaw('COALESCE(modulo, entidad) = ?', [$v]))
            ->when($ini, fn ($q) => $q->where('fecha_hora', '>=', $ini))
            ->when($fin, fn ($q) => $q->where('fecha_hora', '<=', $fin))
            ->orderByDesc('fecha_hora')
            ->orderByDesc('id')
            ->paginate(20);

        $pagina->getCollection()->transform(fn (HistorialOperacion $h) => [
            'id' => $h->id,
            'fecha' => Formato::fecha($h->fecha_hora),
            'hora' => Formato::hora($h->fecha_hora),
            'usuario' => $h->usuario_nombre ?? $h->usuario?->nombre_completo ?? 'Usuario eliminado',
            'rol' => $h->usuario_rol ?? $h->usuario?->rol?->nombre,
            'modulo' => $h->modulo ?? $h->entidad,
            'accion' => $h->accion,
            'detalle' => $h->detalle ?? $this->resumen($h),
        ]);

        return $pagina;
    }

    // Opciones de los filtros Usuario y Modulo.
    public function filtros()
    {
        return [
            'usuarios' => Usuario::orderBy('nombre_completo')->get(['id', 'nombre_completo']),
            'modulos' => DB::table('historial_operaciones')
                ->selectRaw('DISTINCT COALESCE(modulo, entidad) AS modulo')
                ->orderBy('modulo')
                ->pluck('modulo')
                ->filter()
                ->values(),
        ];
    }

    // Registros anteriores al Sprint 3 (sin detalle): se resumen sus datos.
    private function resumen(HistorialOperacion $h): string
    {
        $datos = $h->datos_nuevos ?? $h->datos_anteriores ?? [];
        $partes = collect($datos)->filter(fn ($v) => is_scalar($v))->map(fn ($v, $k) => "$k: $v")->take(4)->implode(', ');

        return trim($h->entidad.($h->entidad_id ? " #{$h->entidad_id}" : '').($partes ? " — $partes" : ''));
    }
}
