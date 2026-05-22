import connectToDatabase from '@/lib/db';
import Email from '@/lib/models/Email';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import Task from '@/lib/models/Task';
import Notification from '@/lib/models/Notification';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Email ID is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const email = await Email.findById(id);
    if (!email) {
      return NextResponse.json({ error: 'Email not found.' }, { status: 404 });
    }

    // Try parsing reply body from request payload
    let replyBody = "Hi team, the proposal looks amazing. Let's schedule a call tomorrow to finalize!";
    try {
      const reqBody = await req.json();
      if (reqBody && reqBody.replyBody && reqBody.replyBody.trim()) {
        replyBody = reqBody.replyBody.trim();
      }
    } catch (e) {
      // Body may be empty or not JSON, fallback to default
    }

    // Set replied status and body
    email.replied = true;
    email.repliedAt = new Date();
    email.replyBody = replyBody;
    await email.save();

    let automationsTriggered = [];

    // Trigger Lead Specific Automation
    if (email.leadId) {
      const lead = await Lead.findById(email.leadId);
      if (lead) {
        // Boost Lead Score by +30
        lead.score = (lead.score || 0) + 30;

        // Add follow-up timeline action with reply content
        lead.notes.push({
          text: `💬 Client Replied (Subject: "${email.subject}"): "${replyBody}"`,
          createdBy: email.sentBy,
          createdByName: 'Reply Tracker Engine'
        });

        await lead.save();
        automationsTriggered.push('lead_score_updated');

        // Create Auto Follow-up Task (High Priority, due in 24 hours)
        const taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const assignedRep = lead.assignedTo || email.sentBy;

        const followupTask = await Task.create({
          subject: `Auto-followup: Client replied to "${email.subject}"`,
          dueDate: taskDueDate,
          priority: 'High',
          status: 'Pending',
          notes: `Automated Task: The client responded to proposal email: "${email.subject}".\n\nReply Message:\n"${replyBody}"\n\nReview their response and finalize deal requirements.`,
          assignedTo: assignedRep,
          leadId: lead._id
        });
        automationsTriggered.push(`followup_task_created:${followupTask._id}`);

        // Trigger System Notification Alert for Sales Rep
        await Notification.create({
          recipientId: assignedRep,
          senderId: null,
          type: 'Lead',
          title: '💬 Client Replied to Proposal!',
          message: `Lead ${lead.firstName} (${lead.company}) replied: "${replyBody.slice(0, 60)}${replyBody.length > 60 ? '...' : ''}" - High-priority follow-up task has been automatically assigned to you. Lead Score boosted by +30 (New Score: ${lead.score})!`,
          link: '/dashboard/tasks'
        });
        automationsTriggered.push('notification_sent');
      }
    } else if (email.contactId) {
      const contact = await Contact.findById(email.contactId);
      if (contact) {
        contact.notes.push({
          text: `💬 Client Replied (Subject: "${email.subject}"): "${replyBody}"`,
          createdBy: email.sentBy,
          createdByName: 'Reply Tracker Engine'
        });
        await contact.save();
        automationsTriggered.push('contact_notes_updated');

        // Create Task for Contact
        const taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const assignedRep = contact.assignedTo || email.sentBy;

        const followupTask = await Task.create({
          subject: `Auto-followup: Contact replied to "${email.subject}"`,
          dueDate: taskDueDate,
          priority: 'High',
          status: 'Pending',
          notes: `Automated Task: The contact responded to email: "${email.subject}".\n\nReply Message:\n"${replyBody}"\n\nPlease reach out to them within 24 hours.`,
          assignedTo: assignedRep,
          contactId: contact._id
        });
        automationsTriggered.push(`followup_task_created:${followupTask._id}`);

        await Notification.create({
          recipientId: assignedRep,
          senderId: null,
          type: 'System',
          title: '💬 Contact Replied!',
          message: `Contact ${contact.firstName} (${contact.company}) replied: "${replyBody.slice(0, 60)}${replyBody.length > 60 ? '...' : ''}" - High-priority follow-up task has been automatically created.`,
          link: '/dashboard/tasks'
        });
        automationsTriggered.push('notification_sent');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reply simulation successful! Lead metrics updated and follow-up task created.',
      email,
      automationsTriggered
    });
  } catch (error) {
    console.error('Reply simulation tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error during reply simulation.', details: error.message },
      { status: 500 }
    );
  }
}
