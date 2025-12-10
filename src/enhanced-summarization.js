/* ========== ENHANCED AI-POWERED CATEGORY ANALYSIS ========== */

/**
 * Analyzes a category's performance by combining:
 * 1. Numerical scores (average and trend)
 * 2. Comment sentiment and themes
 * 3. Pattern recognition across sessions
 * 
 * Returns intelligent insights about strengths, techniques, and focus areas
 */
export const analyzeCategory = (category, agentId, sessions) => {
  const categoryKey = category.toLowerCase().replace(/[^a-z]/g, '_').replace(/__+/g, '_');
  
  // Get all sessions for this agent
  const agentSessions = sessions.filter(s => s.agent_id === agentId);
  
  // Extract scores and comments
  const data = agentSessions
    .map(session => ({
      score: session.category_scores?.[0]?.[categoryKey],
      comment: session.category_scores?.[0]?.[`${categoryKey}_comment`],
      date: new Date(session.call_date || session.session_date)
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
      trend: "neutral"
    };
  }

  // Calculate average score
  const avgScore = data.reduce((sum, d) => sum + d.score, 0) / data.length;
  const avgPercentage = (avgScore / 5) * 100;

  // Analyze score trend (recent vs older sessions)
  const recentData = data.slice(-5); // Last 5 sessions
  const olderData = data.slice(0, -5);
  let trend = "stable";
  
  if (olderData.length > 0 && recentData.length > 0) {
    const recentAvg = recentData.reduce((sum, d) => sum + d.score, 0) / recentData.length;
    const olderAvg = olderData.reduce((sum, d) => sum + d.score, 0) / olderData.length;
    const diff = recentAvg - olderAvg;
    
    if (diff > 0.3) trend = "improving";
    else if (diff < -0.3) trend = "declining";
  }

  // Interpret score level
  let interpretation = "";
  if (avgPercentage >= 85) {
    interpretation = "Excellent - Consistently strong performance";
  } else if (avgPercentage >= 75) {
    interpretation = "Strong - Solid execution with minor refinement opportunities";
  } else if (avgPercentage >= 65) {
    interpretation = "Competent - Good foundation, focus on consistency";
  } else if (avgPercentage >= 55) {
    interpretation = "Developing - Shows potential, needs targeted improvement";
  } else {
    interpretation = "Growth Area - Requires focused training and practice";
  }

  // Analyze comments for themes
  const comments = data.map(d => d.comment).filter(c => c && c.trim());
  const themes = extractThemes(comments, avgScore);

  // Generate intelligent summary
  const summary = generateIntelligentSummary(
    category,
    avgScore,
    avgPercentage,
    interpretation,
    themes,
    trend,
    data.length
  );

  return {
    summary,
    score: Math.round(avgPercentage),
    interpretation,
    strengths: themes.strengths,
    techniques: themes.techniques,
    focusAreas: themes.focusAreas,
    trend
  };
};

/**
 * Extract meaningful themes from comments using sentiment and keyword analysis
 * Returns only the MOST relevant insights (max 2 per category)
 */
const extractThemes = (comments, avgScore) => {
  const themes = {
    strengths: [],
    techniques: [],
    focusAreas: []
  };

  if (comments.length === 0) return themes;

  // Strength indicators (positive keywords)
  const strengthKeywords = [
    'excellent', 'great', 'outstanding', 'strong', 'effective', 'confident',
    'professional', 'natural', 'smooth', 'rapport', 'connected', 'engaged',
    'empathy', 'listened', 'understood', 'trust', 'comfortable', 'genuine',
    'expert', 'mastery', 'skilled'
  ];

  // Technique indicators (action keywords)
  const techniqueKeywords = [
    'asked', 'probed', 'discovered', 'identified', 'established', 'built',
    'used', 'applied', 'demonstrated', 'pain funnel', 'open-ended', 
    'ice breaker', 'humor', 'active listening', 'empathy'
  ];

  // Focus area indicators (improvement keywords)
  const focusKeywords = [
    'needs', 'should', 'could', 'improve', 'work on', 'develop', 'practice',
    'missed', 'lacking', 'weak', 'struggled', 'difficult', 'challenge',
    'more', 'better', 'deeper', 'interrupts', 'did not', 'didn\'t'
  ];

  // Analyze each comment
  comments.forEach(comment => {
    if (!comment) return;
    
    const lowerComment = comment.toLowerCase();
    const sentences = comment.split(/[.!?]+/).filter(s => s.trim().length > 20);

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase().trim();

      // Extract strengths (only SHORT, impactful ones)
      if (strengthKeywords.some(kw => lowerSentence.includes(kw)) && themes.strengths.length < 2) {
        const cleaned = sentence.trim();
        // Only add if it's concise (40-120 chars) and we don't have 2 already
        if (cleaned.length >= 40 && cleaned.length <= 120) {
          themes.strengths.push(cleaned);
        }
      }

      // Extract techniques (only specific, actionable ones)
      if (techniqueKeywords.some(kw => lowerSentence.includes(kw)) && themes.techniques.length < 2) {
        const cleaned = sentence.trim();
        // Only add if it's concise (40-100 chars)
        if (cleaned.length >= 40 && cleaned.length <= 100) {
          themes.techniques.push(cleaned);
        }
      }

      // Extract focus areas (only clear, actionable improvements)
      if (focusKeywords.some(kw => lowerSentence.includes(kw)) && themes.focusAreas.length < 1) {
        const cleaned = sentence.trim();
        // Only add ONE focus area, keep it concise (40-120 chars)
        if (cleaned.length >= 40 && cleaned.length <= 120) {
          themes.focusAreas.push(cleaned);
        }
      }
    });
  });

  // If we have TOO many comments, prioritize most recent
  if (themes.strengths.length > 2) {
    themes.strengths = themes.strengths.slice(-2);
  }
  if (themes.techniques.length > 2) {
    themes.techniques = themes.techniques.slice(-2);
  }
  if (themes.focusAreas.length > 1) {
    themes.focusAreas = [themes.focusAreas[themes.focusAreas.length - 1]]; // Keep only most recent
  }

  return themes;
};

