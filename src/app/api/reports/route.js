import connectToDatabase from '@/lib/db';
import Lead from '@/lib/models/Lead';
import Deal from '@/lib/models/Deal';
import Contact from '@/lib/models/Contact';
import Quotation from '@/lib/models/Quotation';
import Call from '@/lib/models/Call';
import Meeting from '@/lib/models/Meeting';
import Task from '@/lib/models/Task';
import User from '@/lib/models/User';
import { supabase } from '@/lib/supabaseClient';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

// GET /api/reports - Aggregate comprehensive executive BI charts datasets
export async function GET(req) {
  try {
    const decodedUser = getUserFromRequest(req);

    if (!decodedUser) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    let totalLeadsCount = 0;
    let convertedLeadsCount = 0;
    let rawLeadsCount = 0;
    let contactedLeadsCount = 0;
    let lostLeadsCount = 0;
    let conversionRate = 0;
    let leadSources = [];
    let leadPriorities = [];
    let stageBreakdown = {
      'New': { count: 0, value: 0 },
      'Contacted': { count: 0, value: 0 },
      'Proposal Sent': { count: 0, value: 0 },
      'Negotiation': { count: 0, value: 0 },
      'Won': { count: 0, value: 0 },
      'Lost': { count: 0, value: 0 },
      'Prospecting': { count: 0, value: 0 },
      'Proposal': { count: 0, value: 0 }
    };
    let totalPipelineValue = 0;
    let totalQuotesCount = 0;
    let totalRevenueClosed = 0;
    let pendingProposalsValue = 0;
    let leaderboard = [];

    if (supabase) {
      // 1. LEAD CONVERSION FUNNEL & SOURCES & PRIORITIES METRICS
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('status, source, priority');

      if (leadsError) {
        console.error('Supabase fetch reports leads error:', leadsError);
        throw leadsError;
      }

      totalLeadsCount = leadsData.length;
      convertedLeadsCount = leadsData.filter(l => l.status === 'Qualified').length;
      rawLeadsCount = leadsData.filter(l => l.status === 'New').length;
      contactedLeadsCount = leadsData.filter(l => l.status === 'Contacted').length;
      lostLeadsCount = leadsData.filter(l => l.status === 'Lost').length;

      conversionRate = totalLeadsCount > 0 
        ? Number(((convertedLeadsCount / totalLeadsCount) * 100).toFixed(1)) 
        : 0;

      // 2. LEAD SOURCES DISTRIBUTION
      const sourcesMap = {};
      leadsData.forEach(lead => {
        const src = lead.source || 'Unknown';
        sourcesMap[src] = (sourcesMap[src] || 0) + 1;
      });
      leadSources = Object.keys(sourcesMap).map(name => ({
        name,
        value: sourcesMap[name]
      }));

      // 3. LEAD PRIORITIES DISTRIBUTION
      const prioritiesMap = {};
      leadsData.forEach(lead => {
        const prio = lead.priority || 'Warm';
        prioritiesMap[prio] = (prioritiesMap[prio] || 0) + 1;
      });
      leadPriorities = Object.keys(prioritiesMap).map(name => ({
        name,
        value: prioritiesMap[name]
      }));

      // 4. DEALS STAGE BREAKDOWN & PIPELINE VALUE
      const { data: dealsList, error: dealsError } = await supabase
        .from('deals')
        .select('stage, value');

      if (dealsError) {
        console.error('Supabase fetch reports deals error:', dealsError);
        throw dealsError;
      }

      dealsList.forEach((deal) => {
        const stage = deal.stage || 'New';
        const val = Number(deal.value) || 0;
        if (!stageBreakdown[stage]) {
          stageBreakdown[stage] = { count: 0, value: 0 };
        }
        stageBreakdown[stage].count += 1;
        stageBreakdown[stage].value += val;
        totalPipelineValue += val;
      });

      // 5. CORPORATE REVENUE CLOSE ANALYSIS (Quotations)
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotations')
        .select('status, grand_total');

      if (quotesError) {
        console.error('Supabase fetch reports quotations error:', quotesError);
        throw quotesError;
      }

      totalQuotesCount = quotesData.length;
      quotesData.forEach(q => {
        const grandTotal = Number(q.grand_total) || 0;
        if (q.status === 'Accepted') {
          totalRevenueClosed += grandTotal;
        } else if (q.status === 'Sent') {
          pendingProposalsValue += grandTotal;
        }
      });

      // 6. DYNAMIC SALES REPRESENTATIVE GAMIFIED SCORECARD LEADERBOARD
      const [
        { data: usersList, error: uErr },
        { data: callsList, error: cErr },
        { data: meetingsList, error: mErr },
        { data: tasksList, error: tErr },
        { data: acceptedQuotesList, error: qErr }
      ] = await Promise.all([
        supabase.from('users').select('id, name, email, role'),
        supabase.from('calls').select('assigned_to'),
        supabase.from('meetings').select('assigned_to'),
        supabase.from('tasks').select('assigned_to').eq('status', 'Completed'),
        supabase.from('quotations').select('assigned_to, grand_total').eq('status', 'Accepted')
      ]);

      if (uErr) throw uErr;
      if (cErr) throw cErr;
      if (mErr) throw mErr;
      if (tErr) throw tErr;
      if (qErr) throw qErr;

      const callsCountMap = {};
      const meetingsCountMap = {};
      const tasksCountMap = {};
      const revenueClosedMap = {};

      (callsList || []).forEach(c => {
        if (c.assigned_to) callsCountMap[c.assigned_to] = (callsCountMap[c.assigned_to] || 0) + 1;
      });
      (meetingsList || []).forEach(m => {
        if (m.assigned_to) meetingsCountMap[m.assigned_to] = (meetingsCountMap[m.assigned_to] || 0) + 1;
      });
      (tasksList || []).forEach(t => {
        if (t.assigned_to) tasksCountMap[t.assigned_to] = (tasksCountMap[t.assigned_to] || 0) + 1;
      });
      (acceptedQuotesList || []).forEach(q => {
        if (q.assigned_to) {
          const val = Number(q.grand_total) || 0;
          revenueClosedMap[q.assigned_to] = (revenueClosedMap[q.assigned_to] || 0) + val;
        }
      });

      leaderboard = (usersList || []).map(user => {
        const callsLogged = callsCountMap[user.id] || 0;
        const meetingsHosted = meetingsCountMap[user.id] || 0;
        const tasksCompleted = tasksCountMap[user.id] || 0;
        const revenueClosed = revenueClosedMap[user.id] || 0;

        const activityScore = (callsLogged * 10) + (meetingsHosted * 30) + (tasksCompleted * 20) + (revenueClosed / 1000);

        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          callsLogged,
          meetingsHosted,
          tasksCompleted,
          revenueClosed,
          activityScore: Math.round(activityScore)
        };
      });

      leaderboard.sort((a, b) => b.activityScore - a.activityScore);

    } else {
      await connectToDatabase();

      // 1. LEAD CONVERSION FUNNEL METRICS
      totalLeadsCount = await Lead.countDocuments();
      convertedLeadsCount = await Lead.countDocuments({ status: 'Qualified' });
      rawLeadsCount = await Lead.countDocuments({ status: 'New' });
      contactedLeadsCount = await Lead.countDocuments({ status: 'Contacted' });
      lostLeadsCount = await Lead.countDocuments({ status: 'Lost' });

      conversionRate = totalLeadsCount > 0 
        ? Number(((convertedLeadsCount / totalLeadsCount) * 100).toFixed(1)) 
        : 0;

      // 2. LEAD SOURCES DISTRIBUTION
      const leadSourcesAgg = await Lead.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ]);
      leadSources = leadSourcesAgg.map(item => ({
        name: item._id || 'Unknown',
        value: item.count
      }));

      // 3. LEAD PRIORITIES DISTRIBUTION
      const leadPrioritiesAgg = await Lead.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);
      leadPriorities = leadPrioritiesAgg.map(item => ({
        name: item._id || 'Warm',
        value: item.count
      }));

      // 4. DEALS STAGE BREAKDOWN & PIPELINE VALUE
      const dealsList = await Deal.find();
      let tempStageBreakdown = {
        'New': { count: 0, value: 0 },
        'Contacted': { count: 0, value: 0 },
        'Proposal Sent': { count: 0, value: 0 },
        'Negotiation': { count: 0, value: 0 },
        'Won': { count: 0, value: 0 },
        'Lost': { count: 0, value: 0 },
      };

      dealsList.forEach((deal) => {
        const stage = deal.stage || 'New';
        const val = Number(deal.value) || 0;
        if (tempStageBreakdown[stage]) {
          tempStageBreakdown[stage].count += 1;
          tempStageBreakdown[stage].value += val;
          totalPipelineValue += val;
        }
      });
      stageBreakdown = tempStageBreakdown;

      // 5. CORPORATE REVENUE CLOSE ANALYSIS (Quotations dynamic audit)
      totalQuotesCount = await Quotation.countDocuments();
      const acceptedQuotes = await Quotation.find({ status: 'Accepted' });
      totalRevenueClosed = acceptedQuotes.reduce((acc, curr) => acc + curr.grandTotal, 0);

      const pendingProposalsAgg = await Quotation.aggregate([
        { $match: { status: 'Sent' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]);
      pendingProposalsValue = pendingProposalsAgg[0]?.total || 0;

      // 6. DYNAMIC SALES REPRESENTATIVE GAMIFIED SCORECARD LEADERBOARD
      const users = await User.find({}, 'name email role');
      leaderboard = await Promise.all(users.map(async (user) => {
        const callsLogged = await Call.countDocuments({ assignedTo: user._id });
        const meetingsHosted = await Meeting.countDocuments({ assignedTo: user._id });
        const tasksCompleted = await Task.countDocuments({ assignedTo: user._id, status: 'Completed' });
        
        const closedQuotes = await Quotation.find({ assignedTo: user._id, status: 'Accepted' });
        const revenueClosed = closedQuotes.reduce((acc, curr) => acc + curr.grandTotal, 0);

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

      leaderboard.sort((a, b) => b.activityScore - a.activityScore);
    }

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
