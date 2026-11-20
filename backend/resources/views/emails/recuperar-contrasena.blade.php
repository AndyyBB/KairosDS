<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Recuperación de contraseña - Kairos Digital Systems</title>
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
        <p>Recibimos una solicitud para recuperar el acceso a tu cuenta ({{ $correo }}). Tu contraseña temporal es:</p>
        <p style="text-align:center;margin:20px 0;">
          <span style="display:inline-block;font-family:Consolas,monospace;font-size:22px;letter-spacing:3px;font-weight:bold;background:#e8f5f4;border:1px solid #b6dcd9;border-radius:8px;padding:10px 18px;color:#0f5e5c;">{{ $temporal }}</span>
        </p>
        <p>Tu contraseña anterior ya no funciona. Ingresa al sistema con esta contraseña temporal y luego cámbiala en la opción <strong>"Cambiar contraseña"</strong> del menú lateral.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="{{ $url }}" style="background:#0f5e5c;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:bold;display:inline-block;">Ir al inicio de sesión</a>
        </p>
        <p style="font-size:12px;color:#6b7280;margin-bottom:0;">Si no solicitaste este cambio, avisa al administrador del sistema.</p>
      </td>
    </tr>
  </table>
</body>
</html>
