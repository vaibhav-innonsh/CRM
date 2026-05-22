import connectToDatabase from '@/lib/db';
import Task from '@/lib/models/Task';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { mapTaskToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/tasks - Retrieve active CRM tasks lists based on role bounds
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const assignedTo = searchParams.get('assignedTo') || '';

    if (supabase) {
      let queryBuilder = supabase
        .from('tasks')
        .select('*, users(id, name, email, role), leads(id, first_name, last_name, company, status), contacts(id, first_name, last_name, company, status)');

      // 1. ROLE-BASED ACCESS CONTROL (RBAC) ISOLATION
      if (decodedUser.role === 'sales_rep') {
        // Sales reps can strictly only view their own tasks
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      } else if (assignedTo) {
        // Admins/Managers can filter tasks by specific rep
        queryBuilder = queryBuilder.eq('assigned_to', assignedTo);
      }

      // 2. Filter by status
      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      // 3. Filter by priority
      if (priority) {
        queryBuilder = queryBuilder.eq('priority', priority);
      }

      // 4. Text Search filtering (matches subject or notes)
      if (search) {
        queryBuilder = queryBuilder.ilike('subject', `%${search}%`);
      }

      const { data, error } = await queryBuilder.order('due_date', { ascending: true });

      if (error) {
        console.error('Supabase fetch tasks error:', error);
        throw error;
      }

      const tasks = (data || []).map(mapTaskToFrontend);

      return NextResponse.json({
        success: true,
        tasks
      });

    } else {
      await connectToDatabase();

      // Build database query filters
      let query = {};

      // 1. ROLE-BASED ACCESS CONTROL (RBAC) ISOLATION
      if (decodedUser.role === 'sales_rep') {
        // Sales reps can strictly only view their own tasks
        query.assignedTo = decodedUser.id;
      } else if (assignedTo) {
        // Admins/Managers can filter tasks by specific rep
        query.assignedTo = assignedTo;
      }

      // 2. Filter by status
      if (status) {
        query.status = status;
      }

      // 3. Filter by priority
      if (priority) {
        query.priority = priority;
      }

      // 4. Text Search filtering (matches subject or notes)
      if (search) {
        query.subject = new RegExp(search, 'i');
      }

      // Fetch tasks, populate relations to leads, contacts, and assignees
      const tasks = await Task.find(query)
        .populate('assignedTo', 'name email role')
        .populate('leadId', 'firstName lastName company status')
        .populate('contactId', 'firstName lastName company status')
        .sort({ dueDate: 1 }); // Sorted by closest due dates first

      return NextResponse.json({
        success: true,
        tasks
      });
    }
  } catch (error) {
    console.error('Fetch tasks list API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching tasks list.' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new CRM task / reminder entry
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      subject,
      dueDate,
      priority,
      status,
      notes,
      assignedTo,
      leadId,
      contactId
    } = body;

    // Validation
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Task subject is required.' }, { status: 400 });
    }
    if (!dueDate) {
      return NextResponse.json({ error: 'Due date is required.' }, { status: 400 });
    }

    // Set target assignee
    let targetAssignee = decodedUser.id;
    if (decodedUser.role !== 'sales_rep' && assignedTo) {
      targetAssignee = assignedTo;
    }

    if (supabase) {
      // Create the task record
      const { data: newTask, error: insertError } = await supabase
        .from('tasks')
        .insert([
          {
            subject: subject.trim(),
            due_date: new Date(dueDate).toISOString(),
            priority: priority || 'Medium',
            status: status || 'Pending',
            notes: notes || '',
            assigned_to: targetAssignee,
            lead_id: leadId || null,
            contact_id: contactId || null
          }
        ])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase task insert error:', insertError);
        throw insertError;
      }

      // If linked to a lead, log an automatic follow-up note in lead history!
      if (leadId) {
        try {
          const formattedDueDate = new Date(dueDate).toLocaleString('en-IN');
          await supabase
            .from('lead_notes')
            .insert([
              {
                lead_id: leadId,
                text: `📅 Scheduled Task: "${newTask.subject}" due on ${formattedDueDate}`,
                created_by: decodedUser.id,
                created_by_name: decodedUser.name
              }
            ]);
        } catch (err) {
          console.error('Failed to log task on lead timeline:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Task created successfully!',
        task: mapTaskToFrontend(newTask)
      }, { status: 201 });

    } else {
      await connectToDatabase();

      // Create the task record
      const newTask = await Task.create({
        subject: subject.trim(),
        dueDate: new Date(dueDate),
        priority: priority || 'Medium',
        status: status || 'Pending',
        notes: notes || '',
        assignedTo: targetAssignee,
        leadId: leadId || null,
        contactId: contactId || null
      });

      // If linked to a lead, log an automatic follow-up note in lead history!
      if (leadId) {
        try {
          const lead = await Lead.findById(leadId);
          if (lead) {
            lead.notes.push({
              text: `📅 Scheduled Task: "${newTask.subject}" due on ${newTask.dueDate.toLocaleString('en-IN')}`,
              createdBy: decodedUser.id,
              createdByName: decodedUser.name
            });
            await lead.save();
          }
        } catch (err) {
          console.error('Failed to log task on lead timeline:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Task created successfully!',
        task: newTask
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating task.', details: error.message },
      { status: 500 }
    );
  }
}

