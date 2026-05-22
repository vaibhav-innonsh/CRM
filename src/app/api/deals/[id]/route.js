import connectToDatabase from '@/lib/db';
import Deal from '@/lib/models/Deal';
import { supabase } from '@/lib/supabaseClient';
import { mapDealToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// PUT /api/deals/[id] - Update deal stage and details (Kanban drag-and-drop backend helper)
export async function PUT(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (supabase) {
      const { data: deal, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase fetch deal details error:', fetchError);
        throw fetchError;
      }

      if (!deal) {
        return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Sales Rep can only update their own deals
      if (decodedUser.role === 'sales_rep' && deal.assigned_to !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to update this deal.' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { title, value, stage, closingDate, assignedTo } = body;

      // Build updates list
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (value !== undefined) updates.value = Number(value);
      if (stage !== undefined) {
        const allowedStages = ['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost'];
        if (!allowedStages.includes(stage)) {
          return NextResponse.json({ error: 'Invalid deal stage.' }, { status: 400 });
        }
        updates.stage = stage;
      }
      if (closingDate !== undefined) updates.closing_date = new Date(closingDate).toISOString();

      // Only Owner and Sales Managers can change deal ownership
      if (assignedTo !== undefined) {
        if (decodedUser.role === 'sales_rep' && assignedTo !== decodedUser.id) {
          return NextResponse.json(
            { error: 'Forbidden. Sales representatives cannot change deal ownership.' },
            { status: 403 }
          );
        }
        updates.assigned_to = assignedTo;
      }

      const { data: updatedDeal, error: updateError } = await supabase
        .from('deals')
        .update(updates)
        .eq('id', id)
        .select('*, users(id, name, email)')
        .single();

      if (updateError) {
        console.error('Supabase update deal error:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: 'Deal updated successfully',
        deal: mapDealToFrontend(updatedDeal),
      });

    } else {
      await connectToDatabase();

      const deal = await Deal.findById(id);

      if (!deal) {
        return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
      }

      // SECURITY CHECK: Sales Rep can only update their own deals
      if (decodedUser.role === 'sales_rep' && deal.assignedTo.toString() !== decodedUser.id) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to update this deal.' },
          { status: 403 }
        );
      }

      const body = await req.json();
      const { title, value, stage, closingDate, assignedTo } = body;

      // Build updates list
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (value !== undefined) updates.value = Number(value);
      if (stage !== undefined) {
        const allowedStages = ['Prospecting', 'Proposal', 'Negotiation', 'Won', 'Lost'];
        if (!allowedStages.includes(stage)) {
          return NextResponse.json({ error: 'Invalid deal stage.' }, { status: 400 });
        }
        updates.stage = stage;
      }
      if (closingDate !== undefined) updates.closingDate = new Date(closingDate);

      // Only Owner and Sales Managers can change deal ownership
      if (assignedTo !== undefined) {
        if (decodedUser.role === 'sales_rep' && assignedTo !== decodedUser.id) {
          return NextResponse.json(
            { error: 'Forbidden. Sales representatives cannot change deal ownership.' },
            { status: 403 }
          );
        }
        updates.assignedTo = assignedTo;
      }

      const updatedDeal = await Deal.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('assignedTo', 'name email');

      return NextResponse.json({
        success: true,
        message: 'Deal updated successfully',
        deal: updatedDeal,
      });
    }
  } catch (error) {
    console.error('Update deal error:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating deal.', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/deals/[id] - Delete a deal card (Owners & Managers only)
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY CHECK: Only Owner & Sales Admin are authorized to delete Deals
    if (decodedUser.role === 'sales_rep') {
      return NextResponse.json(
        { error: 'Forbidden. Sales representatives cannot delete deal cards. Please contact your manager.' },
        { status: 403 }
      );
    }

    if (supabase) {
      const { data: deal, error: fetchError } = await supabase
        .from('deals')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Supabase delete fetch deal error:', fetchError);
        throw fetchError;
      }

      if (!deal) {
        return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
      }

      const { error: deleteError } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase delete deal error:', deleteError);
        throw deleteError;
      }

      return NextResponse.json({
        success: true,
        message: 'Deal record deleted successfully',
      });

    } else {
      await connectToDatabase();

      const deletedDeal = await Deal.findByIdAndDelete(id);

      if (!deletedDeal) {
        return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Deal record deleted successfully',
      });
    }
  } catch (error) {
    console.error('Delete deal error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting deal.' },
      { status: 500 }
    );
  }
}

