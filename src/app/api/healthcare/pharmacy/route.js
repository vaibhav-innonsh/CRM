import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/healthcare/pharmacy - Fetch pharmacy inventory batches
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to access pharmacy inventory.' },
        { status: 401 }
      );
    }

    // Gating check
    if (!checkModuleAccess(decodedUser, 'healthcare')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const categoryFilter = searchParams.get('category') || '';

    let inventory = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('healthcare_pharmacy')
        .select('*');

      // STRICT MULTI-TENANT ISOLATION
      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      // Filter by category
      if (categoryFilter && categoryFilter !== 'All') {
        queryBuilder = queryBuilder.eq('category', categoryFilter);
      }

      // Search (Medicine Name, Category, Batch Number)
      if (search) {
        const s = `%${search}%`;
        queryBuilder = queryBuilder.or(`medicine_name.ilike.${s},category.ilike.${s},batch_number.ilike.${s}`);
      }

      // Order alphabetically by medicine name
      queryBuilder = queryBuilder.order('medicine_name', { ascending: true });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch pharmacy error:', error);
        throw error;
      }

      inventory = data || [];
    }

    return NextResponse.json({ success: true, inventory });
  } catch (error) {
    console.error('GET pharmacy error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching pharmacy inventory.' },
      { status: 500 }
    );
  }
}

// POST /api/healthcare/pharmacy - Add a new batch to inventory
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage pharmacy inventory.' },
        { status: 401 }
      );
    }

    // Gating check
    if (!checkModuleAccess(decodedUser, 'healthcare')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { 
      medicine_name, 
      category, 
      batch_number, 
      expiry_date,
      stock_quantity,
      unit_price,
      supplier
    } = body;

    // Validation
    if (!medicine_name || !category || !batch_number || !expiry_date) {
      return NextResponse.json(
        { error: 'Missing required fields (Medicine Name, Category, Batch Number, and Expiry Date are required).' },
        { status: 400 }
      );
    }

    const qty = parseInt(stock_quantity, 10) || 0;
    const price = Number(unit_price) || 0;

    if (qty < 0 || price < 0) {
      return NextResponse.json(
        { error: 'Stock quantity and unit price cannot be negative.' },
        { status: 400 }
      );
    }

    let newBatch = null;

    if (supabase) {
      // 1. Check if the exact batch already exists under this tenant
      const { data: existing, error: existError } = await supabase
        .from('healthcare_pharmacy')
        .select('id')
        .eq('org_id', decodedUser.orgId)
        .eq('medicine_name', medicine_name)
        .eq('batch_number', batch_number)
        .maybeSingle();

      if (existError) {
        console.error('Supabase check existing batch error:', existError);
        throw existError;
      }

      if (existing) {
        return NextResponse.json(
          { error: 'A medicine with this exact name and batch number already exists in inventory.' },
          { status: 400 }
        );
      }

      // 2. Insert new pharmacy batch record
      const { data, error } = await supabase
        .from('healthcare_pharmacy')
        .insert({
          org_id: decodedUser.orgId,
          medicine_name,
          category,
          batch_number,
          expiry_date,
          stock_quantity: qty,
          unit_price: price,
          supplier: supplier || ''
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase insert pharmacy error:', error);
        throw error;
      }

      newBatch = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Medicine batch registered successfully!',
      batch: newBatch
    });
  } catch (error) {
    console.error('POST pharmacy error:', error);
    return NextResponse.json(
      { error: 'Internal server error while saving medicine batch.' },
      { status: 500 }
    );
  }
}

// PUT /api/healthcare/pharmacy - Adjust batch stock quantity or details
export async function PUT(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to manage pharmacy inventory.' },
        { status: 401 }
      );
    }

    // Gating check
    if (!checkModuleAccess(decodedUser, 'healthcare')) {
      return NextResponse.json(
        { error: '🔒 This module is not enabled for your organization.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { batchId, stock_quantity, unit_price } = body;

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required for update.' },
        { status: 400 }
      );
    }

    let updatedBatch = null;

    if (supabase) {
      const updateData = { updated_at: new Date() };

      if (stock_quantity !== undefined) {
        const qty = parseInt(stock_quantity, 10);
        if (qty < 0) {
          return NextResponse.json(
            { error: 'Stock quantity cannot be negative.' },
            { status: 400 }
          );
        }
        updateData.stock_quantity = qty;
      }

      if (unit_price !== undefined) {
        const price = Number(unit_price);
        if (price < 0) {
          return NextResponse.json(
            { error: 'Unit price cannot be negative.' },
            { status: 400 }
          );
        }
        updateData.unit_price = price;
      }

      const { data, error } = await supabase
        .from('healthcare_pharmacy')
        .update(updateData)
        .eq('id', batchId)
        .eq('org_id', decodedUser.orgId) // STRICT SECURITY BOUNDARY
        .select('*')
        .single();

      if (error) {
        console.error('Supabase update pharmacy error:', error);
        throw error;
      }

      updatedBatch = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Pharmacy inventory updated successfully!',
      batch: updatedBatch
    });
  } catch (error) {
    console.error('PUT pharmacy error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating pharmacy inventory.' },
      { status: 500 }
    );
  }
}
