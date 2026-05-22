import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const defaultOwnerEmail = 'owner@mycompany.com';
    const defaultOwnerPassword = 'ownerpassword123';
    const hashedOwnerPassword = await hashPassword(defaultOwnerPassword);

    const defaultManagerEmail = 'manager@mycompany.com';
    const defaultManagerPassword = 'managerpassword123';
    const hashedManagerPassword = await hashPassword(defaultManagerPassword);

    const defaultRepEmail = 'rep@mycompany.com';
    const defaultRepPassword = 'reppassword123';
    const hashedRepPassword = await hashPassword(defaultRepPassword);

    const usersToCreate = [
      {
        name: 'Innonsh Owner',
        email: defaultOwnerEmail,
        password: hashedOwnerPassword,
        role: 'owner',
        approval_status: 'Approved',
        is_active: true
      },
      {
        name: 'Innonsh Sales Manager',
        email: defaultManagerEmail,
        password: hashedManagerPassword,
        role: 'sales_admin',
        approval_status: 'Approved',
        is_active: true
      },
      {
        name: 'Innonsh Sales Rep',
        email: defaultRepEmail,
        password: hashedRepPassword,
        role: 'sales_rep',
        approval_status: 'Approved',
        is_active: true
      }
    ];

    let createdUsers = [];

    // 1. DYNAMIC DATABASE DETECTOR
    if (supabase) {
      // Clear or check existence
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('email');

      if (checkError) {
        console.error('Supabase check users error:', checkError);
      }

      // Filter users that do not exist yet
      const existingEmails = (existingUsers || []).map(u => u.email);
      const newUsers = usersToCreate.filter(u => !existingEmails.includes(u.email));

      if (newUsers.length > 0) {
        const { data: insertedUsers, error: insertError } = await supabase
          .from('users')
          .insert(newUsers)
          .select('id, name, email, role');

        if (insertError) {
          console.error('Supabase seed insertion error:', insertError);
          throw insertError;
        }
        createdUsers = insertedUsers || [];
      } else {
        return NextResponse.json(
          { error: 'CRM users already initialized in Supabase.' },
          { status: 400 }
        );
      }

    } else {
      // Fallback to MongoDB
      await connectToDatabase();

      for (const userData of usersToCreate) {
        const existing = await User.findOne({ email: userData.email });
        if (!existing) {
          const mongoUser = await User.create({
            name: userData.name,
            email: userData.email,
            password: userData.password,
            role: userData.role,
            approvalStatus: userData.approval_status,
            isActive: userData.is_active
          });
          createdUsers.push({
            id: mongoUser._id,
            name: mongoUser.name,
            email: mongoUser.email,
            role: mongoUser.role
          });
        }
      }

      if (createdUsers.length === 0) {
        return NextResponse.json(
          { error: 'CRM users already initialized in MongoDB.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'System successfully initialized! All 3 roles created in your active database.',
      default_credentials: [
        {
          role: 'Owner (Super Admin)',
          email: defaultOwnerEmail,
          password: defaultOwnerPassword
        },
        {
          role: 'Sales Manager (Sales Admin)',
          email: defaultManagerEmail,
          password: defaultManagerPassword
        },
        {
          role: 'Sales Representative',
          email: defaultRepEmail,
          password: defaultRepPassword
        }
      ]
    });
  } catch (error) {
    console.error('Seeding Error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database.', details: error.message },
      { status: 500 }
    );
  }
}
