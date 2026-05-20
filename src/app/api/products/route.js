import connectToDatabase from '@/lib/db';
import Product from '@/lib/models/Product';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/products - Retrieve inventory catalog items
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';

    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex }
      ];
    }

    const products = await Product.find(query).sort({ name: 1 });

    return NextResponse.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching products catalog.' },
      { status: 500 }
    );
  }
}

// POST /api/products - Insert a new item into inventory (Admins/Owners only)
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role bounds verification
    if (decodedUser.role !== 'owner' && decodedUser.role !== 'sales_admin') {
      return NextResponse.json(
        { error: 'Forbidden. Only Owners or Sales Administrators can manage product catalogue.' },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { name, sku, price, category, description, status } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }
    if (!sku || !sku.trim()) {
      return NextResponse.json({ error: 'SKU code is required.' }, { status: 400 });
    }
    if (price === undefined || price < 0) {
      return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 });
    }

    // SKU uniqueness check
    const existingSku = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existingSku) {
      return NextResponse.json(
        { error: `SKU Clash: A product with SKU code "${sku.toUpperCase().trim()}" already exists in the catalogue.` },
        { status: 400 }
      );
    }

    const newProduct = await Product.create({
      name: name.trim(),
      sku: sku.toUpperCase().trim(),
      price: Number(price),
      category: category || 'Software',
      description: description || '',
      status: status || 'Active'
    });

    return NextResponse.json({
      success: true,
      message: 'Product added successfully to global corporate catalogue!',
      product: newProduct
    }, { status: 201 });
  } catch (error) {
    console.error('Create product API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while inserting catalogue product.', details: error.message },
      { status: 500 }
    );
  }
}
