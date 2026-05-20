import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear session cookie immediately
    response.cookies.set({
      name: 'token',
      value: '',
      httpOnly: true,
      expires: new Date(0), // Set expiry date to epoch (deletes cookie)
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error during logout.' },
      { status: 500 }
    );
  }
}
