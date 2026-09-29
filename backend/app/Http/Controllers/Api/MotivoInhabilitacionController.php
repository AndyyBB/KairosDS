<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MotivoInhabilitacion;
use Illuminate\Http\Request;

class MotivoInhabilitacionController extends Controller
{
    public function index()
    {
        return MotivoInhabilitacion::where('activo', true)->orderBy('descripcion')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'codigo' => ['required', 'string', 'max:20', 'unique:motivos_inhabilitacion,codigo'],
            'descripcion' => ['required', 'string', 'max:200'],
        ]);

        return response()->json(MotivoInhabilitacion::create($data), 201);
    }
}
