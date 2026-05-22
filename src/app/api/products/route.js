import connectToDatabase from '@/lib/db';
import Product from '@/lib/models/Product';
import { supabase } from '@/lib/supabaseClient';
import { mapProductToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/products - Retrieve inventory catalog items
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';

    if (supabase) {
      let queryBuilder = supabase.from('products').select('*');

      if (category) {
        queryBuilder = queryBuilder.eq('category', category);
      }
      if (status) {
        queryBuilder = queryBuilder.eq('status', status);
      }
      if (search) {
        queryBuilder = queryBuilder.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await queryBuilder.order('name', { ascending: true });

      if (error) {
        console.error('Supabase fetch products error:', error);
        throw error;
      }

      const products = (data || []).map(mapProductToFrontend);

      return NextResponse.json({
        success: true,
        products
      });

    } else {
      await connectToDatabase();

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
    }
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

    const body = await req.json();
    const { name, sku, price, category, description, status } = body;

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Product name is required.' }, { status: 400 });
    }
    if (!sku || !sku.trim()) {
      return NextResponse.json({ error: 'SKU code is required.' }, { status: 400 });
    }
    let parsedPrice = 0;
    if (price !== undefined && price !== null && price !== '') {
      parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: 'Price must be a positive number.' }, { status: 400 });
      }
    }

    const normalizedSku = sku.toUpperCase().trim();

    if (supabase) {
      // SKU uniqueness check
      const { data: existingSku, error: fetchError } = await supabase
        .from('products')
        .select('id')
        .eq('sku', normalizedSku)
        .maybeSingle();

      if (existingSku) {
        return NextResponse.json(
          { error: `SKU Clash: A product with SKU code "${normalizedSku}" already exists in the catalogue.` },
          { status: 400 }
        );
      }

      const productData = {
        name: name.trim(),
        sku: normalizedSku,
        price: parsedPrice,
        category: category || 'Software',
        description: description || '',
        status: status || 'Active'
      };

      const { data: newProduct, error: insertError } = await supabase
        .from('products')
        .insert([productData])
        .select('*')
        .single();

      if (insertError) {
        console.error('Supabase product insert error:', insertError);
        throw insertError;
      }

      return NextResponse.json({
        success: true,
        message: 'Product added successfully to global corporate catalogue!',
        product: mapProductToFrontend(newProduct)
      }, { status: 201 });

    } else {
      await connectToDatabase();

      // SKU uniqueness check
      const existingSku = await Product.findOne({ sku: normalizedSku });
      if (existingSku) {
        return NextResponse.json(
          { error: `SKU Clash: A product with SKU code "${normalizedSku}" already exists in the catalogue.` },
          { status: 400 }
        );
      }

      const newProduct = await Product.create({
        name: name.trim(),
        sku: normalizedSku,
        price: parsedPrice,
        category: category || 'Software',
        description: description || '',
        status: status || 'Active'
      });

      return NextResponse.json({
        success: true,
        message: 'Product added successfully to global corporate catalogue!',
        product: newProduct
      }, { status: 201 });
    }
  } catch (error) {
    console.error('Create product API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while inserting catalogue product.', details: error.message },
      { status: 500 }
    );
  }
}

