import connectToDatabase from '@/lib/db';
import Email from '@/lib/models/Email';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import Notification from '@/lib/models/Notification';
import { NextResponse } from 'next/server';

export async function GET(req) {
  // Always prepare tracking pixel GIF response to avoid blocking emails
  const pixelBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const pixelBuffer = Buffer.from(pixelBase64, 'base64');
  const fallbackResponse = new Response(pixelBuffer, {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': pixelBuffer.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
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

    // Increment open statistics
    email.opensCount += 1;
    email.openedAt.push(new Date());
    await email.save();

    // Trigger Lead Specific Automation
    if (email.leadId) {
      const lead = await Lead.findById(email.leadId);
      if (lead) {
        // Add follow-up timeline action
        lead.notes.push({
          text: `👁️ Email Opened: Client opened email "${email.subject}" (Total Opens: ${email.opensCount})`,
          createdBy: email.sentBy,
          createdByName: 'Email Tracker Engine'
        });

        // 1. Shift Lead Status automatically from New to Contacted
        if (lead.status === 'New') {
          lead.status = 'Contacted';
        }

        await lead.save();

        // 2. Trigger System Notification Alert for Sales Rep
        const targetRecipient = lead.assignedTo || email.sentBy;
        await Notification.create({
          recipientId: targetRecipient,
          senderId: null,
          type: 'Lead',
          title: '🔥 Email Opened!',
          message: `Lead ${lead.firstName} (${lead.company}) has opened your email "${email.subject}" (Opened ${email.opensCount} times).`,
          link: '/dashboard/leads'
        });
      }
    } else if (email.contactId) {
      const contact = await Contact.findById(email.contactId);
      if (contact) {
        contact.notes.push({
          text: `👁️ Email Opened: Client opened email "${email.subject}" (Total Opens: ${email.opensCount})`,
          createdBy: email.sentBy,
          createdByName: 'Email Tracker Engine'
        });
        await contact.save();

        const targetRecipient = contact.assignedTo || email.sentBy;
        await Notification.create({
          recipientId: targetRecipient,
          senderId: null,
          type: 'System',
          title: '🔥 Email Opened!',
          message: `Contact ${contact.firstName} (${contact.company}) opened your email "${email.subject}".`,
          link: '/dashboard/contacts'
        });
      }
    }

    return fallbackResponse;
  } catch (error) {
    console.error('Email tracking pixel error:', error);
    return fallbackResponse;
  }
}
