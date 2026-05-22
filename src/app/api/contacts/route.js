import connectToDatabase from '@/lib/db';
import Contact from '@/lib/models/Contact';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { mapContactToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/contacts - Retrieve customer contacts lists with strict role permissions
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const assignedToFilter = searchParams.get('assignedTo') || '';
    const status = searchParams.get('status') || '';

    let contacts = [];

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      let queryBuilder = supabase
        .from('contacts')
        .select('*, users(id, name, email, role)');

      // STICT ROLE-BASED ACCESS CONTROL (RBAC) SECURITY ENFORCEMENT
      if (decodedUser.role === 'sales_rep') {
        queryBuilder = queryBuilder.eq('assigned_to', decodedUser.id);
      } else if (assignedToFilter) {
        queryBuilder = queryBuilder.eq('assigned_to', assignedToFilter);
      }

      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }

      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(
          `first_name.ilike.${s},last_name.ilike.${s},company.ilike.${s},email.ilike.${s},phone.ilike.${s},city.ilike.${s}`
        );
      }

      const { data, error } = await queryBuilder.order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch contacts error:', error);
        throw error;
      }

      contacts = (data || []).map(mapContactToFrontend);

    } else {
      // Fallback to MongoDB
      await connectToDatabase();
      let query = {};

      if (decodedUser.role === 'sales_rep') {
        query.assignedTo = decodedUser.id;
      } else if (assignedToFilter) {
        query.assignedTo = assignedToFilter;
      }

      if (status) {
        query.status = status;
      }

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

      const mongoContacts = await Contact.find(query)
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 });

      contacts = mongoContacts;
    }

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

    const cleanEmail = email ? email.toLowerCase().trim() : '';
    const cleanPhone = phone ? phone.trim() : '';

    let targetAssignee = decodedUser.id;
    if (decodedUser.role !== 'sales_rep' && assignedTo) {
      targetAssignee = assignedTo;
    }

    let finalContact = null;

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      // Duplicate checks
      if (cleanEmail) {
        const { data: existingEmail } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingEmail) {
          return NextResponse.json(
            { error: 'Duplicate Protection Check: A customer contact record with this Email already exists.' },
            { status: 400 }
          );
        }
      }

      if (cleanPhone) {
        const { data: existingPhone } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (existingPhone) {
          return NextResponse.json(
            { error: 'Duplicate Protection Check: A customer contact record with this Phone number already exists.' },
            { status: 400 }
          );
        }
      }

      // Insert into Supabase
      const { data: newContact, error: insertError } = await supabase
        .from('contacts')
        .insert([
          {
            first_name: firstName.trim(),
            last_name: lastName || '',
            company: company || '',
            designation: designation || '',
            email: cleanEmail,
            phone: cleanPhone,
            whatsapp: whatsapp || '',
            city: city || '',
            state: state || '',
            country: country || 'India',
            assigned_to: targetAssignee,
            status: status || 'Active'
          }
        ])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase create contact error:', insertError);
        throw insertError;
      }

      // Fresh fetch to fetch user join details
      const { data: refreshedContact } = await supabase
        .from('contacts')
        .select('*, users(id, name, email, role)')
        .eq('id', newContact.id)
        .single();

      finalContact = mapContactToFrontend(refreshedContact);

    } else {
      // Fallback to MongoDB
      await connectToDatabase();

      if (cleanEmail) {
        const existingEmail = await Contact.findOne({ email: cleanEmail });
        if (existingEmail) {
          return NextResponse.json(
            { error: 'Duplicate Protection Check: A customer contact record with this Email already exists.' },
            { status: 400 }
          );
        }
      }

      if (cleanPhone) {
        const existingPhone = await Contact.findOne({ phone: cleanPhone });
        if (existingPhone) {
          return NextResponse.json(
            { error: 'Duplicate Protection Check: A customer contact record with this Phone number already exists.' },
            { status: 400 }
          );
        }
      }

      const mongoContact = await Contact.create({
        firstName: firstName.trim(),
        lastName: lastName || '',
        company: company || '',
        designation: designation || '',
        email: cleanEmail,
        phone: cleanPhone,
        whatsapp: whatsapp || '',
        city: city || '',
        state: state || '',
        country: country || 'India',
        assignedTo: targetAssignee,
        status: status || 'Active'
      });

      finalContact = mongoContact;
    }

    return NextResponse.json({
      success: true,
      message: 'Permanent customer contact record created successfully!',
      contact: finalContact
    }, { status: 201 });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating contact.', details: error.message },
      { status: 500 }
    );
  }
}
