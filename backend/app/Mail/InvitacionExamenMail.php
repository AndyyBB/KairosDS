<?php

namespace App\Mail;

use App\Models\Estudiante;
use App\Models\Examen;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// HU-41: correo de invitacion a un examen, con el boton "Aceptar invitación".
class InvitacionExamenMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Estudiante $estudiante,
        public Examen $examen,
        public string $token,
        public ?string $remitente = null,
    ) {
    }

    public function envelope(): Envelope
    {
        $materia = $this->examen->materia?->nombre ?? 'examen';

        return new Envelope(subject: "Invitación al examen de {$materia} - Kairos Digital Systems");
    }

    public function content(): Content
    {
        $examen = $this->examen;
        $ambientes = $examen->ambientes->pluck('nombre')->all();
        if (! $ambientes && $examen->ambiente) {
            $ambientes = [$examen->ambiente->nombre];
        }

        return new Content(
            view: 'emails.invitacion-examen',
            with: [
                'nombre' => $this->estudiante->nombres ?: $this->estudiante->nombre_completo,
                'materia' => $examen->materia?->nombre ?? '-',
                'fecha' => $examen->fecha?->format('d/m/Y'),
                'hora' => substr((string) $examen->hora_inicio, 0, 5),
                'duracion' => (int) $examen->duracion_min,
                'ambientes' => implode(', ', $ambientes) ?: '-',
                'remitente' => $this->remitente,
                'url' => rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/').'/invitacion/'.$this->token,
            ],
        );
    }
}