/**
 * Generate an intelligent summary combining score and comment analysis
 * Produces concise, structured summaries (250-350 words max)
 */
const generateIntelligentSummary = (
  category,
  avgScore,
  avgPercentage,
  interpretation,
  themes,
  trend,
  sessionCount
) => {
  let summary = `**${interpretation}** — ${avgPercentage.toFixed(0)}% average across ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;

  // Add trend indicator
  if (trend === "improving") {
    summary += " 📈";
  } else if (trend === "declining") {
    summary += " 📉";
  }

  summary += "\n\n";

  // Build structured sections
  const sections = [];

  // Strengths section (if exists)
  if (themes.strengths.length > 0) {
    let strengthText = "**What's Working:** ";
    strengthText += themes.strengths.slice(0, 2).join(" ");
    if (strengthText.length > 200) {
      strengthText = strengthText.substring(0, 197) + "...";
    }
    sections.push(strengthText);
  }

  // Techniques section (if exists)
  if (themes.techniques.length > 0) {
    let techText = "**Key Techniques:** ";
    techText += themes.techniques.slice(0, 2).join(" ");
    if (techText.length > 180) {
      techText = techText.substring(0, 177) + "...";
    }
    sections.push(techText);
  }

  // Focus areas / improvement section
  if (themes.focusAreas.length > 0) {
    let focusText = "**Development Area:** ";
    focusText += themes.focusAreas[0];
    if (focusText.length > 180) {
      focusText = focusText.substring(0, 177) + "...";
    }
    sections.push(focusText);
  } else if (avgPercentage < 70) {
    sections.push("**Development Area:** Focus on consistency and technique refinement through targeted practice.");
  }

  // Add coaching recommendation based on score
  if (avgPercentage >= 85) {
    sections.push("**Recommendation:** Document best practices from these calls for team training.");
  } else if (avgPercentage >= 70) {
    sections.push("**Recommendation:** Maintain current approach while refining weaker areas.");
  } else if (avgPercentage >= 55) {
    sections.push("**Recommendation:** Schedule targeted coaching session to address gaps.");
  } else {
    sections.push("**Recommendation:** Requires immediate coaching intervention and skill development.");
  }

  // Join sections with proper spacing
  summary += sections.join("\n\n");

  // Ensure we don't exceed ~350 words (roughly 2000 characters)
  if (summary.length > 2000) {
    summary = summary.substring(0, 1997) + "...";
  }

  return summary.trim();
};

/**
 * Generate enhanced Claude's Clever Comment
 * More humanized, slightly humorous, and actionable
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
    .filter(([_, analysis]) => analysis.trend === "improving")
    .map(([category]) => category);

  // Build the comment
  let comment = `${emoji} **${agentName} is ${performanceLevel}** with a ${overallScore}% overall performance. `;

  // Highlight strength
  if (strongest[1].score >= 75) {
    comment += `Their **${strongest[0]}** (${strongest[1].score}%) is a real standout - ${strongest[1].strengths[0] || 'consistently strong execution'}. `;
  }

  // Add improvement insight
  if (improvingCategories.length > 0) {
    comment += `Great to see upward momentum in **${improvingCategories[0]}** 📈. `;
  }

  // Suggest focus area
  if (weakest[1].score < 70) {
    comment += `The biggest opportunity? Focus on **${weakest[0]}** (${weakest[1].score}%) - `;
    if (weakest[1].focusAreas[0]) {
      comment += `${weakest[1].focusAreas[0]}. `;
    } else {
      comment += `targeted practice here could unlock the next performance level. `;
    }
  }

  // Add motivational close
  if (overallScore >= 75) {
    comment += `Keep up the excellent work! 🎯`;
  } else if (overallScore >= 65) {
    comment += `The foundation is solid - consistency and refinement will push this higher! 💪`;
  } else {
    comment += `With focused effort on the key areas, ${agentName.split(' ')[0]} has clear potential for significant growth! 🚀`;
  }

  return comment;
};
