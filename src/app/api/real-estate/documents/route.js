import connectToDatabase from '@/lib/db';
import DocumentModel from '@/lib/models/Document';
import { supabase } from '@/lib/supabaseClient';
import { mapDocumentToFrontend } from '@/lib/dbMapper';
import { getUserFromRequest, checkModuleAccess } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/real-estate/documents - Retrieve dynamic list of tenant-isolated customer documents
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    let documents = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('real_estate_documents')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title)');

      if (decodedUser.orgId) {
        queryBuilder = queryBuilder.eq('org_id', decodedUser.orgId);
      }

      queryBuilder = queryBuilder.order('created_at', { ascending: false });

      const { data, error } = await queryBuilder;

      if (error) {
        console.error('Supabase fetch documents error:', error);
        throw error;
      }

      documents = (data || []).map(mapDocumentToFrontend);
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      let filter = {};
      if (decodedUser.orgId) {
        filter.orgId = decodedUser.orgId;
      }

      const mongoDocs = await DocumentModel.find(filter)
        .populate('leadId', 'firstName lastName phone company')
        .populate('propertyId', 'title')
        .sort({ createdAt: -1 });

      documents = mongoDocs.map(d => ({
        id: d._id,
        _id: d._id,
        documentName: d.documentName,
        documentType: d.documentType,
        leadId: d.leadId ? d.leadId._id : null,
        propertyId: d.propertyId ? d.propertyId._id : null,
        uploadDate: d.uploadDate,
        status: d.status || 'Verified',
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        leadName: d.leadId ? `${d.leadId.firstName} ${d.leadId.lastName || ''}`.trim() : 'Unknown Lead',
        phone: d.leadId ? d.leadId.phone : '',
        company: d.leadId ? d.leadId.company : '',
        propertyTitle: d.propertyId ? d.propertyId.title : 'Standalone Property'
      }));
    }

    return NextResponse.json({ success: true, documents });
  } catch (error) {
    console.error('GET documents error:', error);
    return NextResponse.json({ error: 'Internal server error while fetching documents list.' }, { status: 500 });
  }
}

// POST /api/real-estate/documents - Record a new customer document upload
export async function POST(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    if (!checkModuleAccess(decodedUser, 'real-estate')) {
      return NextResponse.json({ error: '🔒 This module is not enabled for your organization.' }, { status: 403 });
    }

    const body = await req.json();
    const { documentName, documentType, leadId, propertyId, status } = body;

    if (!documentName || !documentType || !leadId) {
      return NextResponse.json({ error: 'Missing required parameters: documentName, documentType, and leadId are required.' }, { status: 400 });
    }

    let newDoc = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('real_estate_documents')
        .insert({
          org_id: decodedUser.orgId,
          document_name: documentName.trim(),
          document_type: documentType,
          lead_id: leadId,
          property_id: propertyId || null,
          upload_date: new Date().toISOString().split('T')[0],
          status: status || 'Verified'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Supabase create document error:', error);
        throw error;
      }

      // Fetch joined details
      const { data: joinedData, error: joinError } = await supabase
        .from('real_estate_documents')
        .select('*, leads(id, first_name, last_name, phone, company), real_estate_properties(id, title)')
        .eq('id', data.id)
        .single();

      if (!joinError && joinedData) {
        newDoc = mapDocumentToFrontend(joinedData);
      } else {
        newDoc = mapDocumentToFrontend(data);
      }
    } else {
      // MongoDB Fallback
      await connectToDatabase();
      const created = await DocumentModel.create({
        orgId: decodedUser.orgId,
        documentName: documentName.trim(),
        documentType,
        leadId,
        propertyId: propertyId || null,
        status: status || 'Verified'
      });

      const populated = await DocumentModel.findById(created._id)
        .populate('leadId', 'firstName lastName phone company')
        .populate('propertyId', 'title');

      newDoc = {
        id: populated._id,
        _id: populated._id,
        documentName: populated.documentName,
        documentType: populated.documentType,
        leadId: populated.leadId ? populated.leadId._id : null,
        propertyId: populated.propertyId ? populated.propertyId._id : null,
        uploadDate: populated.uploadDate,
        status: populated.status,
        createdAt: populated.createdAt,
        updatedAt: populated.updatedAt,
        leadName: populated.leadId ? `${populated.leadId.firstName} ${populated.leadId.lastName || ''}`.trim() : 'Unknown Lead',
        phone: populated.leadId ? populated.leadId.phone : '',
        company: populated.leadId ? populated.leadId.company : '',
        propertyTitle: populated.propertyId ? populated.propertyId.title : 'Standalone Property'
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Customer document registered successfully!',
      document: newDoc
    });

  } catch (error) {
    console.error('POST create document error:', error);
    return NextResponse.json({ error: 'Internal server error while registering customer document.' }, { status: 500 });
  }
}
