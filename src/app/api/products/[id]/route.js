import connectToDatabase from '@/lib/db';
import Product from '@/lib/models/Product';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// PUT /api/products/[id] - Update product details (Admin/Owner only)
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role !== 'owner' && decodedUser.role !== 'sales_admin') {
      return NextResponse.json({ error: 'Forbidden. Only admins can edit product details.' }, { status: 403 });
    }

    await connectToDatabase();

    const product = await Product.findById(id);

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { name, sku, price, category, description, status } = body;

    // Validate SKU uniqueness clashing on edit
    if (sku !== undefined && sku.toUpperCase().trim() !== product.sku) {
      const duplicateSku = await Product.findOne({ sku: sku.toUpperCase().trim(), _id: { $ne: id } });
      if (duplicateSku) {
        return NextResponse.json({ error: `SKU Clash: Another product already uses SKU "${sku.toUpperCase().trim()}".` }, { status: 400 });
      }
    }

    if (name !== undefined) product.name = name.trim();
    if (sku !== undefined) product.sku = sku.toUpperCase().trim();
    if (price !== undefined) product.price = Number(price);
    if (category !== undefined) product.category = category.trim();
    if (description !== undefined) product.description = description.trim();
    if (status !== undefined) product.status = status;

    await product.save();

    return NextResponse.json({
      success: true,
      message: 'Product details updated successfully.',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete product (Admin/Owner only)
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decodedUser.role !== 'owner' && decodedUser.role !== 'sales_admin') {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await connectToDatabase();

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully from global inventory catalogue.'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
