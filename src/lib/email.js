import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendWelcomeEmail = async (email, name) => {
  const clinicName = process.env.CLINIC_NAME || 'DentalCare';

  await transporter.sendMail({
    from: `"${clinicName}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Bienvenido a ${clinicName}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .logo { font-size: 28px; font-weight: bold; color: #2563eb; text-align: center; margin-bottom: 20px; }
          h1 { color: #1e293b; font-size: 24px; margin-bottom: 15px; }
          p { color: #475569; line-height: 1.6; margin-bottom: 15px; }
          .highlight { background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🦷 ${clinicName}</div>
          <h1>Hola ${name}!</h1>
          <p>Gracias por registrarte en <strong>${clinicName}</strong>.</p>
          <div class="highlight">
            <p><strong>Tu cuenta ha sido creada exitosamente.</strong></p>
            <p>Ahora podés:</p>
            <ul>
              <li>Reservar turnos con nuestros dentistas</li>
              <li>Ver tu historial de tratamientos</li>
              <li>Administrar tus citas</li>
            </ul>
          </div>
          <p>Si tenés alguna pregunta, no dudes en contactarnos.</p>
          <p class="footer">© ${new Date().getFullYear()} ${clinicName}. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `,
  });
};

export const sendAppointmentConfirmedEmail = async (email, name, appointment) => {
  const clinicName = process.env.CLINIC_NAME || 'DentalCare';
  const dateStr = new Date(appointment.date).toLocaleDateString('es-ES', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  await transporter.sendMail({
    from: `"${clinicName}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Tu cita en ${clinicName} ha sido confirmada!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .logo { font-size: 28px; font-weight: bold; color: #2563eb; text-align: center; margin-bottom: 20px; }
          h1 { color: #1e293b; font-size: 24px; margin-bottom: 15px; }
          p { color: #475569; line-height: 1.6; margin-bottom: 15px; }
          .details { background: #f0fdf4; border: 2px solid #22c55e; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .detail-label { color: #475569; font-weight: 500; }
          .detail-value { color: #1e293b; font-weight: 600; }
          .highlight { background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🦷 ${clinicName}</div>
          <h1>Hola ${name}!</h1>
          <p>Tu cita ha sido <strong>confirmada</strong>. Te esperamos!</p>
          <div class="details">
            <div class="detail-row">
              <span class="detail-label">📅 Fecha:</span>
              <span class="detail-value">${dateStr}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🕐 Horario:</span>
              <span class="detail-value">${appointment.time} hs</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🦷 Tratamiento:</span>
              <span class="detail-value">${appointment.treatment.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">💰 Costo:</span>
              <span class="detail-value">$${appointment.treatment.price}</span>
            </div>
          </div>
          <div class="highlight">
            <p><strong>Recordatorio:</strong></p>
            <p>Por favor lleguen 10 minutos antes. Si tenés alguna consulta, no dudes en contactarnos.</p>
          </div>
          <p class="footer">© ${new Date().getFullYear()} ${clinicName}. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `,
  });
};

export default transporter;