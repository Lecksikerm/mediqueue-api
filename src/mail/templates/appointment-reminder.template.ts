export const appointmentReminderTemplate = (
  patientName: string,
  doctorName: string,
  date: string,
  timeRange: string,
) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Appointment Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
          .container { background: #fff; max-width: 500px; margin: auto; padding: 30px; border-radius: 8px; }
          .details { background: #f1f5f9; padding: 16px; border-radius: 6px; margin-top: 16px; }
          .footer { margin-top: 30px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Appointment Reminder</h2>
          <p>Hi <strong>${patientName}</strong>,</p>
          <p>This is a reminder for your upcoming MediQueue appointment.</p>

          <div class="details">
            <p><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${timeRange}</p>
          </div>

          <p style="margin-top: 20px;">Please arrive a few minutes early.</p>

          <div class="footer">
            &copy; ${new Date().getFullYear()} MediQueue. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
};
