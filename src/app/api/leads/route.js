import connectToDatabase from '@/lib/db';
import Lead from '@/lib/models/Lead';
import User from '@/lib/models/User';
import Task from '@/lib/models/Task';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/leads - Fetch lead list with strict role-based access control & dynamic filters
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access leads.' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const source = searchParams.get('source') || '';
    const priority = searchParams.get('priority') || '';
    const assignedToFilter = searchParams.get('assignedTo') || '';

    // 1. Build dynamic MongoDB query filters
    const query = {};

    // 2. STICT ROLE-BASED ACCESS CONTROL (Leads Isolation)
    if (decodedUser.role === 'sales_rep') {
      // Sales Representative can ONLY see leads assigned directly to them
      query.assignedTo = decodedUser.id;
    } else if (assignedToFilter) {
      // Owner or Sales Admin can filter leads by a specific rep
      query.assignedTo = assignedToFilter;
    }

    // Apply status filter if selected
    if (status) {
      query.status = status;
    }

    // Apply source filter if selected
    if (source) {
      query.source = source;
    }

    // Apply priority filter if selected
    if (priority) {
      query.priority = priority;
    }

    // Apply advanced text search on name, company, email, city, designation or industry
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { industry: { $regex: search, $options: 'i' } },
      ];
    }

    // Fetch leads and populate assignee details (name & email)
    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('Fetch leads error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching leads.' },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a new standard industrial lead with duplicate check & flow validations
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const {
      firstName,
      lastName,
      company,
      designation,
      email,
      phone,
      whatsapp,
      website,
      city,
      state,
      country,
      industry,
      employeeCount,
      annualRevenue,
      priority,
      status,
      lostReason,
      source,
      requirements,
      nextFollowUpDate,
      assignedTo,
      customFields,
      interestedProduct,
      followUpType,
    } = body;

    if (!firstName || !company) {
      return NextResponse.json(
        { error: 'First name and Company name are required.' },
        { status: 400 }
      );
    }

    // 1. BUSINESS RULE: Duplicate Lead Check (Email & Phone validation)
    if (email && email.trim()) {
      const duplicateEmail = await Lead.findOne({ email: email.toLowerCase().trim() });
      if (duplicateEmail) {
        return NextResponse.json(
          { error: `Duplicate Check Warning: A lead record with Email "${email.trim()}" already exists.` },
          { status: 400 }
        );
      }
    }

    if (phone && phone.trim()) {
      const duplicatePhone = await Lead.findOne({ phone: phone.trim() });
      if (duplicatePhone) {
        return NextResponse.json(
          { error: `Duplicate Check Warning: A lead record with Phone "${phone.trim()}" already exists.` },
          { status: 400 }
        );
      }
    }

    const leadStatusValue = status || 'New';

    // 2. BUSINESS RULE: Next Follow-up Date Mandatory (For Contacted, Qualified, Attempted)
    const requiredReminderStatuses = ['Contacted', 'Qualified', 'Attempted'];
    if (requiredReminderStatuses.includes(leadStatusValue) && !nextFollowUpDate) {
      return NextResponse.json(
        { error: `Validation Failure: Target Next Follow-Up Schedule is required when status is "${leadStatusValue}".` },
        { status: 400 }
      );
    }

    // 3. BUSINESS RULE: Lost Reason Mandatory
    if (leadStatusValue === 'Lost' && !lostReason) {
      return NextResponse.json(
        { error: 'Validation Failure: Lost Reason is mandatory when lead status is "Lost".' },
        { status: 400 }
      );
    }

    // Build the expanded industrial lead data object
    const leadData = {
      firstName,
      lastName: lastName || '',
      company,
      designation: designation || '',
      email: email || '',
      phone: phone || '',
      whatsapp: whatsapp || '',
      website: website || '',
      city: city || '',
      state: state || '',
      country: country || 'India',
      industry: industry || '',
      employeeCount: Number(employeeCount) || 0,
      annualRevenue: Number(annualRevenue) || 0,
      priority: priority || 'Warm',
      status: leadStatusValue,
      lostReason: leadStatusValue === 'Lost' ? lostReason : '',
      source: source || 'Website',
      requirements: requirements || '',
      interestedProduct: interestedProduct || '',
      followUpType: followUpType || 'None',
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      customFields: customFields || [],
      notes: [],
    };

    let finalAssignee = assignedTo || null;

    // Check for Round-Robin Auto Assignment
    if (body.autoAssign === true && !assignedTo) {
      const activeReps = await User.find({ role: 'sales_rep', isActive: true }).sort({ createdAt: 1 });
      if (activeReps.length > 0) {
        const lastAssignedLead = await Lead.findOne({
          assignedTo: { $in: activeReps.map(r => r._id) }
        }).sort({ createdAt: -1 });

        if (lastAssignedLead && lastAssignedLead.assignedTo) {
          const lastRepIndex = activeReps.findIndex(r => r._id.toString() === lastAssignedLead.assignedTo.toString());
          const nextRepIndex = (lastRepIndex + 1) % activeReps.length;
          finalAssignee = activeReps[nextRepIndex]._id;
        } else {
          finalAssignee = activeReps[0]._id;
        }
      }
    }

    // If an assignee is determined, verify they exist
    if (finalAssignee) {
      const assigneeExists = await User.findById(finalAssignee);
      if (!assigneeExists) {
        return NextResponse.json(
          { error: 'Assigned user does not exist.' },
          { status: 400 }
        );
      }
      leadData.assignedTo = finalAssignee;
    } else {
      // By default, if a Sales Rep creates a lead, it is assigned to them
      if (decodedUser.role === 'sales_rep') {
        leadData.assignedTo = decodedUser.id;
      }
    }

    // Add initial creation log note
    leadData.notes.push({
      text: `Lead created by ${decodedUser.name}`,
      createdBy: decodedUser.id,
      createdByName: decodedUser.name,
    });

    const newLead = await Lead.create(leadData);

    // AUTO-TASK REMINDER GENERATION TRIGGER
    if (newLead.nextFollowUpDate) {
      try {
        await Task.create({
          subject: `Follow-up Call: ${newLead.firstName} (${newLead.company})`,
          dueDate: newLead.nextFollowUpDate,
          priority: newLead.priority === 'Hot' ? 'High' : (newLead.priority === 'Cold' ? 'Low' : 'Medium'),
          status: 'Pending',
          assignedTo: newLead.assignedTo || decodedUser.id,
          leadId: newLead._id
        });
      } catch (err) {
        console.error('Failed to auto-create follow-up task on lead save:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Standard industrial lead created successfully',
      lead: newLead,
    }, { status: 201 });
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating lead.', details: error.message },
      { status: 500 }
    );
  }
}
