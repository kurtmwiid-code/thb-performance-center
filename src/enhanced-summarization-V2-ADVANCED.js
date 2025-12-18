/* ========== ADVANCED AI-POWERED CATEGORY ANALYSIS ENGINE ========== */

/**
 * ENHANCED ANALYSIS SYSTEM V2.0
 * 
 * This system performs deep analysis by:
 * 1. Mining actual QC comments for specific examples
 * 2. Identifying patterns across multiple sessions
 * 3. Calculating consistency metrics (not just averages)
 * 4. Detecting skill progression trajectories
 * 5. Generating actionable, specific coaching insights
 */

/**
 * Analyzes a category's performance with DEEP intelligence
 */
export const analyzeCategory = (category, agentId, sessions) => {
  const categoryKey = category.toLowerCase().replace(/[^a-z]/g, '_').replace(/__+/g, '_');
  
  // Get all sessions for this agent, sorted by date
  const agentSessions = sessions
    .filter(s => s.agent_id === agentId)
    .sort((a, b) => new Date(a.call_date || a.session_date) - new Date(b.call_date || b.session_date));
  
  // Extract scores and comments with metadata
  const data = agentSessions
    .map(session => ({
      score: session.category_scores?.[0]?.[categoryKey],
      comment: session.category_scores?.[0]?.[`${categoryKey}_comment`],
      date: new Date(session.call_date || session.session_date),
      propertyAddress: session.property_address,
      sessionId: session.id
    }))
    .filter(d => d.score !== null && d.score !== undefined);

  if (data.length === 0) {
    return {
      summary: "No QC data available for this category yet.",
      score: 0,
      interpretation: "N/A",
      strengths: [],
      techniques: [],
      focusAreas: [],
      trend: "neutral",
      consistency: 0,
      specificExamples: []
    };
  }

  // Calculate average score
  const avgScore = data.reduce((sum, d) => sum + d.score, 0) / data.length;
  const avgPercentage = (avgScore / 5) * 100;

  // Calculate CONSISTENCY (standard deviation)
  const variance = data.reduce((sum, d) => sum + Math.pow(d.score - avgScore, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - (stdDev * 40)); // Convert to 0-100 scale

  // Analyze score trend with MORE GRANULARITY
  const { trend, trendStrength } = analyzeTrend(data);

  // Interpret score level with SPECIFICITY
  const interpretation = interpretPerformance(avgPercentage, consistency);

  // DEEP COMMENT ANALYSIS - Extract real insights
  const comments = data.map(d => ({ text: d.comment, score: d.score, date: d.date }))
    .filter(c => c.text && c.text.trim());
  
  const deepAnalysis = performDeepCommentAnalysis(comments, avgScore, category);

  // Generate ACTIONABLE summary
  const summary = generateActionableSummary(
    category,
    avgScore,
    avgPercentage,
    interpretation,
    deepAnalysis,
    trend,
    trendStrength,
    consistency,
    data.length
  );

  return {
    summary,
    score: Math.round(avgPercentage),
    interpretation,
    strengths: deepAnalysis.strengths,
    techniques: deepAnalysis.techniques,
    focusAreas: deepAnalysis.focusAreas,
    specificExamples: deepAnalysis.examples,
    trend,
    trendStrength,
    consistency: Math.round(consistency)
  };
};

/**
 * Analyze trend with granular detail
 */
const analyzeTrend = (data) => {
  if (data.length < 3) {
    return { trend: "insufficient_data", trendStrength: 0 };
  }

  // Split data into thirds for better trend analysis
  const third = Math.floor(data.length / 3);
  const oldData = data.slice(0, third);
  const midData = data.slice(third, third * 2);
  const recentData = data.slice(third * 2);

  const oldAvg = oldData.reduce((sum, d) => sum + d.score, 0) / oldData.length;
  const midAvg = midData.length > 0 ? midData.reduce((sum, d) => sum + d.score, 0) / midData.length : oldAvg;
  const recentAvg = recentData.reduce((sum, d) => sum + d.score, 0) / recentData.length;

  const totalChange = recentAvg - oldAvg;
  const midChange = midAvg - oldAvg;
  
  // Determine trend
  let trend = "stable";
  let trendStrength = 0;

  if (Math.abs(totalChange) < 0.3) {
    trend = "stable";
    trendStrength = Math.abs(totalChange) / 0.3; // 0-1 scale
  } else if (totalChange > 0) {
    // Check if improvement is consistent
    if (midChange > 0 && totalChange > midChange) {
      trend = "accelerating";
      trendStrength = Math.min(totalChange, 2) / 2; // Cap at 2 points improvement
    } else {
      trend = "improving";
      trendStrength = Math.min(totalChange, 1.5) / 1.5;
    }
  } else {
    // Declining
    if (midChange < 0 && totalChange < midChange) {
      trend = "deteriorating";
      trendStrength = Math.min(Math.abs(totalChange), 2) / 2;
    } else {
      trend = "declining";
      trendStrength = Math.min(Math.abs(totalChange), 1.5) / 1.5;
    }
  }

  return { trend, trendStrength: Math.round(trendStrength * 100) };
};

/**
 * Interpret performance with precision
 */
const interpretPerformance = (avgPercentage, consistency) => {
  let level = "";
  let consistencyNote = "";

  // Determine performance level
  if (avgPercentage >= 90) {
    level = "Elite Performance";
  } else if (avgPercentage >= 80) {
    level = "Strong Performance";
  } else if (avgPercentage >= 70) {
    level = "Solid Performance";
  } else if (avgPercentage >= 60) {
    level = "Developing Performance";
  } else if (avgPercentage >= 50) {
    level = "Emerging Performance";
  } else {
    level = "Foundational Stage";
  }

  // Add consistency context
  if (consistency >= 85) {
    consistencyNote = "Highly Consistent";
  } else if (consistency >= 70) {
    consistencyNote = "Generally Consistent";
  } else if (consistency >= 55) {
    consistencyNote = "Variable";
  } else {
    consistencyNote = "Inconsistent";
  }

  return `${level} (${consistencyNote})`;
};

/**
 * DEEP COMMENT ANALYSIS - The real intelligence
 */
const performDeepCommentAnalysis = (comments, avgScore, category) => {
  const analysis = {
    strengths: [],
    techniques: [],
    focusAreas: [],
    examples: [],
    patterns: {
      recurring_issues: [],
      consistent_strengths: [],
      skill_gaps: []
    }
  };

  if (comments.length === 0) return analysis;

  // Category-specific keyword dictionaries
  const categoryKeywords = getCategoryKeywords(category);

  // Track frequency of themes
  const themeFrequency = {
    strengths: {},
    weaknesses: {},
    techniques: {}
  };

  // Analyze each comment for patterns
  comments.forEach(({ text, score, date }) => {
    const lowerText = text.toLowerCase();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15);

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase().trim();
      const originalSentence = sentence.trim();

      // Identify STRENGTHS with context
      categoryKeywords.strengths.forEach(keyword => {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          const key = keyword.toLowerCase();
          themeFrequency.strengths[key] = (themeFrequency.strengths[key] || 0) + 1;
          
          // Store example if highly rated
          if (score >= 4 && originalSentence.length >= 30 && originalSentence.length <= 150) {
            analysis.examples.push({
              type: 'strength',
              text: originalSentence,
              score: score,
              keyword: keyword
            });
          }
        }
      });

      // Identify WEAKNESSES with context
      categoryKeywords.weaknesses.forEach(keyword => {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          const key = keyword.toLowerCase();
          themeFrequency.weaknesses[key] = (themeFrequency.weaknesses[key] || 0) + 1;
          
          // Store example if it's specific
          if (score <= 3 && originalSentence.length >= 30 && originalSentence.length <= 150) {
            analysis.examples.push({
              type: 'weakness',
              text: originalSentence,
              score: score,
              keyword: keyword
            });
          }
        }
      });

      // Identify TECHNIQUES
      categoryKeywords.techniques.forEach(keyword => {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          const key = keyword.toLowerCase();
          themeFrequency.techniques[key] = (themeFrequency.techniques[key] || 0) + 1;
          
          if (originalSentence.length >= 30 && originalSentence.length <= 120) {
            analysis.examples.push({
              type: 'technique',
              text: originalSentence,
              score: score,
              keyword: keyword
            });
          }
        }
      });
    });
  });

  // Extract top recurring themes
  const topStrengths = Object.entries(themeFrequency.strengths)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([_, count]) => count >= 2); // Only if mentioned 2+ times

  const topWeaknesses = Object.entries(themeFrequency.weaknesses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([_, count]) => count >= 2);

  const topTechniques = Object.entries(themeFrequency.techniques)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([_, count]) => count >= 2);

  // Build structured insights
  if (topStrengths.length > 0) {
    const strengthExamples = analysis.examples
      .filter(ex => ex.type === 'strength')
      .slice(0, 2);
    
    analysis.strengths = strengthExamples.map(ex => ex.text);
    analysis.patterns.consistent_strengths = topStrengths.map(([theme, count]) => 
      `${theme} (mentioned ${count}x)`
    );
  }

  if (topWeaknesses.length > 0) {
    const weaknessExamples = analysis.examples
      .filter(ex => ex.type === 'weakness')
      .slice(0, 2);
    
    analysis.focusAreas = weaknessExamples.map(ex => ex.text);
    analysis.patterns.recurring_issues = topWeaknesses.map(([theme, count]) => 
      `${theme} (${count} sessions)`
    );
  }

  if (topTechniques.length > 0) {
    const techniqueExamples = analysis.examples
      .filter(ex => ex.type === 'technique')
      .slice(0, 2);
    
    analysis.techniques = techniqueExamples.map(ex => ex.text);
  }

  return analysis;
};

