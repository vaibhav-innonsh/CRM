import connectToDatabase from '@/lib/db';
import Email from '@/lib/models/Email';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import Task from '@/lib/models/Task';
import Notification from '@/lib/models/Notification';
import { supabase } from '@/lib/supabaseClient';
import { createNotification } from '@/lib/notifications';
import { mapEmailToFrontend } from '@/lib/dbMapper';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Email ID is required.' }, { status: 400 });
    }

    let email;
    let automationsTriggered = [];

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

    if (supabase) {
      const { data, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !data) {
        return NextResponse.json({ error: 'Email not found.' }, { status: 404 });
      }
      email = data;

      // Set replied status and body
      const { error: updateError } = await supabase
        .from('emails')
        .update({
          replied: true,
          replied_at: new Date().toISOString(),
          reply_body: replyBody
        })
        .eq('id', id);

      if (updateError) {
        console.error('Supabase email reply update error:', updateError);
        throw updateError;
      }

      email.replied = true;
      email.replied_at = new Date().toISOString();
      email.reply_body = replyBody;

      // Trigger Lead Specific Automation
      if (email.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', email.lead_id)
          .maybeSingle();

        if (lead) {
          // Boost Lead Score by +30
          const newScore = (lead.score || 0) + 30;
          await supabase
            .from('leads')
            .update({ score: newScore })
            .eq('id', lead.id);

          // Add follow-up timeline action with reply content
          const noteText = `💬 Client Replied (Subject: "${email.subject}"): "${replyBody}"`;
          await supabase.from('lead_notes').insert([{
            lead_id: lead.id,
            text: noteText,
            created_by: email.sent_by,
            created_by_name: 'Reply Tracker Engine'
          }]);

          automationsTriggered.push('lead_score_updated');

          // Create Auto Follow-up Task (High Priority, due in 24 hours)
          const taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const assignedRep = lead.assigned_to || email.sent_by;

          const { data: followupTask, error: taskError } = await supabase
            .from('tasks')
            .insert([{
              subject: `Auto-followup: Client replied to "${email.subject}"`,
              due_date: taskDueDate.toISOString(),
              priority: 'High',
              status: 'Pending',
              notes: `Automated Task: The client responded to proposal email: "${email.subject}".\n\nReply Message:\n"${replyBody}"\n\nReview their response and finalize deal requirements.`,
              assigned_to: assignedRep,
              lead_id: lead.id
            }])
            .select()
            .single();

          if (taskError) {
            console.error('Failed to create auto followup task:', taskError);
          } else {
            automationsTriggered.push(`followup_task_created:${followupTask.id}`);
          }

          // Trigger System Notification Alert for Sales Rep
          await createNotification(
            assignedRep,
            'Lead',
            '💬 Client Replied to Proposal!',
            `Lead ${lead.first_name} (${lead.company || ''}) replied: "${replyBody.slice(0, 60)}${replyBody.length > 60 ? '...' : ''}" - High-priority follow-up task has been automatically assigned to you. Lead Score boosted by +30 (New Score: ${newScore})!`,
            '/dashboard/tasks',
            null
          );
          automationsTriggered.push('notification_sent');
        }
      } else if (email.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', email.contact_id)
          .maybeSingle();

        if (contact) {
          // Create Task for Contact
          const taskDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const assignedRep = contact.assigned_to || email.sent_by;

          const { data: followupTask, error: taskError } = await supabase
            .from('tasks')
            .insert([{
              subject: `Auto-followup: Contact replied to "${email.subject}"`,
              due_date: taskDueDate.toISOString(),
              priority: 'High',
              status: 'Pending',
              notes: `Automated Task: The contact responded to email: "${email.subject}".\n\nReply Message:\n"${replyBody}"\n\nPlease reach out to them within 24 hours.`,
              assigned_to: assignedRep,
              contact_id: contact.id
            }])
            .select()
            .single();

          if (taskError) {
            console.error('Failed to create auto followup task for contact:', taskError);
          } else {
            automationsTriggered.push(`followup_task_created:${followupTask.id}`);
          }

          await createNotification(
            assignedRep,
            'System',
            '💬 Contact Replied!',
            `Contact ${contact.first_name} (${contact.company || ''}) replied: "${replyBody.slice(0, 60)}${replyBody.length > 60 ? '...' : ''}" - High-priority follow-up task has been automatically created.`,
            '/dashboard/tasks',
            null
          );
          automationsTriggered.push('notification_sent');
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Reply simulation successful! Lead metrics updated and follow-up task created.',
        email: mapEmailToFrontend(email),
        automationsTriggered
      });
    } else {
      await connectToDatabase();

      const mongoEmail = await Email.findById(id);
      if (!mongoEmail) {
        return NextResponse.json({ error: 'Email not found.' }, { status: 404 });
      }
      email = mongoEmail;

      // Set replied status and body
      email.replied = true;
      email.repliedAt = new Date();
      email.replyBody = replyBody;
      await email.save();

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
    }
  } catch (error) {
    console.error('Reply simulation tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error during reply simulation.', details: error.message },
      { status: 500 }
    );
  }
}
