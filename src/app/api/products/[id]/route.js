import connectToDatabase from '@/lib/db';
import Product from '@/lib/models/Product';
import { supabase } from '@/lib/supabaseClient';
import { mapProductToFrontend } from '@/lib/dbMapper';
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

    const body = await req.json();
    const { name, sku, price, category, description, status } = body;

    if (supabase) {
      // Find the existing product to check SKU clash
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !product) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

      // Validate SKU uniqueness clashing on edit
      if (sku !== undefined && sku.toUpperCase().trim() !== product.sku) {
        const normalizedSku = sku.toUpperCase().trim();
        const { data: duplicateSku } = await supabase
          .from('products')
          .select('id')
          .eq('sku', normalizedSku)
          .neq('id', id)
          .maybeSingle();

        if (duplicateSku) {
          return NextResponse.json({ error: `SKU Clash: Another product already uses SKU "${normalizedSku}".` }, { status: 400 });
        }
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (sku !== undefined) updateData.sku = sku.toUpperCase().trim();
      if (price !== undefined) updateData.price = Number(price);
      if (category !== undefined) updateData.category = category.trim();
      if (description !== undefined) updateData.description = description.trim();
      if (status !== undefined) updateData.status = status;

      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Supabase product update error:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Product details updated successfully.',
        product: mapProductToFrontend(updatedProduct)
      });
    } else {
      await connectToDatabase();

      const product = await Product.findById(id);

      if (!product) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

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
    }
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

    if (supabase) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (!existingProduct) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase product delete error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully from global inventory catalogue.'
      });
    } else {
      await connectToDatabase();

      const deletedProduct = await Product.findByIdAndDelete(id);

      if (!deletedProduct) {
        return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Product deleted successfully from global inventory catalogue.'
      });
    }
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
