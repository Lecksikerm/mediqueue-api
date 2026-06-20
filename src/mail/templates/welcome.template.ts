export const welcomeTemplate = (name: string, role: string) => {
    const roleMessage =
        role === 'doctor'
            ? `As a doctor on MediQueue, you can set your availability, manage your consultation queue, and treat patients virtually — all from one dashboard.`
            : role === 'patient'
                ? `As a patient, you can browse verified doctors, book appointments in seconds, and join a real-time queue so you always know exactly when it's your turn — no more waiting rooms.`
                : `As an admin, you have full visibility into the platform — monitor doctors, patients, appointments, and system performance from a single dashboard.`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Welcome to MediQueue</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0; }
            .container { background: #fff; max-width: 540px; margin: auto; padding: 0; border-radius: 10px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 30px; text-align: center; }
            .header h1 { color: #fff; margin: 0; font-size: 24px; }
            .body { padding: 30px; }
            .feature-list { margin: 20px 0; padding: 0; list-style: none; }
            .feature-list li { padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #333; }
            .feature-list li:last-child { border-bottom: none; }
            .feature-icon { color: #2563eb; font-weight: bold; margin-right: 8px; }
            .cta { display: inline-block; background: #2563eb; color: #fff; padding: 12px 28px;
                   text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
            .footer { padding: 20px 30px; background: #f9fafb; font-size: 12px; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to MediQueue 🏥</h1>
            </div>
            <div class="body">
              <p>Hi <strong>${name}</strong>,</p>
              <p>
                We're thrilled to have you on board! MediQueue is a teleconsultation
                and real-time queue management platform built to make healthcare
                faster, simpler, and more accessible.
              </p>
              <p>${roleMessage}</p>
  
              <ul class="feature-list">
                <li><span class="feature-icon">✓</span> Book and manage appointments online</li>
                <li><span class="feature-icon">✓</span> Track real-time queue position — no physical waiting</li>
                <li><span class="feature-icon">✓</span> Secure video consultations from anywhere</li>
                <li><span class="feature-icon">✓</span> Instant email reminders before appointments</li>
              </ul>
  
              <p>If you ever have questions, our support team is just an email away.</p>
  
              <a href="#" class="cta">Get Started</a>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} MediQueue. All rights reserved.<br/>
              You're receiving this email because you created an account on MediQueue.
            </div>
          </div>
        </body>
      </html>
    `;
};