import connectToDatabase from '@/lib/db';
import Contact from '@/lib/models/Contact';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// PUT /api/contacts/[id] - Update Contact profile details
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const contact = await Contact.findById(id);

    if (!contact) {
      return NextResponse.json({ error: 'Customer contact profile not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Sales Rep can strictly only modify their own assigned contacts
    if (
      decodedUser.role === 'sales_rep' &&
      (!contact.assignedTo || contact.assignedTo.toString() !== decodedUser.id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to modify this contact.' },
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
      city,
      state,
      country,
      assignedTo,
      status
    } = body;

    // Validate firstName
    if (firstName !== undefined && !firstName.trim()) {
      return NextResponse.json({ error: 'First Name is a required field.' }, { status: 400 });
    }

    // Strict Email Collision check during update
    if (email !== undefined && email.trim() !== '') {
      const existingEmail = await Contact.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id } // Exclude current contact
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Duplicate Warning: Another customer contact already has this Email address.' },
          { status: 400 }
        );
      }
    }

    // Strict Phone Collision check during update
    if (phone !== undefined && phone.trim() !== '') {
      const existingPhone = await Contact.findOne({
        phone: phone.trim(),
        _id: { $ne: id }
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: 'Duplicate Warning: Another customer contact already has this Phone number.' },
          { status: 400 }
        );
      }
    }

    // Apply updates
    if (firstName !== undefined) contact.firstName = firstName.trim();
    if (lastName !== undefined) contact.lastName = lastName.trim();
    if (company !== undefined) contact.company = company.trim();
    if (designation !== undefined) contact.designation = designation.trim();
    if (email !== undefined) contact.email = email.toLowerCase().trim();
    if (phone !== undefined) contact.phone = phone.trim();
    if (whatsapp !== undefined) contact.whatsapp = whatsapp.trim();
    if (city !== undefined) contact.city = city.trim();
    if (state !== undefined) contact.state = state.trim();
    if (country !== undefined) contact.country = country.trim();
    if (status !== undefined) contact.status = status;

    // Allow Admin/Manager to change assignee
    if (decodedUser.role !== 'sales_rep' && assignedTo !== undefined) {
      contact.assignedTo = assignedTo || null;
    }

    await contact.save();

    return NextResponse.json({
      success: true,
      message: 'Customer Contact details updated successfully.',
      contact
    });
  } catch (error) {
    console.error('Update contact details error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating contact details.' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/[id] - Permanently delete customer contact profile (Role bounded: Admins/Owners only)
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admins/Owners only are authorized to permanently purge contact databases
    if (decodedUser.role !== 'owner' && decodedUser.role !== 'sales_admin') {
      return NextResponse.json(
        { error: 'Forbidden. Only Owners or Sales Administrators can delete permanent customer records.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const deletedContact = await Contact.findByIdAndDelete(id);

    if (!deletedContact) {
      return NextResponse.json({ error: 'Customer contact profile not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Permanent customer contact record deleted successfully.'
    });
  } catch (error) {
    console.error('Delete contact profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting contact profile.' },
      { status: 500 }
    );
  }
}
