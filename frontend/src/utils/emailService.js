import emailjs from '@emailjs/browser';

/**
 * Send email using EmailJS directly from the browser.
 * No server configuration needed.
 *
 * Setup guide for lecturers:
 * 1. Go to https://www.emailjs.com/ and create a free account
 * 2. Add Gmail as email service → connect your Gmail
 * 3. Create an email template with variables: {{subject}}, {{html_content}}
 * 4. Copy Service ID, Template ID, and Public Key
 * 5. Paste them in Marks Management → Settings
 */

let emailjsConfig = { serviceId: '', templateId: '', publicKey: '' };

export function setEmailJSConfig(config) {
  emailjsConfig = { ...emailjsConfig, ...config };
  // Save to localStorage for persistence
  localStorage.setItem('emailjsConfig', JSON.stringify(emailjsConfig));
}

export function getEmailJSConfig() {
  // Load from localStorage on first use
  if (!emailjsConfig.serviceId) {
    const saved = localStorage.getItem('emailjsConfig');
    if (saved) {
      try { emailjsConfig = JSON.parse(saved); } catch { /* ignore */ }
    }
  }
  return { ...emailjsConfig };
}

export function isEmailJSConfigured() {
  const cfg = getEmailJSConfig();
  return !!(cfg.serviceId && cfg.templateId && cfg.publicKey);
}

/**
 * Build the HTML email content
 */
export function buildEmailHTML(data) {
  const { sheet, approvedTests, staffEmail } = data;

  let testSections = '';
  for (const test of approvedTests) {
    let tableRows = '';
    for (let r = 0; r < sheet.students.length; r++) {
      const student = sheet.students[r];
      const mark = student.marks.find((m) => m.colIndex === test.colIndex);
      const markValue = mark && mark.value !== '' ? mark.value : '-';
      const bg = r % 2 === 0 ? '#ffffff' : '#f8fafc';
      tableRows += `<tr style="background:${bg}">`;
      tableRows += `<td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;color:#1e293b;">${student.name}</td>`;
      tableRows += `<td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:center;font-weight:500;color:#2563eb;">${markValue}</td>`;
      tableRows += '</tr>';
    }

    const maxMarks = test.maxMarks || 100;
    testSections += `<div style="margin-top:16px;">`;
    testSections += `<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:10px 16px;">`;
    testSections += `<strong style="color:#1e40af;font-size:14px;">${test.name}</strong>`;
    testSections += `<span style="color:#64748b;font-size:12px;margin-left:8px;">(out of ${maxMarks})</span>`;
    testSections += `</div>`;
    testSections += `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none;">`;
    testSections += `<thead><tr style="background:#f1f5f9;">`;
    testSections += `<th style="padding:10px 14px;text-align:left;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600;">Student</th>`;
    testSections += `<th style="padding:10px 14px;text-align:center;border:1px solid #e2e8f0;font-size:12px;color:#475569;font-weight:600;width:100px;">Mark (out of ${maxMarks})</th>`;
    testSections += `</tr></thead><tbody>${tableRows}</tbody></table></div>`;
  }

  let html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">`;
  html += `<div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:20px 24px;">`;
  html += `<h2 style="margin:0;font-size:18px;">Marks Update</h2>`;
  html += `<p style="margin:4px 0 0;opacity:0.85;font-size:13px;">${new Date().toLocaleDateString()}</p>`;
  html += `</div>`;
  html += `<div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">`;
  html += `<span style="display:inline-block;background:#2563eb;color:#fff;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;margin-right:6px;">${sheet.batch}</span>`;
  html += `<span style="display:inline-block;background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;margin-right:6px;">${sheet.branch}</span>`;
  html += `<span style="display:inline-block;background:#f0fdf4;color:#166534;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;">${sheet.subject}</span>`;
  html += `</div>`;
  html += `<div style="padding:16px 20px;">${testSections}</div>`;
  html += `<p style="color:#94a3b8;font-size:11px;margin:0;padding:10px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;">MIE Faculty Attendance • ${sheet.students.length} student(s) • ${approvedTests.length} test(s)</p>`;
  html += `</div>`;

  return html;
}

/**
 * Send marks email via EmailJS
 */
export async function sendMarksEmail(data) {
  const cfg = getEmailJSConfig();
  if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
    throw new Error('EmailJS not configured. Go to Settings and set up EmailJS.');
  }

  const html = buildEmailHTML(data);

  const templateParams = {
    to_email: data.staffEmail,
    subject: `Marks: ${data.sheet.name}`,
    html_content: html,
    batch: data.sheet.batch,
    branch: data.sheet.branch,
    subject_name: data.sheet.subject,
    test_count: String(data.approvedTests.length),
    student_count: String(data.sheet.students.length),
  };

  const result = await emailjs.send(cfg.serviceId, cfg.templateId, templateParams, cfg.publicKey);
  return result;
}

/**
 * Send test email via EmailJS
 */
export async function sendTestEmail() {
  const cfg = getEmailJSConfig();
  if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
    throw new Error('EmailJS not configured. Go to Settings and set up EmailJS.');
  }

  const templateParams = {
    to_email: '',  // Will be filled by EmailJS template default
    subject: 'Test Email — MIE Faculty System',
    html_content: `<div style="font-family:Arial,sans-serif;padding:20px;">
      <h2 style="color:#2563eb;">Email Test Successful!</h2>
      <p>Your email is configured correctly. You can now send marks to staff.</p>
      <hr style="border:1px solid #e2e8f0;"/>
      <p style="color:#94a3b8;font-size:12px;">MIE Faculty Attendance System</p>
    </div>`,
    batch: 'Test',
    branch: 'Test',
    subject_name: 'Test',
    test_count: '0',
    student_count: '0',
  };

  const result = await emailjs.send(cfg.serviceId, cfg.templateId, templateParams, cfg.publicKey);
  return result;
}
