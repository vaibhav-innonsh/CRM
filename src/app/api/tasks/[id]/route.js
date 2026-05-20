import connectToDatabase from '@/lib/db';
import Task from '@/lib/models/Task';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// PUT /api/tasks/[id] - Update task details or change status
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Sales Rep can strictly only update tasks assigned to them
    if (
      decodedUser.role === 'sales_rep' &&
      task.assignedTo.toString() !== decodedUser.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to modify this task.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      subject,
      dueDate,
      priority,
      status,
      notes,
      assignedTo
    } = body;

    // Validate parameters
    if (subject !== undefined && !subject.trim()) {
      return NextResponse.json({ error: 'Task subject cannot be empty.' }, { status: 400 });
    }

    // Apply updates
    if (subject !== undefined) task.subject = subject.trim();
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (notes !== undefined) task.notes = notes.trim();

    // Owner/Manager can re-assign tasks
    if (decodedUser.role !== 'sales_rep' && assignedTo !== undefined) {
      task.assignedTo = assignedTo || decodedUser.id;
    }

    await task.save();

    return NextResponse.json({
      success: true,
      message: 'Task details updated successfully.',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating task.' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Remove task entry
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const task = await Task.findById(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Sales Rep can strictly only delete tasks assigned to them
    if (
      decodedUser.role === 'sales_rep' &&
      task.assignedTo.toString() !== decodedUser.id
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to delete this task.' },
        { status: 403 }
      );
    }

    await Task.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error while removing task.' },
      { status: 500 }
    );
  }
}
