import connectToDatabase from '@/lib/db';
import Task from '@/lib/models/Task';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import User from '@/lib/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/tasks - Retrieve active CRM tasks lists based on role bounds
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const assignedTo = searchParams.get('assignedTo') || '';

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

    await connectToDatabase();

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
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating task.', details: error.message },
      { status: 500 }
    );
  }
}
