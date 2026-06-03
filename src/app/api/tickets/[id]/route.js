import connectToDatabase from '@/lib/db';
import SupportTicket from '@/lib/models/SupportTicket';
import { supabase } from '@/lib/supabaseClient';
import { mapTicketToFrontend, mapTicketCommentToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/tickets/[id] - Retrieve detailed support ticket with comment thread
export async function GET(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (supabase) {
      let query = supabase
        .from('support_tickets')
        .select('*, contacts(id, first_name, last_name, email), users(id, name, email, role)')
        .eq('id', id);

      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }

      const { data: ticket, error: fetchError } = await query.maybeSingle();

      if (fetchError) {
        console.error('Supabase fetch ticket error:', fetchError);
        throw fetchError;
      }

      if (!ticket) {
        return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
      }

      // RBAC validation: Reps can only view tickets assigned to them
      if (decodedUser.role === 'sales_rep' && ticket.assigned_to !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have access to this ticket.' },
          { status: 403 }
        );
      }

      // Fetch comments for this ticket
      const { data: comments, error: commentError } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      if (commentError) {
        console.error('Supabase fetch ticket comments error:', commentError);
        throw commentError;
      }

      // Join comments with ticket object for mapping
      ticket.ticket_comments = comments || [];

      return NextResponse.json({
        success: true,
        ticket: mapTicketToFrontend(ticket)
      });

    } else {
      // Fallback to MongoDB
      await connectToDatabase();

      let query = { _id: id };
      if (decodedUser.orgId) {
        query.orgId = decodedUser.orgId;
      }

      const mongoTicket = await SupportTicket.findOne(query)
        .populate('contactId', 'firstName lastName email')
        .populate('assignedTo', 'name email role');

      if (!mongoTicket) {
        return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
      }

      if (decodedUser.role === 'sales_rep' && mongoTicket.assignedTo?.toString() !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have access to this ticket.' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        ticket: mongoTicket
      });
    }
  } catch (error) {
    console.error('Fetch ticket details error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching support ticket details.' },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update support ticket status, priority, or assignment
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      ticketType,
      priority,
      status,
      assignedTo,
      contactId
    } = body;

    if (supabase) {
      // Fetch ticket to check authorization
      let query = supabase.from('support_tickets').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: ticket, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;
      if (!ticket) {
        return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
      }

      // Security check: Sales rep can only modify tickets assigned to them
      if (decodedUser.role === 'sales_rep' && ticket.assigned_to !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have access to modify this ticket.' },
          { status: 403 }
        );
      }

      const updates = {
        updated_at: new Date().toISOString()
      };

      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description.trim();
      if (ticketType !== undefined) updates.ticket_type = ticketType;
      if (priority !== undefined) updates.priority = priority;
      if (contactId !== undefined) updates.contact_id = contactId || null;

      // Handle resolving status
      if (status !== undefined) {
        updates.status = status;
        if (status === 'Resolved' || status === 'Closed') {
          updates.resolved_at = new Date().toISOString();
        } else {
          updates.resolved_at = null;
        }
      }

      // Only Admin or managers can change assignees
      if (decodedUser.role !== 'sales_rep' && assignedTo !== undefined) {
        updates.assigned_to = assignedTo || null;
      }

      const { data: updatedTicket, error: updateError } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id)
        .select('*, contacts(id, first_name, last_name, email), users(id, name, email, role)')
        .single();

      if (updateError) {
        console.error('Supabase update support ticket error:', updateError);
        throw updateError;
      }

      // Fetch comments for full details mapping compatibility
      const { data: comments } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });

      updatedTicket.ticket_comments = comments || [];

      return NextResponse.json({
        success: true,
        message: 'Support Ticket updated successfully.',
        ticket: mapTicketToFrontend(updatedTicket)
      });

    } else {
      // Fallback to MongoDB
      await connectToDatabase();

      let query = { _id: id };
      if (decodedUser.orgId) {
        query.orgId = decodedUser.orgId;
      }

      const mongoTicket = await SupportTicket.findOne(query);

      if (!mongoTicket) {
        return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
      }

      if (decodedUser.role === 'sales_rep' && mongoTicket.assignedTo?.toString() !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have access to modify this ticket.' },
          { status: 403 }
        );
      }

      if (title !== undefined) mongoTicket.title = title.trim();
      if (description !== undefined) mongoTicket.description = description.trim();
      if (ticketType !== undefined) mongoTicket.ticketType = ticketType;
      if (priority !== undefined) mongoTicket.priority = priority;
      if (contactId !== undefined) mongoTicket.contactId = contactId || null;

      if (status !== undefined) {
        mongoTicket.status = status;
        if (status === 'Resolved' || status === 'Closed') {
          mongoTicket.resolvedAt = new Date();
        } else {
          mongoTicket.resolvedAt = null;
        }
      }

      if (decodedUser.role !== 'sales_rep' && assignedTo !== undefined) {
        mongoTicket.assignedTo = assignedTo || null;
      }

      await mongoTicket.save();

      const populatedTicket = await SupportTicket.findById(id)
        .populate('contactId', 'firstName lastName email')
        .populate('assignedTo', 'name email role');

      return NextResponse.json({
        success: true,
        message: 'Support Ticket updated successfully.',
        ticket: populatedTicket
      });
    }
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating support ticket.' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Permanently delete support ticket (Owners and Admins only)
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role !== 'owner' && decodedUser.role !== 'sales_admin') {
      return NextResponse.json(
        { error: 'Forbidden. Only Owners or Sales Administrators can delete tickets.' },
        { status: 403 }
      );
    }

    if (supabase) {
      let query = supabase.from('support_tickets').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: ticket, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;
      if (!ticket) {
        return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
      }

      const { error: deleteError } = await supabase
        .from('support_tickets')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase delete ticket error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Support Ticket deleted successfully.'
      });

    } else {
      // Fallback to MongoDB
      await connectToDatabase();

      let query = { _id: id };
      if (decodedUser.orgId) {
        query.orgId = decodedUser.orgId;
      }

      const deletedTicket = await SupportTicket.findOneAndDelete(query);

      if (!deletedTicket) {
        return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Support Ticket deleted successfully.'
      });
    }
  } catch (error) {
    console.error('Delete ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting support ticket.' },
      { status: 500 }
    );
  }
}
