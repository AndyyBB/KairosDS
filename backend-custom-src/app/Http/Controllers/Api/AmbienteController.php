<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Http\Requests\StoreAmbienteRequest;
use App\Http\Requests\UpdateAmbienteRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AmbienteController extends Controller
{
    // HU-03: Registro de ambientes
    public function index(Request $request)
    {
        return Ambiente::when($request->boolean('solo_activos', true), fn ($q) => $q->where('activo', true))
            ->orderBy('nombre')
            ->get();
    }

    public function store(StoreAmbienteRequest $request)
    {
        $data = $request->validated();

        return response()->json(Ambiente::create($data), 201);
    }

    public function show(Ambiente $ambiente)
    {
        return $ambiente;
    }

    public function update(UpdateAmbienteRequest $request, Ambiente $ambiente)
    {
        $data = $request->validated();

        $ambiente->update($data);

        return $ambiente;
    }

    // El ambiente se elimina definitivamente de la base de datos. No se puede eliminar
    // mientras algun examen o ingreso lo use (se perderia el lugar de esos examenes).
    public function destroy(Ambiente $ambiente)
    {
        $enUso = DB::table('examenes')->where('ambiente_id', $ambiente->id)->exists()
            || DB::table('examen_ambiente')->where('ambiente_id', $ambiente->id)->exists();
        if ($enUso) {
            return response()->json([
                'message' => 'No se puede eliminar el ambiente porque está asignado a uno o más exámenes. Primero elimina esos exámenes o cámbiales el ambiente.',
            ], 409);
        }
        if (DB::table('ingresos')->where('ambiente_id', $ambiente->id)->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar el ambiente porque tiene ingresos registrados.',
            ], 409);
        }

        $ambiente->delete();

        return response()->json(['message' => 'Ambiente eliminado con éxito.']);
    }
}
