<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ambiente;
use App\Http\Requests\StoreAmbienteRequest;
use App\Http\Requests\UpdateAmbienteRequest;
use Illuminate\Http\Request;

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

    public function destroy(Ambiente $ambiente)
    {
        $ambiente->update(['activo' => false]);

        return response()->json(['message' => 'Ambiente desactivado.']);
    }
}
