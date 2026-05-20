import connectToDatabase from '@/lib/db';
import User from '@/lib/models/User';
import { getUserFromRequest, hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/users - Fetch company user directory listing
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    // SECURITY CHECK: Only Owner and Sales Managers can view/assign to all company users
    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives do not have access to the user directory.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const fetchAll = searchParams.get('all') === 'true';

    let users;
    if (fetchAll) {
      // Hierarchical filter: Sales Managers strictly only view and manage Sales Representatives
      const query = decodedUser.role === 'sales_admin' 
        ? { role: 'sales_rep' } 
        : {};

      users = await User.find(query)
        .select('_id name email role isActive approvalStatus createdAt')
        .sort({ createdAt: -1 });
    } else {
      // Dropdown selection list filters: Sales Managers strictly assign to Sales Reps
      const query = decodedUser.role === 'sales_admin'
        ? { isActive: true, role: 'sales_rep' }
        : { isActive: true };

      users = await User.find(query)
        .select('_id name email role')
        .sort({ name: 1 });
    }

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Fetch users directory error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching user list.' },
      { status: 500 }
    );
  }
}

// POST /api/users - Invite/Create a new employee profile securely
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY CHECK: Only Owner and Sales Managers can create new user accounts
    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json({ error: 'Forbidden. Access restricted to administrators.' }, { status: 403 });
    }

    await connectToDatabase();

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'All fields (name, email, password, role) are required.' }, { status: 400 });
    }

    // Check email syntax criteria
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address syntax.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Role-based privilege gates check: Managers cannot create Owner accounts
    if (decodedUser.role === 'sales_admin' && role === 'owner') {
      return NextResponse.json({ error: 'Forbidden: Sales Managers cannot create Owner accounts.' }, { status: 403 });
    }

    // Check email duplication in database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'An employee account with this email already exists.' }, { status: 400 });
    }

    // Hash the password securely using bcrypt
    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      isActive: true
    });

    return NextResponse.json({
      success: true,
      message: 'New representative profile registered successfully!',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Create new user account error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
