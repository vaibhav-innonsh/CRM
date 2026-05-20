import connectToDatabase from '@/lib/db';
import Lead from '@/lib/models/Lead';
import Deal from '@/lib/models/Deal';
import Contact from '@/lib/models/Contact';
import Quotation from '@/lib/models/Quotation';
import Call from '@/lib/models/Call';
import Meeting from '@/lib/models/Meeting';
import Task from '@/lib/models/Task';
import User from '@/lib/models/User';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/reports - Aggregate comprehensive executive BI charts datasets
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    await connectToDatabase();

    // 1. LEAD CONVERSION FUNNEL METRICS
    const totalLeadsCount = await Lead.countDocuments();
    
    // Converted leads are calculated by checking contacts connected to converted states
    const convertedLeadsCount = await Lead.countDocuments({ status: 'Qualified' });
    const rawLeadsCount = await Lead.countDocuments({ status: 'New' });
    const contactedLeadsCount = await Lead.countDocuments({ status: 'Contacted' });
    const lostLeadsCount = await Lead.countDocuments({ status: 'Lost' });

    const conversionRate = totalLeadsCount > 0 
      ? Number(((convertedLeadsCount / totalLeadsCount) * 100).toFixed(1)) 
      : 0;

    // 2. LEAD SOURCES DISTRIBUTION
    const leadSourcesAgg = await Lead.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    const leadSources = leadSourcesAgg.map(item => ({
      name: item._id || 'Unknown',
      value: item.count
    }));

    // 3. LEAD PRIORITIES DISTRIBUTION
    const leadPrioritiesAgg = await Lead.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    const leadPriorities = leadPrioritiesAgg.map(item => ({
      name: item._id || 'Warm',
      value: item.count
    }));

    // 4. DEALS STAGE BREAKDOWN & PIPELINE VALUE
    const dealsList = await Deal.find();
    const stageBreakdown = {
      'New': { count: 0, value: 0 },
      'Contacted': { count: 0, value: 0 },
      'Proposal Sent': { count: 0, value: 0 },
      'Negotiation': { count: 0, value: 0 },
      'Won': { count: 0, value: 0 },
      'Lost': { count: 0, value: 0 },
    };

    let totalPipelineValue = 0;
    dealsList.forEach((deal) => {
      const stage = deal.stage || 'New';
      const val = Number(deal.value) || 0;
      if (stageBreakdown[stage]) {
        stageBreakdown[stage].count += 1;
        stageBreakdown[stage].value += val;
        totalPipelineValue += val;
      }
    });

    // 5. CORPORATE REVENUE CLOSE ANALYSIS (Quotations dynamic audit)
    const totalQuotesCount = await Quotation.countDocuments();
    const acceptedQuotes = await Quotation.find({ status: 'Accepted' });
    const totalRevenueClosed = acceptedQuotes.reduce((acc, curr) => acc + curr.grandTotal, 0);

    const pendingProposalsAgg = await Quotation.aggregate([
      { $match: { status: 'Sent' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);
    const pendingProposalsValue = pendingProposalsAgg[0]?.total || 0;

    // 6. DYNAMIC SALES REPRESENTATIVE GAMIFIED SCORECARD LEADERBOARD
    // Query all users who have rep roles, or simply gather metrics of all users
    const users = await User.find({}, 'name email role');
    const leaderboard = await Promise.all(users.map(async (user) => {
      const callsLogged = await Call.countDocuments({ assignedTo: user._id });
      const meetingsHosted = await Meeting.countDocuments({ assignedTo: user._id });
      const tasksCompleted = await Task.countDocuments({ assignedTo: user._id, status: 'Completed' });
      
      const closedQuotes = await Quotation.find({ assignedTo: user._id, status: 'Accepted' });
      const revenueClosed = closedQuotes.reduce((acc, curr) => acc + curr.grandTotal, 0);

      // Score weight (Gamified leaderboard value calculation)
      const activityScore = (callsLogged * 10) + (meetingsHosted * 30) + (tasksCompleted * 20) + (revenueClosed / 1000);

      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        callsLogged,
        meetingsHosted,
        tasksCompleted,
        revenueClosed,
        activityScore: Math.round(activityScore)
      };
    }));

    // Sort leaderboard based on dynamic activity score descending
    leaderboard.sort((a, b) => b.activityScore - a.activityScore);

    return NextResponse.json({
      success: true,
      data: {
        funnel: {
          totalLeadsCount,
          convertedLeadsCount,
          rawLeadsCount,
          contactedLeadsCount,
          lostLeadsCount,
          conversionRate
        },
        leadSources,
        leadPriorities,
        pipeline: {
          totalPipelineValue,
          stageBreakdown
        },
        financials: {
          totalQuotesCount,
          totalRevenueClosed,
          pendingProposalsValue
        },
        leaderboard
      }
    });
  } catch (error) {
    console.error('Fetch BI reports API error:', error);
    return NextResponse.json(
      { error: 'Internal server error compiling BI reports.' },
      { status: 500 }
    );
  }
}
