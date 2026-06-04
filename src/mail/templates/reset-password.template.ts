export const resetPasswordTemplate = (name: string, resetToken: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
          .container { background: #fff; max-width: 500px; margin: auto; padding: 30px; border-radius: 8px; }
          .btn { display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px;
                 text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .token-box { background: #f1f5f9; padding: 12px; border-radius: 6px;
                       word-break: break-all; font-family: monospace; font-size: 13px; }
          .footer { margin-top: 30px; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>Hi <strong>${name}</strong>,</p>
          <p>We received a request to reset your MediQueue password. 
             Copy the token below and use it to reset your password.</p>

          <div class="token-box">${resetToken}</div>

          <p style="margin-top: 20px;">This token expires in <strong>15 minutes</strong>.</p>
          <p>If you did not request a password reset, ignore this email.</p>

          <div class="footer">
            &copy; ${new Date().getFullYear()} MediQueue. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
};
