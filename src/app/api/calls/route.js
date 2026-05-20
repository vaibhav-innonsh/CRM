import connectToDatabase from '@/lib/db';
import Call from '@/lib/models/Call';
import Lead from '@/lib/models/Lead';
import Contact from '@/lib/models/Contact';
import User from '@/lib/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/calls - Fetch corporate calls logs list with security isolations
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const callType = searchParams.get('callType') || '';
    const callResult = searchParams.get('callResult') || '';
    const assignedTo = searchParams.get('assignedTo') || '';

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

    await connectToDatabase();

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
  } catch (error) {
    console.error('Log call API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while logging call.', details: error.message },
      { status: 500 }
    );
  }
}
