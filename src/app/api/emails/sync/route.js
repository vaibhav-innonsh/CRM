import connectToDatabase from '@/lib/db';
import Email from '@/lib/models/Email';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import Task from '@/lib/models/Task';
import Notification from '@/lib/models/Notification';
import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

// Smart helper to clean reply body and extract only the new reply message, stripping trailing quote history
function cleanReplyBody(text) {
  if (!text) return '';
  // Split by common reply separators to isolate the main response
  const separators = [
    /\n\s*On\s+.*wrote:\s*\n/i,
    /\n\s*-----Original Message-----/i,
    /\n\s*From:.*Sent:.*To:/i,
    /\n\s*_{32,}\s*\n/
  ];
  let cleaned = text;
  for (const sep of separators) {
    const parts = cleaned.split(sep);
    if (parts.length > 0) {
      cleaned = parts[0];
    }
  }
  return cleaned.trim();
}

export async function GET(req) {
  try {
    // 1. Verify that Mailbox credentials are configured in local environment
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        { error: 'Mailbox synchronization credentials (SMTP_USER/SMTP_PASS) are not set in .env.local.' },
        { status: 500 }
      );
    }

    // 2. Connect to the MongoDB Database
    await connectToDatabase();

    // 3. Find all sent proposal emails that are currently pending a client reply
    const unrepliedEmails = await Email.find({ replied: false })
      .populate('leadId')
      .populate('contactId');

    if (unrepliedEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending unreplied emails found in CRM database to sync.',
        syncedCount: 0
      });
    }

    // 4. Compile a map of recipient emails to matching Database proposal email logs
    const emailMap = new Map();
    for (const email of unrepliedEmails) {
      let clientEmail = '';
      if (email.leadId && email.leadId.email) {
        clientEmail = email.leadId.email.toLowerCase().trim();
      } else if (email.contactId && email.contactId.email) {
        clientEmail = email.contactId.email.toLowerCase().trim();
      }

      if (clientEmail) {
        if (!emailMap.has(clientEmail)) {
          emailMap.set(clientEmail, []);
        }
        emailMap.get(clientEmail).push(email);
      }
    }

    if (emailMap.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No valid recipient email addresses mapped for unreplied CRM logs.',
        syncedCount: 0
      });
    }

    // 5. Initialize the modern promise-based ImapFlow client
    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      logger: false, // Prevents console log flooding
    });

    // 6. Securely connect to Gmail's IMAP server
    await client.connect();

    let syncedCount = 0;
    const syncedDetails = [];

    // 7. Lock and search the INBOX mailbox folder
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Loop over every unique client sender email address mapped
      for (const [clientEmail, dbEmails] of emailMap.entries()) {
        // Search for all emails inside Gmail Inbox originating from this client's email address
        const uids = await client.search({ from: clientEmail });

        if (!uids || uids.length === 0) {
          continue; // No emails found in Inbox from this address
        }

        // Grab the latest received message UID to verify reply
        const latestUid = uids[uids.length - 1];

        // Fetch the raw source stream and headers envelope details of this message
        const msg = await client.fetchOne(latestUid, { source: true, envelope: true });
        if (!msg || !msg.source) {
          continue;
        }

        // Parse the full raw MIME stream using mailparser simpleParser
        const parsed = await simpleParser(msg.source);
        const incomingEmailDate = msg.envelope?.date || parsed.date || new Date();
        const incomingEmailBody = cleanReplyBody(parsed.text || parsed.textAsHtml || '');

        // Match against database logs that were sent before this incoming email date
        for (const dbEmail of dbEmails) {
          const sentDate = new Date(dbEmail.createdAt);

          // If the incoming reply was sent AFTER the proposal email was dispatched in CRM (allowing 5s cushion)
          if (incomingEmailDate.getTime() > sentDate.getTime() - 5000) {
            
            // Mark the email log as replied in MongoDB
            dbEmail.replied = true;
            dbEmail.repliedAt = incomingEmailDate;
            dbEmail.replyBody = incomingEmailBody || 'Client responded via email. Please check your Gmail Inbox.';
            await dbEmail.save();

            // Trigger standard automated follow-up workflows
            if (dbEmail.leadId) {
              const lead = await Lead.findById(dbEmail.leadId._id);
              if (lead) {
                // Boost lead score by +30
                lead.score = (lead.score || 0) + 30;

                // Push activity note on Lead's history timeline
                lead.notes.push({
                  text: `💬 Received Gmail Reply (Subject: "${dbEmail.subject}"): "${incomingEmailBody.slice(0, 150)}${incomingEmailBody.length > 150 ? '...' : ''}"`,
                  createdBy: dbEmail.sentBy,
                  createdByName: 'Gmail Reply Sync Engine'
                });

                await lead.save();

                // Auto-create High-Priority task due in 24 hours
                const taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                const assignedRep = lead.assignedTo || dbEmail.sentBy;

                await Task.create({
                  subject: `Gmail Sync Auto-followup: Response from ${lead.firstName} ${lead.lastName || ''}`,
                  dueDate: taskDueDate,
                  priority: 'High',
                  status: 'Pending',
                  notes: `Automated Sync Task: Client responded to proposal: "${dbEmail.subject}".\n\nReply:\n"${incomingEmailBody}"\n\nReview this in Email Hub and complete requirements.`,
                  assignedTo: assignedRep,
                  leadId: lead._id
                });

                // Generate system notification banner for Assigned Rep
                await Notification.create({
                  recipientId: assignedRep,
                  senderId: null,
                  type: 'Lead',
                  title: '💬 Client Replied to Proposal!',
                  message: `Lead ${lead.firstName} (${lead.company}) replied via Gmail: "${incomingEmailBody.slice(0, 60)}${incomingEmailBody.length > 60 ? '...' : ''}" - Lead Score boosted by +30 (Score: ${lead.score})!`,
                  link: '/dashboard/tasks'
                });
              }
            } else if (dbEmail.contactId) {
              const contact = await Contact.findById(dbEmail.contactId._id);
              if (contact) {
                // Push activity note on Contact's timeline
                contact.notes.push({
                  text: `💬 Received Gmail Reply (Subject: "${dbEmail.subject}"): "${incomingEmailBody.slice(0, 150)}${incomingEmailBody.length > 150 ? '...' : ''}"`,
                  createdBy: dbEmail.sentBy,
                  createdByName: 'Gmail Reply Sync Engine'
                });
                await contact.save();

                // Create Auto-Task for Contact
                const taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                const assignedRep = contact.assignedTo || dbEmail.sentBy;

                await Task.create({
                  subject: `Gmail Sync Auto-followup: Response from Contact ${contact.firstName}`,
                  dueDate: taskDueDate,
                  priority: 'High',
                  status: 'Pending',
                  notes: `Automated Sync Task: Contact responded to proposal: "${dbEmail.subject}".\n\nReply:\n"${incomingEmailBody}"\n\nReview this and contact client.`,
                  assignedTo: assignedRep,
                  contactId: contact._id
                });

                // Create Notification
                await Notification.create({
                  recipientId: assignedRep,
                  senderId: null,
                  type: 'System',
                  title: '💬 Contact Replied!',
                  message: `Contact ${contact.firstName} (${contact.company}) replied via Gmail: "${incomingEmailBody.slice(0, 60)}${incomingEmailBody.length > 60 ? '...' : ''}" - High-priority follow-up task assigned.`,
                  link: '/dashboard/tasks'
                });
              }
            }

            syncedCount++;
            syncedDetails.push({
              emailId: dbEmail._id,
              subject: dbEmail.subject,
              client: clientEmail,
              replyExcerpt: incomingEmailBody.slice(0, 50) + (incomingEmailBody.length > 50 ? '...' : '')
            });
          }
        }
      }
    } finally {
      // Ensure the lock is released even if errors occur during message scans
      lock.release();
    }

    // 8. Gracefully close connection to the IMAP server
    await client.logout();

    return NextResponse.json({
      success: true,
      message: syncedCount > 0 
        ? `Successfully synchronized ${syncedCount} real email response(s) from your Gmail inbox!` 
        : 'All CRM emails are up-to-date. No new client responses detected in Gmail inbox.',
      syncedCount,
      syncedDetails
    });

  } catch (error) {
    console.error('IMAP mail synchronization error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to synchronize emails via Gmail IMAP.', 
        details: error.message || 'Verification of network ports or App Password failed.' 
      },
      { status: 500 }
    );
  }
}
