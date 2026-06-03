import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/real-estate/leads/[id]/attachments - Upload a new Base64 attachment
export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login to upload files.' }, { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileData, fileType, fileSize } = body;

    if (!fileName || !fileData) {
      return NextResponse.json(
        { error: 'Validation Failure: File Name and Base64 File Content are required.' },
        { status: 400 }
      );
    }

    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Please upload files under 10MB to maintain optimal speed.' },
        { status: 400 }
      );
    }

    if (supabase) {
      const { data: lead, error: fetchError } = await supabase
        .from('real_estate_leads')
        .select('id, assigned_to')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !lead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // Security check
      if (
        decodedUser.role === 'sales_rep' && 
        lead.assigned_to && 
        lead.assigned_to !== decodedUser.id
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to modify this lead.' },
          { status: 403 }
        );
      }

      // Insert attachment
      const { error: insertError } = await supabase
        .from('real_estate_lead_attachments')
        .insert([{
          lead_id: id,
          file_name: fileName,
          file_data: fileData,
          file_type: fileType || '',
          file_size: Number(fileSize) || 0,
          uploaded_by: decodedUser.name,
          org_id: decodedUser.orgId
        }]);

      if (insertError) {
        console.error('Supabase insert RE attachment error:', insertError);
        throw insertError;
      }

      // Automated Activity Log Note
      await supabase
        .from('real_estate_lead_notes')
        .insert([{
          lead_id: id,
          text: `Proposal document / File "${fileName}" uploaded successfully by ${decodedUser.name}`,
          created_by: decodedUser.id,
          created_by_name: decodedUser.name,
          org_id: decodedUser.orgId
        }]);

      // Fetch all attachments
      const { data: attachments, error: fetchAttachError } = await supabase
        .from('real_estate_lead_attachments')
        .select('*')
        .eq('lead_id', id);

      if (fetchAttachError) {
        console.error('Supabase fetch RE attachments error:', fetchAttachError);
        throw fetchAttachError;
      }

      const mappedAttachments = (attachments || []).map(a => ({
        _id: a.id,
        id: a.id,
        fileName: a.file_name,
        fileData: a.file_data,
        fileType: a.file_type,
        fileSize: a.file_size,
        uploadedBy: a.uploaded_by,
        uploadedAt: a.uploaded_at
      }));

      return NextResponse.json({
        success: true,
        message: 'Attachment uploaded successfully',
        attachments: mappedAttachments
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Upload RE attachment error:', error);
    return NextResponse.json(
      { error: 'Internal server error while uploading attachment.', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/real-estate/leads/[id]/attachments - Delete an attachment
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required to remove files.' }, { status: 400 });
    }

    if (supabase) {
      const { data: lead, error: fetchError } = await supabase
        .from('real_estate_leads')
        .select('id, assigned_to')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !lead) {
        return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
      }

      // Security Check
      if (
        decodedUser.role === 'sales_rep' && 
        lead.assigned_to && 
        lead.assigned_to !== decodedUser.id
      ) {
        return NextResponse.json(
          { error: 'Forbidden. You do not have permission to modify this lead.' },
          { status: 403 }
        );
      }

      const { data: attachmentToRemove, error: attachFetchError } = await supabase
        .from('real_estate_lead_attachments')
        .select('file_name')
        .eq('id', attachmentId)
        .eq('lead_id', id)
        .maybeSingle();

      if (attachFetchError || !attachmentToRemove) {
        return NextResponse.json({ error: 'Attachment not found in lead profile.' }, { status: 404 });
      }

      const removedFileName = attachmentToRemove.file_name;

      // Remove item
      await supabase
        .from('real_estate_lead_attachments')
        .delete()
        .eq('id', attachmentId);

      // Log deletion
      await supabase
        .from('real_estate_lead_notes')
        .insert([{
          lead_id: id,
          text: `File attachment "${removedFileName}" deleted by ${decodedUser.name}`,
          created_by: decodedUser.id,
          created_by_name: decodedUser.name,
          org_id: decodedUser.orgId
        }]);

      // Fetch remaining
      const { data: attachments, error: fetchAttachError } = await supabase
        .from('real_estate_lead_attachments')
        .select('*')
        .eq('lead_id', id);

      if (fetchAttachError) {
        throw fetchAttachError;
      }

      const mappedAttachments = (attachments || []).map(a => ({
        _id: a.id,
        id: a.id,
        fileName: a.file_name,
        fileData: a.file_data,
        fileType: a.file_type,
        fileSize: a.file_size,
        uploadedBy: a.uploaded_by,
        uploadedAt: a.uploaded_at
      }));

      return NextResponse.json({
        success: true,
        message: 'Attachment deleted successfully',
        attachments: mappedAttachments
      });
    }

    return NextResponse.json({ error: 'Supabase integration inactive.' }, { status: 500 });
  } catch (error) {
    console.error('Delete RE attachment error:', error);
    return NextResponse.json(
      { error: 'Internal server error while removing attachment.' },
      { status: 500 }
    );
  }
}
