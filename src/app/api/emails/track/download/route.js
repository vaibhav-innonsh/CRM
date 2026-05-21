import connectToDatabase from '@/lib/db';
import Email from '@/lib/models/Email';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import Notification from '@/lib/models/Notification';

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

  const fallbackResponse = new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Proposal_Tracked.pdf"',
    },
  });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return fallbackResponse;
    }

    await connectToDatabase();

    const email = await Email.findById(id);
    if (!email) {
      return fallbackResponse;
    }

    // Increment download statistics
    email.downloadsCount += 1;
    email.downloadedAt.push(new Date());
    await email.save();

    // Trigger Lead Specific Automation
    if (email.leadId) {
      const lead = await Lead.findById(email.leadId);
      if (lead) {
        // Boost Lead Score by +20 & update status to Qualified
        lead.score = (lead.score || 0) + 20;
        lead.status = 'Qualified';

        // Add follow-up timeline action
        lead.notes.push({
          text: `📥 PDF Proposal Downloaded: Client downloaded attached file [${email.proposalFile || 'Proposal.pdf'}] (Lead Score: ${lead.score}, Status auto-shifted to Qualified)`,
          createdBy: email.sentBy,
          createdByName: 'Proposal Tracker Engine'
        });

        await lead.save();

        // Trigger System Notification Alert for Sales Rep
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
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      });
    }

    return fallbackResponse;
  } catch (error) {
    console.error('PDF download tracking error:', error);
    return fallbackResponse;
  }
}
