/* ========== HOMEPAGE METRICS CALCULATOR V5 ========== */

/**
 * Calculates dashboard/homepage metrics using weighted recency
 * 
 * Metrics:
 * - Team Average Score
 * - Top Rep This Week
 * - Most Improved Rep
 * - Team's Greatest Strength
 * 
 * All use same weighted calculation as Deep Dive analysis
 */

// ==========================================
// WEIGHTED SCORE CALCULATION (SHARED)
// ==========================================

const calculateWeightedScore = (data) => {
  if (data.length === 0) return 0;

  const sortedData = [...data].sort((a, b) => b.date - a.date);

  const weightedData = sortedData.map((item, index) => {
    let weight = 1.0;
    if (index < 10) weight = 3.0;
    else if (index < 20) weight = 2.0;
    else if (index < 30) weight = 1.5;

    return {
      score: item.score,
      weight: weight
    };
  });

  const weightedSum = weightedData.reduce((sum, item) => sum + (item.score * item.weight), 0);
  const totalWeight = weightedData.reduce((sum, item) => sum + item.weight, 0);

  return weightedSum / totalWeight;
};

// ==========================================
// TEAM AVERAGE SCORE
// ==========================================

export const calculateTeamAverageScore = (agents, sessions) => {
  const agentScores = agents.map(agent => {
    const agentSessions = sessions.filter(s => s.agent_id === agent.id);
    
    // Get all category scores for this agent
    const allScores = agentSessions.flatMap(session => {
      const categoryScores = session.category_scores?.[0];
      if (!categoryScores) return [];
      
      return Object.keys(categoryScores)
        .filter(key => !key.includes('_comment')) // Only numeric scores
        .map(key => ({
          score: categoryScores[key],
          date: new Date(session.call_date || session.session_date)
        }))
        .filter(item => item.score >= 1 && item.score <= 5);
    });

    if (allScores.length === 0) return 0;

    // Calculate weighted average for this agent
    const weightedAvg = calculateWeightedScore(allScores);
    return (weightedAvg / 5) * 100; // Convert to percentage
  });

  // Filter out agents with no scores
  const validScores = agentScores.filter(score => score > 0);
  
  if (validScores.length === 0) return 0;

  // Team average
  const teamAvg = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  
  return Math.round(teamAvg * 10) / 10; // Round to 1 decimal
};

// ==========================================
// TOP REP THIS WEEK
// ==========================================

export const calculateTopRepThisWeek = (agents, sessions) => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const agentWeeklyScores = agents.map(agent => {
    const recentSessions = sessions.filter(s => 
      s.agent_id === agent.id && 
      new Date(s.call_date || s.session_date) >= sevenDaysAgo
    );

    if (recentSessions.length === 0) {
      return { agent, score: 0, sessionCount: 0 };
    }

    // Get all category scores from this week
    const weekScores = recentSessions.flatMap(session => {
      const categoryScores = session.category_scores?.[0];
      if (!categoryScores) return [];
      
      return Object.keys(categoryScores)
        .filter(key => !key.includes('_comment'))
        .map(key => ({
          score: categoryScores[key],
          date: new Date(session.call_date || session.session_date)
        }))
        .filter(item => item.score >= 1 && item.score <= 5);
    });

    if (weekScores.length === 0) {
      return { agent, score: 0, sessionCount: 0 };
    }

    // Weighted average for this week
    const weightedAvg = calculateWeightedScore(weekScores);
    const percentage = (weightedAvg / 5) * 100;

    return {
      agent,
      score: Math.round(percentage * 10) / 10,
      sessionCount: recentSessions.length
    };
  });

  // Sort by score, then by session count (tie-breaker)
  const sorted = agentWeeklyScores
    .filter(item => item.sessionCount > 0)
    .sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.1) {
        return b.sessionCount - a.sessionCount;
      }
      return b.score - a.score;
    });

  if (sorted.length === 0) {
    return {
      agent: null,
      score: 0,
      badge: 'No data this week'
    };
  }

  return {
    agent: sorted[0].agent,
    score: sorted[0].score,
    badge: 'Top Performer'
  };
};

// ==========================================
// MOST IMPROVED REP
// ==========================================

