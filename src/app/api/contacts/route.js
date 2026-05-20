import connectToDatabase from '@/lib/db';
import Contact from '@/lib/models/Contact';
import User from '@/lib/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/contacts - Retrieve customer contacts lists with strict role permissions
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const assignedTo = searchParams.get('assignedTo') || '';
    const status = searchParams.get('status') || '';

    // Build DB Query filter
    let query = {};

    // 1. ROLE-BASED ACCESS CONTROL (RBAC) SECURITY ENFORCEMENT
    if (decodedUser.role === 'sales_rep') {
      // Sales reps can strictly only view contacts assigned to them
      query.assignedTo = decodedUser.id;
    } else if (assignedTo) {
      // Admins/Managers can filter by assignee
      query.assignedTo = assignedTo;
    }

    // 2. Filter by status
    if (status) {
      query.status = status;
    }

    // 3. Multi-field text search logic
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { company: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { city: searchRegex }
      ];
    }

    // Fetch contacts with populated assignee details
    const contacts = await Contact.find(query)
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Fetch contacts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching contacts.' },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Manually create a permanent customer contact record
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      city,
      state,
      country,
      assignedTo,
      status
    } = body;

    // Validation
    if (!firstName || !firstName.trim()) {
      return NextResponse.json({ error: 'First Name is a required field.' }, { status: 400 });
    }

    // Strict Data Hygiene: Email/Phone duplicate check for permanent Contacts
    if (email && email.trim() !== '') {
      const existingEmail = await Contact.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Duplicate Protection Check: A customer contact record with this Email already exists.' },
          { status: 400 }
        );
      }
    }

    if (phone && phone.trim() !== '') {
      const existingPhone = await Contact.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return NextResponse.json(
          { error: 'Duplicate Protection Check: A customer contact record with this Phone number already exists.' },
          { status: 400 }
        );
      }
    }

    // Determine assignee attribution
    let targetAssignee = decodedUser.id;
    if (decodedUser.role !== 'sales_rep' && assignedTo) {
      targetAssignee = assignedTo;
    }

    const newContact = await Contact.create({
      firstName: firstName.trim(),
      lastName: lastName || '',
      company: company || '',
      designation: designation || '',
      email: email ? email.toLowerCase().trim() : '',
      phone: phone || '',
      whatsapp: whatsapp || '',
      city: city || '',
      state: state || '',
      country: country || 'India',
      assignedTo: targetAssignee,
      status: status || 'Active'
    });

    return NextResponse.json({
      success: true,
      message: 'Permanent customer contact record created successfully!',
      contact: newContact
    }, { status: 201 });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating contact.', details: error.message },
      { status: 500 }
    );
  }
}
