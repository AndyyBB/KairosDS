<?php

namespace App\Mail;

use App\Models\Usuario;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// HU-39: correo con la contrasena temporal para recuperar el acceso al sistema.
class RecuperarContrasena extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Usuario $usuario, public string $temporal)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Recuperación de contraseña - Kairos Digital Systems');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.recuperar-contrasena',
            with: [
                'nombre' => $this->usuario->nombres ?: $this->usuario->nombre_completo,
                'correo' => $this->usuario->correo_electronico,
                'temporal' => $this->temporal,
                'url' => rtrim((string) config('app.frontend_url', env('FRONTEND_URL', 'http://localhost:5173')), '/').'/login',
            ],
        );
    }
}
