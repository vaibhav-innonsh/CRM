import connectToDatabase from '@/lib/db';
import Call from '@/lib/models/Call';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { mapCallToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/calls - Fetch corporate calls logs list with security isolations
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const callType = searchParams.get('callType') || '';
    const callResult = searchParams.get('callResult') || '';
    const assignedTo = searchParams.get('assignedTo') || '';

    if (supabase) {
      let queryBuilder = supabase
        .from('calls')
        .select('*, users(id, name, email, role), leads(id, first_name, last_name, company, status), contacts(id, first_name, last_name, company, status)');

      // 1. ROLE-BASED SEGREGATION
      if (decodedUser.role === 'sales_rep') {
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      } else if (assignedTo) {
        queryBuilder = queryBuilder.eq('assigned_to', assignedTo);
      }

      // 2. Additional filtering
      if (callType) {
        queryBuilder = queryBuilder.eq('call_type', callType);
      }
      if (callResult) {
        queryBuilder = queryBuilder.eq('call_result', callResult);
      }

      // 3. Search query matches call subject
      if (search) {
        queryBuilder = queryBuilder.ilike('subject', `%${search}%`);
      }

      const { data, error } = await queryBuilder.order('call_time', { ascending: false });

      if (error) {
        console.error('Supabase fetch calls error:', error);
        throw error;
      }

      const calls = (data || []).map(mapCallToFrontend);

      return NextResponse.json({
        success: true,
        calls
      });

    } else {
      await connectToDatabase();

      // Query filters
      let query = {};

      // 1. ROLE-BASED SEGREGATION
      if (decodedUser.role === 'sales_rep') {
        query.assignedTo = decodedUser.id;
      } else if (assignedTo) {
        query.assignedTo = assignedTo;
      }

      // 2. Additional filtering
      if (callType) query.callType = callType;
      if (callResult) query.callResult = callResult;

      // 3. Search query matches call subject
      if (search) {
        query.subject = new RegExp(search, 'i');
      }

      // Fetch and populate
      const calls = await Call.find(query)
        .populate('assignedTo', 'name email role')
        .populate('leadId', 'firstName lastName company status')
        .populate('contactId', 'firstName lastName company status')
        .sort({ callTime: -1 }); // Latest calls first

      return NextResponse.json({
        success: true,
        calls
      });
    }
  } catch (error) {
    console.error('Fetch calls list API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching call logs list.' },
      { status: 500 }
    );
  }
}

// POST /api/calls - Log a new call activity record
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      subject,
      callType,
      callDuration,
      callResult,
      callTime,
      notes,
      assignedTo,
      leadId,
      contactId
    } = body;

    // Validation
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'Call subject is required.' }, { status: 400 });
    }

    // Set target assignee
    let targetAssignee = decodedUser.id;
    if (decodedUser.role !== 'sales_rep' && assignedTo) {
      targetAssignee = assignedTo;
    }

    if (supabase) {
      const callData = {
        subject: subject.trim(),
        call_type: callType || 'Outbound',
        call_duration: Number(callDuration) || 0,
        call_result: callResult || 'Answered',
        call_time: callTime ? new Date(callTime).toISOString() : new Date().toISOString(),
        notes: notes || '',
        assigned_to: targetAssignee,
        lead_id: leadId || null,
        contact_id: contactId || null
      };

      const { data: newCall, error: insertError } = await supabase
        .from('calls')
        .insert([callData])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase call insert error:', insertError);
        throw insertError;
      }

      // Auto-log inside Lead timeline if applicable
      if (leadId) {
        try {
          const durationStr = newCall.call_duration >= 60 
            ? `${Math.floor(newCall.call_duration / 60)}m ${newCall.call_duration % 60}s` 
            : `${newCall.call_duration}s`;

          await supabase
            .from('lead_notes')
            .insert([
              {
                lead_id: leadId,
                text: `📞 Logged ${newCall.call_type} Call: "${newCall.subject}" | Outcome: ${newCall.call_result} (Duration: ${durationStr})`,
                created_by: decodedUser.id,
                created_by_name: decodedUser.name
              }
            ]);
        } catch (err) {
          console.error('Failed to auto-log call in lead notes:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Call activity logged successfully!',
        call: mapCallToFrontend(newCall)
      }, { status: 201 });

    } else {
      await connectToDatabase();

      // Save call log
      const newCall = await Call.create({
        subject: subject.trim(),
        callType: callType || 'Outbound',
        callDuration: Number(callDuration) || 0,
        callResult: callResult || 'Answered',
        callTime: callTime ? new Date(callTime) : new Date(),
        notes: notes || '',
        assignedTo: targetAssignee,
        leadId: leadId || null,
        contactId: contactId || null
      });

      // Auto-log inside Lead timeline if applicable
      if (leadId) {
        try {
          const lead = await Lead.findById(leadId);
          if (lead) {
            const durationStr = newCall.callDuration >= 60 
              ? `${Math.floor(newCall.callDuration / 60)}m ${newCall.callDuration % 60}s` 
              : `${newCall.callDuration}s`;

            lead.notes.push({
              text: `📞 Logged ${newCall.callType} Call: "${newCall.subject}" | Outcome: ${newCall.callResult} (Duration: ${durationStr})`,
              createdBy: decodedUser.id,
              createdByName: decodedUser.name
            });
            await lead.save();
          }
        } catch (err) {
          console.error('Failed to auto-log call in lead notes:', err);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Call activity logged successfully!',
        call: newCall
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Log call API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while logging call.', details: error.message },
      { status: 500 }
    );
  }
}

