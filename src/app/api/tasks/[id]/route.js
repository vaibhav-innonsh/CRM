import connectToDatabase from '@/lib/db';
import Task from '@/lib/models/Task';
import { supabase } from '@/lib/supabaseClient';
import { mapTaskToFrontend } from '@/lib/dbMapper';
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

    if (supabase) {
      // Fetch task to perform RBAC check
      let query = supabase.from('tasks').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: task, error: fetchError } = await query.single();

      if (fetchError || !task) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Sales Rep can strictly only update tasks assigned to them
      if (
        decodedUser.role === 'sales_rep' &&
        task.assigned_to !== decodedUser.id
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

      const updates = {};
      if (subject !== undefined) updates.subject = subject.trim();
      if (dueDate !== undefined) updates.due_date = new Date(dueDate).toISOString();
      if (priority !== undefined) updates.priority = priority;
      if (status !== undefined) updates.status = status;
      if (notes !== undefined) updates.notes = notes.trim();

      // Owner/Manager can re-assign tasks
      if (decodedUser.role !== 'sales_rep' && assignedTo !== undefined) {
        updates.assigned_to = assignedTo || decodedUser.id;
      }

      let updateQuery = supabase.from('tasks').update(updates).eq('id', id);
      if (decodedUser.orgId) {
        updateQuery = updateQuery.eq('org_id', decodedUser.orgId);
      }
      const { data: updatedTask, error: updateError } = await updateQuery
        .select('*, users(id, name, email, role), leads(id, first_name, last_name, company, status), contacts(id, first_name, last_name, company, status)')
        .single();

      if (updateError) {
        console.error('Supabase update task error:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Task details updated successfully.',
        task: mapTaskToFrontend(updatedTask)
      });

    } else {
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
    }
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

    if (supabase) {
      // Fetch task to perform RBAC check
      let query = supabase.from('tasks').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: task, error: fetchError } = await query.single();

      if (fetchError || !task) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Sales Rep can strictly only delete tasks assigned to them
      if (
        decodedUser.role === 'sales_rep' &&
        task.assigned_to !== decodedUser.id
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to delete this task.' },
          { status: 403 }
        );
      }

      let deleteQuery = supabase.from('tasks').delete().eq('id', id);
      if (decodedUser.orgId) {
        deleteQuery = deleteQuery.eq('org_id', decodedUser.orgId);
      }
      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('Supabase delete task error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Task deleted successfully.'
      });

    } else {
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
    }
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error while removing task.' },
      { status: 500 }
    );
  }
}