/**
 * Get category-specific keywords for intelligent analysis
 */
const getCategoryKeywords = (category) => {
  const categoryLower = category.toLowerCase();

  // Bonding & Rapport keywords
  if (categoryLower.includes('bond') || categoryLower.includes('rapport')) {
    return {
      strengths: [
        'genuine empathy', 'natural conversation', 'excellent rapport', 'warm tone',
        'patient', 'listening skills', 'made client comfortable', 'built trust',
        'relatable', 'friendly', 'professional demeanor', 'connected well'
      ],
      weaknesses: [
        'rushed', 'interrupting', 'robotic', 'scripted', 'cold tone', 'impatient',
        'didn\'t listen', 'talking too much', 'not engaged', 'mechanical'
      ],
      techniques: [
        'ice breaker', 'small talk', 'active listening', 'mirroring',
        'asked about client', 'personal connection', 'humor', 'empathy statements'
      ]
    };
  }

  // Magic Problem Discovery keywords
  if (categoryLower.includes('magic') || categoryLower.includes('problem') || categoryLower.includes('discovery')) {
    return {
      strengths: [
        'excellent probing', 'uncovered pain', 'discovered motivation', 'deep questions',
        'found urgency', 'identified real problem', 'great questions', 'pain funnel'
      ],
      weaknesses: [
        'didn\'t probe', 'surface level', 'missed pain', 'no follow-up', 'didn\'t dig',
        'superficial questions', 'didn\'t discover', 'skipped pain funnel'
      ],
      techniques: [
        'open-ended questions', 'why questions', 'pain funnel', 'follow-up probing',
        'discovered timeline', 'uncovered motivation', 'asked about consequences'
      ]
    };
  }

  // Second Ask keywords
  if (categoryLower.includes('second') || categoryLower.includes('ask')) {
    return {
      strengths: [
        'set clear expectations', 'smooth transition', 'confirmed interest',
        'great setup', 'natural flow', 'positioned appointment', 'closed for appointment'
      ],
      weaknesses: [
        'didn\'t ask', 'weak close', 'unclear expectations', 'no call to action',
        'missed opportunity', 'hesitant', 'didn\'t transition'
      ],
      techniques: [
        'assumptive close', 'trial close', 'confirmed availability',
        'set specific time', 'addressed objections', 'clear next steps'
      ]
    };
  }

  // Closing keywords
  if (categoryLower.includes('clos')) {
    return {
      strengths: [
        'strong close', 'confident', 'handled objections', 'secured commitment',
        'assumptive language', 'addressed concerns', 'closed deal'
      ],
      weaknesses: [
        'weak close', 'gave up', 'didn\'t overcome objection', 'uncertain',
        'lost control', 'didn\'t ask', 'passive'
      ],
      techniques: [
        'trial close', 'assumptive close', 'alternative choice', 'urgency',
        'addressed hesitation', 'reframed objection', 'confirmed commitment'
      ]
    };
  }

  // Default keywords for unknown categories
  return {
    strengths: [
      'excellent', 'strong', 'effective', 'great', 'outstanding', 'professional',
      'natural', 'confident', 'skilled', 'mastery'
    ],
    weaknesses: [
      'needs improvement', 'should', 'could', 'missed', 'didn\'t', 'lacking',
      'weak', 'struggled', 'improve', 'work on'
    ],
    techniques: [
      'used', 'applied', 'demonstrated', 'asked', 'probed', 'discovered',
      'established', 'built', 'maintained'
    ]
  };
};