export const calculateMostImprovedRep = (agents, sessions) => {
  const agentImprovements = agents.map(agent => {
    const agentSessions = sessions
      .filter(s => s.agent_id === agent.id)
      .sort((a, b) => new Date(a.call_date || a.session_date) - new Date(b.call_date || b.session_date));

    if (agentSessions.length < 10) {
      return { agent, improvement: 0, current: 0, previous: 0 };
    }

    // Split into recent vs previous periods
    const midpoint = Math.floor(agentSessions.length / 2);
    const previousSessions = agentSessions.slice(0, midpoint);
    const recentSessions = agentSessions.slice(midpoint);

    // Calculate scores for each period
    const getScoresFromSessions = (sessionList) => {
      return sessionList.flatMap(session => {
        const categoryScores = session.category_scores?.[0];
        if (!categoryScores) return [];
        
        return Object.keys(categoryScores)
          .filter(key => !key.includes('_comment'))
          .map(key => ({
            score: categoryScores[key],
            date: new Date(session.call_date || session.session_date)
          }))
          .filter(item => item.score >= 1 && item.score <= 5);
      });
    };

    const previousScores = getScoresFromSessions(previousSessions);
    const recentScores = getScoresFromSessions(recentSessions);

    if (previousScores.length === 0 || recentScores.length === 0) {
      return { agent, improvement: 0, current: 0, previous: 0 };
    }

    const previousWeighted = calculateWeightedScore(previousScores);
    const recentWeighted = calculateWeightedScore(recentScores);

    const previousPercentage = (previousWeighted / 5) * 100;
    const recentPercentage = (recentWeighted / 5) * 100;

    const improvement = recentPercentage - previousPercentage;

    return {
      agent,
      improvement: Math.round(improvement * 10) / 10,
      current: Math.round(recentPercentage * 10) / 10,
      previous: Math.round(previousPercentage * 10) / 10
    };
  });

  // Sort by improvement (highest positive change)
  const sorted = agentImprovements
    .filter(item => !isNaN(item.improvement))
    .sort((a, b) => b.improvement - a.improvement);

  if (sorted.length === 0 || sorted[0].improvement <= 0) {
    return {
      agent: null,
      improvement: 0,
      badge: 'No improvement data'
    };
  }

  return {
    agent: sorted[0].agent,
    improvement: sorted[0].improvement,
    current: sorted[0].current,
    previous: sorted[0].previous,
    badge: 'Most Growth (Week over Week)'
  };
};

// ==========================================
// TEAM'S GREATEST STRENGTH
// ==========================================

export const calculateTeamGreatestStrength = (sessions) => {
  const categories = [
    'bonding_rapport',
    'magic_problem',
    'second_ask',
    'closing'
  ];

  const categoryAverages = categories.map(categoryKey => {
    // Get all scores for this category across all agents
    const categoryScores = sessions.flatMap(session => {
      const score = session.category_scores?.[0]?.[categoryKey];
      if (!score || score < 1 || score > 5) return [];
      
      return [{
        score: score,
        date: new Date(session.call_date || session.session_date)
      }];
    });

    if (categoryScores.length === 0) {
      return { category: categoryKey, score: 0 };
    }

    // Weighted average for this category
    const weightedAvg = calculateWeightedScore(categoryScores);
    const percentage = (weightedAvg / 5) * 100;

    return {
      category: categoryKey,
      score: Math.round(percentage * 10) / 10
    };
  });

  // Find highest scoring category
  const strongest = categoryAverages.reduce((max, cat) => 
    cat.score > max.score ? cat : max
  , { category: null, score: 0 });

  // Format category name for display
  const formatCategoryName = (key) => {
    const names = {
      'bonding_rapport': 'Bonding & Rapport',
      'magic_problem': 'Magic Problem Discovery',
      'second_ask': 'Second Ask',
      'closing': 'Closing'
    };
    return names[key] || key;
  };

  return {
    category: formatCategoryName(strongest.category),
    score: strongest.score,
    badge: 'Team Superpower'
  };
};

// ==========================================
// CALCULATE ALL DASHBOARD METRICS
// ==========================================

export const calculateDashboardMetrics = (agents, sessions) => {
  return {
    teamAverageScore: calculateTeamAverageScore(agents, sessions),
    topRepThisWeek: calculateTopRepThisWeek(agents, sessions),
    mostImprovedRep: calculateMostImprovedRep(agents, sessions),
    teamGreatestStrength: calculateTeamGreatestStrength(sessions)
  };
};

// ==========================================
// EXAMPLE USAGE IN APP.JS
// ==========================================

/*
// In your Dashboard component:

import { calculateDashboardMetrics } from './dashboardMetrics';

const Dashboard = ({ agents, sessions }) => {
  const metrics = calculateDashboardMetrics(agents, sessions);

  return (
    <div className="dashboard">
      <div className="metric-card">
        <h3>Team Average Score</h3>
        <div className="score">{metrics.teamAverageScore}%</div>
      </div>

      <div className="metric-card">
        <h3>Top Rep This Week</h3>
        <div className="agent-name">{metrics.topRepThisWeek.agent?.name || 'N/A'}</div>
        <div className="score">{metrics.topRepThisWeek.score}%</div>
        <div className="badge">{metrics.topRepThisWeek.badge}</div>
      </div>

      <div className="metric-card">
        <h3>Most Improved Rep</h3>
        <div className="agent-name">{metrics.mostImprovedRep.agent?.name || 'N/A'}</div>
        <div className="improvement">+{metrics.mostImprovedRep.improvement}%</div>
        <div className="badge">{metrics.mostImprovedRep.badge}</div>
      </div>

      <div className="metric-card">
        <h3>Team's Greatest Strength</h3>
        <div className="category">{metrics.teamGreatestStrength.category}</div>
        <div className="score">{metrics.teamGreatestStrength.score}%</div>
        <div className="badge">{metrics.teamGreatestStrength.badge}</div>
      </div>
    </div>
  );
};
*/
