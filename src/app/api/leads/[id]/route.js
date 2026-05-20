import connectToDatabase from '@/lib/db';
import Lead from '@/lib/models/Lead';
import User from '@/lib/models/User';
import Task from '@/lib/models/Task';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/leads/[id] - Fetch single lead details with validation
export async function GET(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const lead = await Lead.findById(id).populate('assignedTo', 'name email');

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Sales Rep can only view their own leads
    if (
      decodedUser.role === 'sales_rep' && 
      (!lead.assignedTo || lead.assignedTo._id.toString() !== decodedUser.id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to view this lead.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Fetch single lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching lead.' },
      { status: 500 }
    );
  }
}

// PUT /api/leads/[id] - Update lead details with assignment rules, duplicate checks and auto-auditing
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Sales Rep can only edit their own leads
    if (
      decodedUser.role === 'sales_rep' && 
      (!lead.assignedTo || lead.assignedTo.toString() !== decodedUser.id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to edit this lead.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      firstName,
      lastName,
      company,
      designation,
      email,
      phone,
      whatsapp,
      whatsappContacted,
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
      interestedProduct,
      followUpType,
      nextFollowUpDate,
      assignedTo,
      customFields,
    } = body;

    // Apply basic validations
    if (firstName !== undefined && !firstName) {
      return NextResponse.json({ error: 'First name cannot be empty.' }, { status: 400 });
    }
    if (company !== undefined && !company) {
      return NextResponse.json({ error: 'Company name cannot be empty.' }, { status: 400 });
    }

    // 1. BUSINESS RULE: Duplicate Check on updates
    if (email !== undefined && email.trim() && email.toLowerCase().trim() !== lead.email) {
      const duplicateEmail = await Lead.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
      if (duplicateEmail) {
        return NextResponse.json(
          { error: `Duplicate Check Warning: Another lead record with Email "${email.trim()}" already exists.` },
          { status: 400 }
        );
      }
    }

    if (phone !== undefined && phone.trim() && phone.trim() !== lead.phone) {
      const duplicatePhone = await Lead.findOne({ phone: phone.trim(), _id: { $ne: id } });
      if (duplicatePhone) {
        return NextResponse.json(
          { error: `Duplicate Check Warning: Another lead record with Phone "${phone.trim()}" already exists.` },
          { status: 400 }
        );
      }
    }

    // Target status to evaluate for validations
    const targetStatus = status !== undefined ? status : lead.status;
    const targetFollowUpDate = nextFollowUpDate !== undefined ? nextFollowUpDate : lead.nextFollowUpDate;

    // 2. BUSINESS RULE: Next Follow-up Date Mandatory (For Contacted, Qualified, Attempted)
    const requiredReminderStatuses = ['Contacted', 'Qualified', 'Attempted'];
    if (requiredReminderStatuses.includes(targetStatus) && !targetFollowUpDate) {
      return NextResponse.json(
        { error: `Validation Failure: Target Next Follow-Up Schedule is required when status is "${targetStatus}".` },
        { status: 400 }
      );
    }

    // 3. BUSINESS RULE: Lost Reason Mandatory
    const targetLostReason = lostReason !== undefined ? lostReason : lead.lostReason;
    if (targetStatus === 'Lost' && !targetLostReason) {
      return NextResponse.json(
        { error: 'Validation Failure: Lost Reason is mandatory when lead status is "Lost".' },
        { status: 400 }
      );
    }

    // 4. BUSINESS RULE: Automated State Change Log (Audit note)
    if (status !== undefined && status !== lead.status) {
      lead.notes.push({
        text: `System Status update: Lead status changed from "${lead.status}" to "${status}" by ${decodedUser.name}`,
        createdBy: decodedUser.id,
        createdByName: decodedUser.name,
      });
      lead.status = status;
    }

    // 5. BUSINESS RULE: Auto Audit Log for WhatsApp Click Tracking
    if (whatsappContacted === true && lead.whatsappContacted !== true) {
      lead.notes.push({
        text: `Outreach initiated via WhatsApp by ${decodedUser.name}`,
        createdBy: decodedUser.id,
        createdByName: decodedUser.name,
      });
      lead.whatsappContacted = true;
    }

    // Apply rest of updates to the Mongoose document properties
    if (firstName !== undefined) lead.firstName = firstName;
    if (lastName !== undefined) lead.lastName = lastName;
    if (company !== undefined) lead.company = company;
    if (designation !== undefined) lead.designation = designation;
    if (email !== undefined) lead.email = email.toLowerCase().trim();
    if (phone !== undefined) lead.phone = phone.trim();
    if (whatsapp !== undefined) lead.whatsapp = whatsapp.trim();
    if (website !== undefined) lead.website = website.trim();
    if (city !== undefined) lead.city = city;
    if (state !== undefined) lead.state = state;
    if (country !== undefined) lead.country = country;
    if (industry !== undefined) lead.industry = industry;
    if (employeeCount !== undefined) lead.employeeCount = Number(employeeCount) || 0;
    if (annualRevenue !== undefined) lead.annualRevenue = Number(annualRevenue) || 0;
    if (priority !== undefined) lead.priority = priority;
    if (requirements !== undefined) lead.requirements = requirements;
    if (interestedProduct !== undefined) lead.interestedProduct = interestedProduct;
    if (followUpType !== undefined) lead.followUpType = followUpType;
    if (customFields !== undefined) lead.customFields = customFields;

    if (nextFollowUpDate !== undefined) {
      lead.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
    }

    if (targetStatus === 'Lost') {
      lead.lostReason = targetLostReason;
    } else {
      lead.lostReason = '';
    }

    // SECURITY CHECK ON RE-ASSIGNMENT: 
    // Sales Rep CANNOT re-assign leads to other users. Only Owner & Sales Admin can.
    if (assignedTo !== undefined) {
      if (decodedUser.role === 'sales_rep' && assignedTo !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. Only Owners and Sales Managers can assign leads.' },
          { status: 403 }
        );
      }

      if (assignedTo) {
        const assigneeExists = await User.findById(assignedTo);
        if (!assigneeExists) {
          return NextResponse.json({ error: 'Assigned user does not exist.' }, { status: 400 });
        }
        lead.assignedTo = assignedTo;
      } else {
        lead.assignedTo = null; // Unassign lead
      }
    }

    await lead.save();

    // AUTO-TASK REMINDER SYNC FOR UPDATES
    if (nextFollowUpDate !== undefined && nextFollowUpDate) {
      try {
        const existingTask = await Task.findOne({ leadId: lead._id, status: 'Pending' });
        if (existingTask) {
          existingTask.dueDate = new Date(nextFollowUpDate);
          existingTask.subject = `Follow-up Call: ${lead.firstName} (${lead.company})`;
          existingTask.priority = lead.priority === 'Hot' ? 'High' : (lead.priority === 'Cold' ? 'Low' : 'Medium');
          await existingTask.save();
        } else {
          await Task.create({
            subject: `Follow-up Call: ${lead.firstName} (${lead.company})`,
            dueDate: new Date(nextFollowUpDate),
            priority: lead.priority === 'Hot' ? 'High' : (lead.priority === 'Cold' ? 'Low' : 'Medium'),
            status: 'Pending',
            assignedTo: lead.assignedTo || decodedUser.id,
            leadId: lead._id
          });
        }
      } catch (err) {
        console.error('Failed to sync follow-up task on lead edit:', err);
      }
    }
    
    // Fetch populated fresh document to return to client
    const updatedLead = await Lead.findById(id).populate('assignedTo', 'name email');

    return NextResponse.json({
      success: true,
      message: 'Lead updated successfully',
      lead: updatedLead,
    });
  } catch (error) {
    console.error('Update lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating lead.', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] - Only Owners and Sales Managers can delete
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY CHECK: Only Owner and Sales Admin are authorized to delete data
    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives cannot delete leads. Please contact your manager.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const deletedLead = await Lead.findByIdAndDelete(id);

    if (!deletedLead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully',
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting lead.' },
      { status: 500 }
    );
  }
}