/**
 * Generate ACTIONABLE summary with specific coaching
 */
const generateActionableSummary = (
  category,
  avgScore,
  avgPercentage,
  interpretation,
  deepAnalysis,
  trend,
  trendStrength,
  consistency,
  sessionCount
) => {
  let summary = `**${interpretation}** — ${avgPercentage.toFixed(0)}% average (${consistency}% consistency) across ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;

  // Add trend with strength indicator
  if (trend === "accelerating") {
    summary += ` 🚀 ACCELERATING (+${trendStrength}%)`;
  } else if (trend === "improving") {
    summary += ` 📈 IMPROVING (+${trendStrength}%)`;
  } else if (trend === "declining") {
    summary += ` 📉 DECLINING (-${trendStrength}%)`;
  } else if (trend === "deteriorating") {
    summary += ` ⚠️ DETERIORATING (-${trendStrength}%)`;
  }

  summary += "\n\n";

  const sections = [];

  // SPECIFIC STRENGTHS with examples
  if (deepAnalysis.strengths.length > 0) {
    let strengthText = `**✅ Proven Strengths:**\n`;
    deepAnalysis.strengths.slice(0, 2).forEach((strength, i) => {
      strengthText += `${i + 1}. ${strength}\n`;
    });
    sections.push(strengthText.trim());
  }

  // TECHNIQUES OBSERVED
  if (deepAnalysis.techniques.length > 0) {
    let techText = `**🎯 Effective Techniques:**\n`;
    deepAnalysis.techniques.slice(0, 2).forEach((tech, i) => {
      techText += `${i + 1}. ${tech}\n`;
    });
    sections.push(techText.trim());
  }

  // SPECIFIC FOCUS AREAS with examples
  if (deepAnalysis.focusAreas.length > 0) {
    let focusText = `**🔧 Specific Development Needs:**\n`;
    deepAnalysis.focusAreas.slice(0, 2).forEach((focus, i) => {
      focusText += `${i + 1}. ${focus}\n`;
    });
    sections.push(focusText.trim());
  } else if (avgPercentage < 70) {
    sections.push(`**🔧 Development Need:** Improve consistency through focused practice and technique refinement.`);
  }

  // RECURRING PATTERNS
  if (deepAnalysis.patterns.recurring_issues.length > 0) {
    let patternText = `**⚠️ Recurring Issues:** ${deepAnalysis.patterns.recurring_issues.slice(0, 2).join(', ')}`;
    sections.push(patternText);
  }

  // ACTIONABLE COACHING RECOMMENDATION
  let recommendation = "**📋 Coaching Action:**\n";
  
  if (avgPercentage >= 85 && consistency >= 80) {
    recommendation += `Document ${category} best practices from these sessions for team training. Consider this rep as a peer coach.`;
  } else if (avgPercentage >= 75 && consistency >= 70) {
    recommendation += `Maintain current ${category} approach. Schedule 1-on-1 to identify opportunities for refinement in weaker areas.`;
  } else if (avgPercentage >= 65) {
    recommendation += `Schedule focused coaching on ${category}. ` + 
      (deepAnalysis.focusAreas.length > 0 
        ? `Priority: address the specific issues identified above.`
        : `Focus on building consistency and technique mastery.`);
  } else if (avgPercentage >= 55) {
    recommendation += `URGENT: Immediate coaching intervention needed for ${category}. ` +
      `Shadow a top performer, drill specific techniques, and implement daily practice.`;
  } else {
    recommendation += `CRITICAL: ${category} requires comprehensive skill rebuild. ` +
      `Implement structured training program with daily coaching, role-play practice, and frequent QC reviews.`;
  }

  // Add consistency recommendation if needed
  if (consistency < 60) {
    recommendation += `\n\n⚠️ **Consistency Alert:** High performance variability detected. Implement pre-call checklists and standard operating procedures.`;
  }

  // Add trend-based coaching
  if (trend === "declining" || trend === "deteriorating") {
    recommendation += `\n\n📉 **Trend Alert:** Performance declining. Investigate root causes immediately - possible burnout, confidence issues, or environmental factors.`;
  } else if (trend === "accelerating" || trend === "improving") {
    recommendation += `\n\n✅ **Positive Momentum:** Keep leveraging what's working. Document recent wins and replicate successful approaches.`;
  }

  sections.push(recommendation);

  // Join all sections
  summary += sections.join("\n\n");

  return summary.trim();
};

