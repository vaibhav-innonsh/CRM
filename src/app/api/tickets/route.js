import connectToDatabase from '@/lib/db';
import SupportTicket from '@/lib/models/SupportTicket';
import User from '@/lib/models/User';
import Contact from '@/lib/models/Contact';
import { supabase } from '@/lib/supabaseClient';
import { mapTicketToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/tickets - Fetch support tickets lists with filtering & search
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'support')) {
      return NextResponse.json(
        { error: '🔒 Support Ticket module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const ticketType = searchParams.get('ticketType') || '';
    const assignedToFilter = searchParams.get('assignedTo') || '';

    let tickets = [];

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      let queryBuilder = supabase
        .from('support_tickets')
        .select('*, contacts(id, first_name, last_name, email), users(id, name, email, role)');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // ROLE-BASED ACCESS CONTROL (RBAC) SECURITY ENFORCEMENT
      if (decodedUser.role === 'sales_rep') {
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      } else if (assignedToFilter) {
        queryBuilder = queryBuilder.eq('assigned_to', assignedToFilter);
      }

      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      if (priority) {
        queryBuilder = queryBuilder.eq('priority', priority);
      }

      if (ticketType) {
        queryBuilder = queryBuilder.eq('ticket_type', ticketType);
      }

      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(
          `ticket_id.ilike.${s},title.ilike.${s},description.ilike.${s}`
        );
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch support tickets error:', error);
        throw error;
      }

      tickets = (data || []).map(mapTicketToFrontend);

    } else {
      // Fallback to MongoDB
      await connectToDatabase();
      let query = {};

      if (decodedUser.orgId) {
        query.orgId = decodedUser.orgId;
      }

      if (decodedUser.role === 'sales_rep') {
        query.assignedTo = decodedUser.id;
      } else if (assignedToFilter) {
        query.assignedTo = assignedToFilter;
      }

      if (status) {
        query.status = status;
      }

      if (priority) {
        query.priority = priority;
      }

      if (ticketType) {
        query.ticketType = ticketType;
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        query.$or = [
          { ticketId: searchRegex },
          { title: searchRegex },
          { description: searchRegex }
        ];
      }

      const mongoTickets = await SupportTicket.find(query)
        .populate('contactId', 'firstName lastName email')
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 });

      tickets = mongoTickets;
    }

    return NextResponse.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Fetch tickets API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching support tickets.' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new support ticket
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'support')) {
      return NextResponse.json(
        { error: '🔒 Support Ticket module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      ticketType,
      priority,
      contactId,
      assignedTo,
      attachments
    } = body;

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Ticket Title is required.' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Ticket Description is required.' }, { status: 400 });
    }
    if (!ticketType) {
      return NextResponse.json({ error: 'Ticket Type / Reason is required.' }, { status: 400 });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const generatedTicketId = `TKT-${randomNum}`;

    let finalTicket = null;

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      const { data: newTicket, error: insertError } = await supabase
        .from('support_tickets')
        .insert([
          {
            ticket_id: generatedTicketId,
            title: title.trim(),
            description: description.trim(),
            ticket_type: ticketType,
            priority: priority || 'Medium',
            status: 'New',
            org_id: decodedUser.orgId,
            contact_id: contactId || null,
            assigned_to: assignedTo || null,
            attachments: attachments || []
          }
        ])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase create support ticket error:', insertError);
        throw insertError;
      }

      // Refreshed fetch to get joined relation data
      const { data: refreshedTicket } = await supabase
        .from('support_tickets')
        .select('*, contacts(id, first_name, last_name, email), users(id, name, email, role)')
        .eq('id', newTicket.id)
        .single();

      finalTicket = mapTicketToFrontend(refreshedTicket);

    } else {
      // Fallback to MongoDB
      await connectToDatabase();

      const mongoTicket = await SupportTicket.create({
        ticketId: generatedTicketId,
        title: title.trim(),
        description: description.trim(),
        ticketType,
        priority: priority || 'Medium',
        status: 'New',
        orgId: decodedUser.orgId,
        contactId: contactId || null,
        assignedTo: assignedTo || null,
        attachments: attachments || []
      });

      // Populate relation data
      const populatedTicket = await SupportTicket.findById(mongoTicket._id)
        .populate('contactId', 'firstName lastName email')
        .populate('assignedTo', 'name email role');

      finalTicket = populatedTicket;
    }

    return NextResponse.json({
      success: true,
      message: 'Support Ticket logged successfully!',
      ticket: finalTicket
    }, { status: 201 });

  } catch (error) {
    console.error('Create support ticket error:', error);
    return NextResponse.json(
      { error: 'Internal server error while logging support ticket.', details: error.message },
      { status: 500 }
    );
  }
}
