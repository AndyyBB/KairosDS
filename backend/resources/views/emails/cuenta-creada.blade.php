<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Tu cuenta en Kairos Digital Systems</title>
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
        <p>Se creó tu cuenta en el Sistema de Control de Ingreso a Exámenes Masivos.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Correo de acceso</td><td style="padding:4px 0;font-weight:bold;">{{ $correo }}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Rol</td><td style="padding:4px 0;font-weight:bold;">{{ $rol }}</td></tr>
          @if ($creadoPor)
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;">Creada por</td><td style="padding:4px 0;">{{ $creadoPor }}</td></tr>
          @endif
        </table>
        <p>Por seguridad, tu contraseña no se envía por correo: te la entregará el administrador del sistema.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="{{ $url }}" style="background:#0f5e5c;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:bold;display:inline-block;">Ingresar al sistema</a>
        </p>
        <p style="font-size:12px;color:#6b7280;margin-bottom:0;">Si no esperabas este correo, avisa al administrador del sistema.</p>
      </td>
    </tr>
  </table>
</body>
</html>
