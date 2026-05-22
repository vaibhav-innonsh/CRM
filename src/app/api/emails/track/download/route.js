import connectToDatabase from '@/lib/db';
import Email from '@/lib/models/Email';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import Notification from '@/lib/models/Notification';
import { supabase } from '@/lib/supabaseClient';
import { createNotification } from '@/lib/notifications';

export async function GET(req) {
  // A minimal valid PDF buffer for a real, functional download experience
  const pdfBuffer = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n' +
    '4 0 obj\n<< /Length 120 >>\nstream\n' +
    'BT\n' +
    '/F1 18 Tf\n' +
    '70 700 Td\n' +
    '(Enterprise proposal estimation document. All details are active and tracked.) Tj\n' +
    '0 -40 Td\n' +
    '(This PDF download was captured by the CRM Automated Pipeline.) Tj\n' +
    'ET\n' +
    'endstream\n' +
    'endobj\n' +
    'xref\n' +
    '0 5\n' +
    '0000000000 65535 f\n' +
    '0000000009 00000 n\n' +
    '0000000056 00000 n\n' +
    '0000000111 00000 n\n' +
    '0000000244 00000 n\n' +
    'trailer\n' +
    '<< /Size 5 /Root 1 0 R >>\n' +
    'startxref\n' +
    '415\n' +
    '%%EOF'
  );

  const getFallbackResponse = (isInline) => {
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isInline ? 'inline' : 'attachment'}; filename="Proposal_Tracked.pdf"`,
      },
    });
  };

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const download = searchParams.get('download');
    const inline = searchParams.get('inline');

    if (!id) {
      return getFallbackResponse(inline === 'true');
    }

    let email;
    if (supabase) {
      const { data, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !data) {
        return getFallbackResponse(inline === 'true');
      }
      email = data;

      // A. Sub-requests to stream the file (either inline preview or direct attachment download)
      if (download === 'true' || inline === 'true') {
        if (email.proposal_file_data) {
          const base64Data = email.proposal_file_data.includes(';base64,')
            ? email.proposal_file_data.split(';base64,')[1]
            : email.proposal_file_data;

          const fileBuffer = Buffer.from(base64Data, 'base64');
          const filename = email.proposal_file || 'Attachment_Tracked.pdf';
          const mimeType = email.proposal_file_mime_type || 'application/octet-stream';

          return new Response(fileBuffer, {
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `${inline === 'true' ? 'inline' : 'attachment'}; filename="${filename}"`,
              'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            },
          });
        }
        return getFallbackResponse(inline === 'true');
      }

      // B. Primary Request: Client clicked the link from the email
      // 1. Log tracking analytics ONLY ONCE to prevent double counting
      const currentDownloadedAt = Array.isArray(email.downloaded_at) ? email.downloaded_at : [];
      const updatedDownloadsCount = (email.downloads_count || 0) + 1;

      const { error: updateError } = await supabase
        .from('emails')
        .update({
          downloads_count: updatedDownloadsCount,
          downloaded_at: [...currentDownloadedAt, new Date().toISOString()]
        })
        .eq('id', id);

      if (updateError) {
        console.error('Supabase update downloads count error:', updateError);
        return getFallbackResponse(false);
      }

      // 2. Trigger Lead Specific Automation & Notifications
      if (email.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', email.lead_id)
          .maybeSingle();

        if (lead) {
          const newScore = (lead.score || 0) + 20;
          await supabase
            .from('leads')
            .update({
              score: newScore,
              status: 'Qualified'
            })
            .eq('id', lead.id);

          const noteText = `📥 PDF Proposal Downloaded: Client downloaded attached file [${email.proposal_file || 'Proposal.pdf'}] (Lead Score: ${newScore}, Status auto-shifted to Qualified)`;
          await supabase.from('lead_notes').insert([{
            lead_id: lead.id,
            text: noteText,
            created_by: email.sent_by,
            created_by_name: 'Proposal Tracker Engine'
          }]);

          const targetRecipient = lead.assigned_to || email.sent_by;
          await createNotification(
            targetRecipient,
            'Lead',
            '⚡ PDF Proposal Downloaded!',
            `Lead ${lead.first_name} (${lead.company || ''}) has downloaded your proposal "${email.proposal_file || 'Proposal.pdf'}". Lead Score increased by +20 (New Score: ${newScore}) and status upgraded to Qualified!`,
            '/dashboard/leads',
            null
          );
        }
      } else if (email.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', email.contact_id)
          .maybeSingle();

        if (contact) {
          const targetRecipient = contact.assigned_to || email.sent_by;
          await createNotification(
            targetRecipient,
            'System',
            '⚡ PDF Proposal Downloaded!',
            `Contact ${contact.first_name} (${contact.company || ''}) downloaded your proposal "${email.proposal_file || 'Proposal.pdf'}".`,
            '/dashboard/contacts',
            null
          );
        }
      }
    } else {
      await connectToDatabase();

      const mongoEmail = await Email.findById(id);
      if (!mongoEmail) {
        return getFallbackResponse(inline === 'true');
      }
      email = mongoEmail;

      // A. Sub-requests to stream the file (either inline preview or direct attachment download)
      if (download === 'true' || inline === 'true') {
        if (email.proposalFileData) {
          const base64Data = email.proposalFileData.includes(';base64,')
            ? email.proposalFileData.split(';base64,')[1]
            : email.proposalFileData;

          const fileBuffer = Buffer.from(base64Data, 'base64');
          const filename = email.proposalFile || 'Attachment_Tracked.pdf';
          const mimeType = email.proposalFileMimeType || 'application/octet-stream';

          return new Response(fileBuffer, {
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `${inline === 'true' ? 'inline' : 'attachment'}; filename="${filename}"`,
              'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            },
          });
        }
        return getFallbackResponse(inline === 'true');
      }

      // B. Primary Request: Client clicked the link from the email
      // 1. Log tracking analytics ONLY ONCE to prevent double counting
      email.downloadsCount += 1;
      email.downloadedAt.push(new Date());
      await email.save();

      // 2. Trigger Lead Specific Automation & Notifications
      if (email.leadId) {
        const lead = await Lead.findById(email.leadId);
        if (lead) {
          lead.score = (lead.score || 0) + 20;
          lead.status = 'Qualified';
          lead.notes.push({
            text: `📥 PDF Proposal Downloaded: Client downloaded attached file [${email.proposalFile || 'Proposal.pdf'}] (Lead Score: ${lead.score}, Status auto-shifted to Qualified)`,
            createdBy: email.sentBy,
            createdByName: 'Proposal Tracker Engine'
          });
          await lead.save();

          const targetRecipient = lead.assignedTo || email.sentBy;
          await Notification.create({
            recipientId: targetRecipient,
            senderId: null,
            type: 'Lead',
            title: '⚡ PDF Proposal Downloaded!',
            message: `Lead ${lead.firstName} (${lead.company}) has downloaded your proposal "${email.proposalFile || 'Proposal.pdf'}". Lead Score increased by +20 (New Score: ${lead.score}) and status upgraded to Qualified!`,
            link: '/dashboard/leads'
          });
        }
      } else if (email.contactId) {
        const contact = await Contact.findById(email.contactId);
        if (contact) {
          contact.notes.push({
            text: `📥 PDF Proposal Downloaded: Client downloaded attached file [${email.proposalFile || 'Proposal.pdf'}]`,
            createdBy: email.sentBy,
            createdByName: 'Proposal Tracker Engine'
          });
          await contact.save();

          const targetRecipient = contact.assignedTo || email.sentBy;
          await Notification.create({
            recipientId: targetRecipient,
            senderId: null,
            type: 'System',
            title: '⚡ PDF Proposal Downloaded!',
            message: `Contact ${contact.firstName} (${contact.company}) downloaded your proposal "${email.proposalFile || 'Proposal.pdf'}".`,
            link: '/dashboard/contacts'
          });
        }
      }
    }

    // 3. Render a beautiful, premium, branded Innonsh-style Proposal Landing Portal
    const filename = email.proposal_file || email.proposalFile || 'Proposal.pdf';
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Innonsh CRM - View Proposal</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    .header {
      background-color: #1e293b;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #10b981;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      z-index: 20;
    }
    .logo {
      font-size: 18px;
      font-weight: bold;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .logo span {
      color: #10b981;
      font-weight: normal;
      margin-left: 4px;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-download {
      background-color: #10b981;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
      border: none;
      cursor: pointer;
    }
    .btn-download:hover {
      background-color: #059669;
      transform: translateY(-1px);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
    }
    .viewer-container {
      flex: 1;
      display: flex;
      position: relative;
      background-color: #1e293b;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .status-msg {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(15, 23, 42, 0.9);
      border: 1px solid #10b981;
      padding: 10px 20px;
      border-radius: 9999px;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      z-index: 30;
      animation: fadeInOut 5s forwards;
    }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -10px); }
      10% { opacity: 1; transform: translate(-50%, 0); }
      80% { opacity: 1; transform: translate(-50%, 0); }
      100% { opacity: 0; transform: translate(-50%, -10px); pointer-events: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Innonsh<span>CRM Suite</span></div>
    <div class="actions">
      <a href="/api/emails/track/download?id=${id}&download=true" class="btn-download" id="downloadBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download Proposal
      </a>
    </div>
  </div>
  
  <div class="viewer-container">
    <div class="status-msg">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <span>Proposal loaded securely. Click 'Download' to save.</span>
    </div>
    <iframe src="/api/emails/track/download?id=${id}&inline=true"></iframe>
  </div>
</body>
</html>
    `;

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    });

  } catch (error) {
    console.error('PDF download tracking error:', error);
    return getFallbackResponse(false);
  }
}
