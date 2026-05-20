import connectToDatabase from '@/lib/db';
import Email from '@/lib/models/Email';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/emails - List emails with filters based on role
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const leadId = searchParams.get('leadId') || '';
    const contactId = searchParams.get('contactId') || '';

    let query = {};

    // Role-based access control
    if (decodedUser.role === 'sales_rep') {
      query.sentBy = decodedUser.id;
    }

    if (leadId) query.leadId = leadId;
    if (contactId) query.contactId = contactId;

    if (search) {
      query.subject = new RegExp(search, 'i');
    }

    const emails = await Email.find(query)
      .populate('sentBy', 'name email role')
      .populate('leadId', 'firstName lastName company status')
      .populate('contactId', 'firstName lastName company status')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      emails
    });
  } catch (error) {
    console.error('Fetch emails error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching emails.' },
      { status: 500 }
    );
  }
}

// POST /api/emails - Compose and "send" tracked email
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const {
      subject,
      body: emailBody,
      leadId,
      contactId,
      proposalFile
    } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Email subject is required.' }, { status: 400 });
    }
    if (!emailBody || !emailBody.trim()) {
      return NextResponse.json({ error: 'Email body is required.' }, { status: 400 });
    }

    let finalSubject = subject.trim();
    let finalBody = emailBody;

    // Resolve template placeholder tags if linked to Lead/Contact
    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (lead) {
        const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
        finalSubject = finalSubject
          .replace(/\{\{firstName\}\}/g, lead.firstName || '')
          .replace(/\{\{name\}\}/g, fullName)
          .replace(/\{\{company\}\}/g, lead.company || '');
        finalBody = finalBody
          .replace(/\{\{firstName\}\}/g, lead.firstName || '')
          .replace(/\{\{name\}\}/g, fullName)
          .replace(/\{\{company\}\}/g, lead.company || '');
      }
    } else if (contactId) {
      const contact = await Contact.findById(contactId);
      if (contact) {
        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        finalSubject = finalSubject
          .replace(/\{\{firstName\}\}/g, contact.firstName || '')
          .replace(/\{\{name\}\}/g, fullName)
          .replace(/\{\{company\}\}/g, contact.company || '');
        finalBody = finalBody
          .replace(/\{\{firstName\}\}/g, contact.firstName || '')
          .replace(/\{\{name\}\}/g, fullName)
          .replace(/\{\{company\}\}/g, contact.company || '');
      }
    }

    const email = await Email.create({
      subject: finalSubject,
      body: finalBody,
      leadId: leadId || null,
      contactId: contactId || null,
      sentBy: decodedUser.id,
      proposalFile: proposalFile || ''
    });

    // Automatically log this on the Lead's or Contact's timeline notes
    if (leadId) {
      try {
        const lead = await Lead.findById(leadId);
        if (lead) {
          lead.notes.push({
            text: `📧 Sent Tracked Email: "${email.subject}" ${proposalFile ? `with Attachment [${proposalFile}]` : ''}`,
            createdBy: decodedUser.id,
            createdByName: decodedUser.name
          });
          await lead.save();
        }
      } catch (err) {
        console.error('Failed to log email on lead timeline:', err);
      }
    } else if (contactId) {
      try {
        const contact = await Contact.findById(contactId);
        if (contact) {
          contact.notes.push({
            text: `📧 Sent Tracked Email: "${email.subject}" ${proposalFile ? `with Attachment [${proposalFile}]` : ''}`,
            createdBy: decodedUser.id,
            createdByName: decodedUser.name
          });
          await contact.save();
        }
      } catch (err) {
        console.error('Failed to log email on contact timeline:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Email campaign dispatched successfully!',
      email
    }, { status: 201 });
  } catch (error) {
    console.error('Send email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while sending email.', details: error.message },
      { status: 500 }
    );
  }
}
