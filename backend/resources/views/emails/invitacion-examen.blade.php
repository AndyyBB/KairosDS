<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Invitación al examen - Kairos Digital Systems</title>
</head>
<body style="margin:0;padding:24px;background:#f3f8f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #d5ecea;">
    <tr>
      <td style="background:#0f5e5c;color:#ffffff;padding:20px 24px;border-radius:12px 12px 0 0;">
        <div style="font-size:20px;font-weight:bold;">Kairos Digital Systems</div>
        <div style="font-size:13px;opacity:.85;">Sistema de Control de Ingreso a Exámenes Masivos</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;font-size:15px;line-height:1.5;">
        <p style="margin-top:0;">Hola, {{ $nombre }}:</p>
        <p>
          @if ($remitente)
            {{ $remitente }} te invita a inscribirte en el siguiente examen:
          @else
            Te invitamos a inscribirte en el siguiente examen:
          @endif
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #d5ecea;border-radius:8px;background:#f7fbfb;margin:16px 0;font-size:14px;">
          <tr><td style="padding:8px 14px;color:#6b7280;width:120px;">Asignatura</td><td style="padding:8px 14px;font-weight:bold;">{{ $materia }}</td></tr>
          <tr><td style="padding:8px 14px;color:#6b7280;">Fecha</td><td style="padding:8px 14px;">{{ $fecha }}</td></tr>
          <tr><td style="padding:8px 14px;color:#6b7280;">Hora</td><td style="padding:8px 14px;">{{ $hora }}</td></tr>
          <tr><td style="padding:8px 14px;color:#6b7280;">Duración</td><td style="padding:8px 14px;">{{ $duracion }} minutos</td></tr>
          <tr><td style="padding:8px 14px;color:#6b7280;">Ambiente</td><td style="padding:8px 14px;">{{ $ambientes }}</td></tr>
        </table>
        <p>Para quedar inscrito, presiona el botón:</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="{{ $url }}" style="background:#0f5e5c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;display:inline-block;">Aceptar invitación</a>
        </p>
        <p style="font-size:13px;color:#4b5563;">Después de inscribirte, el docente te marcará como habilitado o no habilitado para rendir el examen.</p>
        <p style="font-size:12px;color:#6b7280;margin-bottom:0;">Si no esperabas esta invitación, puedes ignorar este correo: no quedarás inscrito.</p>
      </td>
    </tr>
  </table>
</body>
</html>
