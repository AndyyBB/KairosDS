<?php

namespace App\Mail;

use App\Models\Usuario;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// Sprint 4 (observacion 4): correo que avisa al usuario que se creo su cuenta en Kairos.
// Por seguridad NO incluye la contrasena: el administrador se la entrega personalmente.
class CuentaCreada extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Usuario $usuario, public ?string $creadoPor = null)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tu cuenta en Kairos Digital Systems fue creada');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cuenta-creada',
            with: [
                'nombre' => $this->usuario->nombres ?: $this->usuario->nombre_completo,
                'correo' => $this->usuario->correo_electronico,
                'rol' => ucfirst((string) $this->usuario->rol?->nombre),
                'creadoPor' => $this->creadoPor,
                'url' => rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/').'/login',
            ],
        );
    }
}
