import connectToDatabase from '@/lib/db';
import Lead from '@/lib/models/Lead';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// POST /api/leads/[id]/attachments - Upload a new Base64 attachment
export async function POST(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login to upload files.' }, { status: 401 });
    }

    await connectToDatabase();

    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Sales Rep can only upload attachments to their own leads
    if (
      decodedUser.role === 'sales_rep' && 
      (!lead.assignedTo || lead.assignedTo.toString() !== decodedUser.id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to modify this lead.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { fileName, fileData, fileType, fileSize } = body;

    if (!fileName || !fileData) {
      return NextResponse.json(
        { error: 'Validation Failure: File Name and Base64 File Content are required.' },
        { status: 400 }
      );
    }

    // Max 10MB check to protect Mongo document size (Mongo limit is 16MB per document)
    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size too large. Please upload files under 10MB to maintain optimal CRM speed.' },
        { status: 400 }
      );
    }

    // 1. Push attachment to schema
    const newAttachment = {
      fileName,
      fileData,
      fileType: fileType || '',
      fileSize: Number(fileSize) || 0,
      uploadedBy: decodedUser.name,
      uploadedAt: new Date()
    };

    lead.attachments.push(newAttachment);

    // 2. Automated Activity Log Note
    lead.notes.push({
      text: `Proposal document / File "${fileName}" uploaded successfully by ${decodedUser.name}`,
      createdBy: decodedUser.id,
      createdByName: decodedUser.name
    });

    await lead.save();

    return NextResponse.json({
      success: true,
      message: 'Attachment uploaded successfully',
      attachments: lead.attachments
    }, { status: 201 });
  } catch (error) {
    console.error('Upload attachment error:', error);
    return NextResponse.json(
      { error: 'Internal server error while uploading attachment.', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id]/attachments - Delete an attachment
export async function DELETE(req, { params }) {
  try {
    const decodedUser = getUserFromRequest(req);
    const { id } = await params;

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const lead = await Lead.findById(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    // SECURITY CHECK: Sales Rep can only delete from their own leads
    if (
      decodedUser.role === 'sales_rep' && 
      (!lead.assignedTo || lead.assignedTo.toString() !== decodedUser.id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to modify this lead.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('attachmentId');

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required to remove files.' }, { status: 400 });
    }

    const attachmentToRemove = lead.attachments.id(attachmentId);
    if (!attachmentToRemove) {
      return NextResponse.json({ error: 'Attachment not found in lead profile.' }, { status: 404 });
    }

    const removedFileName = attachmentToRemove.fileName;

    // Remove item
    lead.attachments.pull(attachmentId);

    // Log deletion
    lead.notes.push({
      text: `File attachment "${removedFileName}" deleted by ${decodedUser.name}`,
      createdBy: decodedUser.id,
      createdByName: decodedUser.name
    });

    await lead.save();

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully',
      attachments: lead.attachments
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json(
      { error: 'Internal server error while removing attachment.' },
      { status: 500 }
    );
  }
}