/**
 * Generate enhanced Claude's Clever Comment
 */
export const generateClaudesComment = (agentName, overallScore, categoryAnalyses, sessions) => {
  // Determine overall performance level
  let performanceLevel = "";
  let emoji = "";
  
  if (overallScore >= 80) {
    performanceLevel = "crushing it";
    emoji = "🔥";
  } else if (overallScore >= 70) {
    performanceLevel = "on solid ground";
    emoji = "💪";
  } else if (overallScore >= 60) {
    performanceLevel = "building momentum";
    emoji = "📈";
  } else {
    performanceLevel = "in growth mode";
    emoji = "🌱";
  }

  // Find strongest and weakest categories
  const sortedCategories = Object.entries(categoryAnalyses)
    .sort((a, b) => b[1].score - a[1].score);
  
  const strongest = sortedCategories[0];
  const weakest = sortedCategories[sortedCategories.length - 1];

  // Check for trends
  const improvingCategories = Object.entries(categoryAnalyses)
    .filter(([_, analysis]) => analysis.trend === "improving" || analysis.trend === "accelerating")
    .map(([category]) => category);

  const decliningCategories = Object.entries(categoryAnalyses)
    .filter(([_, analysis]) => analysis.trend === "declining" || analysis.trend === "deteriorating")
    .map(([category]) => category);

  // Safety check - return early if no data
  if (!strongest || strongest.length === 0 || !weakest || weakest.length === 0) {
    return `📊 ${agentName} needs more QC sessions to generate intelligent analysis. Add more sessions to unlock AI-powered insights!`;
  }

  // Build the comment with SPECIFIC insights
  let comment = `${emoji} **${agentName} is ${performanceLevel}** with ${overallScore}% overall performance. `;
  
  // Highlight strength WITH SPECIFICS
  if (strongest[1].score >= 75) {
    const specificStrength = strongest[1].strengths[0] 
      ? `"${strongest[1].strengths[0].substring(0, 80)}${strongest[1].strengths[0].length > 80 ? '...' : ''}"`
      : 'consistently strong execution';
    comment += `**${strongest[0]}** (${strongest[1].score}%, ${strongest[1].consistency}% consistent) is their superpower — ${specificStrength}. `;
  }

  // Add improvement insight
  if (improvingCategories.length > 0) {
    comment += `Excellent upward trajectory in **${improvingCategories[0]}** 🚀. `;
  }

  // Flag declining areas
  if (decliningCategories.length > 0) {
    comment += `⚠️ Watch **${decliningCategories[0]}** - recent decline detected. `;
  }

  // Suggest SPECIFIC focus area
  if (weakest[1].score < 70) {
    const specificWeakness = weakest[1].focusAreas[0]
      ? `"${weakest[1].focusAreas[0].substring(0, 80)}${weakest[1].focusAreas[0].length > 80 ? '...' : ''}"`
      : 'targeted skill development here could unlock significant performance gains';
    comment += `Primary focus: **${weakest[0]}** (${weakest[1].score}%) — ${specificWeakness}. `;
  }

  // Add ACTIONABLE motivational close
  if (overallScore >= 75) {
    comment += `Document these wins and keep pushing! 🎯`;
  } else if (overallScore >= 65) {
    comment += `The foundation is solid - targeted coaching on weak spots will elevate performance significantly! 💪`;
  } else {
    comment += `Clear development path identified - focused daily practice on these specific areas will drive rapid improvement! 🚀`;
  }

  return comment;
};
