import connectToDatabase from '@/lib/db';
import SupportTicket from '@/lib/models/SupportTicket';
import { supabase } from '@/lib/supabaseClient';
import { mapTicketCommentToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST /api/tickets/[id]/comments - Log a new comment on a ticket thread
export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const body = await req.json();
    const { commentText, isInternal } = body;

    if (!commentText || !commentText.trim()) {
      return NextResponse.json({ error: 'Comment text is required.' }, { status: 400 });
    }

    let finalComment = null;

    if (supabase) {
      // 1. Fetch ticket to verify it exists and is isolation-authorized
      let query = supabase.from('support_tickets').select('*').eq('id', id);
      if (decodedUser.orgId) {
        query = query.eq('org_id', decodedUser.orgId);
      }
      const { data: ticket, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;
      if (!ticket) {
        return NextResponse.json({ error: 'Support ticket not found.' }, { status: 404 });
      }

      // Security check: Sales rep can only comment on tickets assigned to them
      if (decodedUser.role === 'sales_rep' && ticket.assigned_to !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have access to this ticket.' },
          { status: 403 }
        );
      }

      // 2. Insert comment into PostgreSQL
      const { data: newComment, error: commentError } = await supabase
        .from('ticket_comments')
        .insert([
          {
            ticket_id: id,
            sender_id: decodedUser.id,
            sender_name: decodedUser.name || decodedUser.email,
            comment_text: commentText.trim(),
            is_internal: isInternal || false
          }
        ])
        .select('*')
        .single();

      if (commentError) {
        console.error('Supabase create comment error:', commentError);
        throw commentError;
      }

      finalComment = mapTicketCommentToFrontend(newComment);

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
          { error: 'Forbidden. You do not have access to this ticket.' },
          { status: 403 }
        );
      }

      // Add comment to Mongoose schema array
      const commentObj = {
        text: commentText.trim(),
        sender: decodedUser.id,
        senderName: decodedUser.name || decodedUser.email,
        isInternal: isInternal || false
      };

      mongoTicket.comments.push(commentObj);
      await mongoTicket.save();

      // Retrieve the newly pushed comment (it will be the last element)
      const addedComment = mongoTicket.comments[mongoTicket.comments.length - 1];
      
      finalComment = {
        _id: addedComment._id,
        id: addedComment._id,
        commentText: addedComment.text,
        senderId: addedComment.sender,
        senderName: addedComment.senderName,
        isInternal: addedComment.isInternal,
        createdAt: addedComment.createdAt
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully.',
      comment: finalComment
    }, { status: 201 });

  } catch (error) {
    console.error('Create ticket comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error while logging ticket comment.' },
      { status: 500 }
    );
  }
}
