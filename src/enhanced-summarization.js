/* ========== ENHANCED SUMMARIZATION V5.0 - FINAL ========== */

/**
 * COMPLETE SALES INTELLIGENCE ENGINE
 * 
 * Features:
 * - Weighted recency calculation (recent sessions matter more)
 * - Binary questions excluded from scoring
 * - Sales science knowledge base (Sandler, SPIN, Challenger - hidden)
 * - Plain English coaching output
 * - Concise, professional language
 * - 10% target + 10% stretch improvement goals
 * - Accurate 4/5 = 80% representation
 * 
 * Branded as: "Powered by Claude AI — Advanced Sales Intelligence"
 */

// ==========================================
// WEIGHTED RECENCY CALCULATION ENGINE
// ==========================================

/**
 * Calculate weighted score with recency emphasis
 * Recent sessions weighted MORE than old sessions
 * 
 * Last 10 sessions:   3.0x weight (current skill level)
 * Sessions 11-20:     2.0x weight (recent performance)
 * Sessions 21-30:     1.5x weight (established baseline)
 * Sessions 31+:       1.0x weight (historical context)
 */
const calculateWeightedScore = (data) => {
  if (data.length === 0) return 0;

  // Sort by date (newest first)
  const sortedData = [...data].sort((a, b) => b.date - a.date);

  // Assign weights based on recency
  const weightedData = sortedData.map((item, index) => {
    let weight = 1.0;
    if (index < 10) weight = 3.0;        // Last 10: current skill
    else if (index < 20) weight = 2.0;   // 11-20: recent performance
    else if (index < 30) weight = 1.5;   // 21-30: established baseline
    // 31+: 1.0x (historical)

    return {
      score: item.score,
      weight: weight,
      date: item.date
    };
  });

  // Calculate weighted average
  const weightedSum = weightedData.reduce((sum, item) => sum + (item.score * item.weight), 0);
  const totalWeight = weightedData.reduce((sum, item) => sum + item.weight, 0);

  return weightedSum / totalWeight;
};

// ==========================================
// INTERNAL SALES SCIENCE KNOWLEDGE BASE
// ==========================================

const SALES_INTELLIGENCE_DB = {
  
  discovery: {
    surface_questioning: {
      behaviors: ['asked about property', 'asked timeline', 'asked price expectation', 'asked motivation'],
      insight: 'Gets basic facts but misses emotional drivers and urgency',
      fix: 'Ask 3 follow-up questions after identifying any problem: How does this affect you? What happens if not solved? What is this costing you?',
      impact: 'Clients don\'t feel urgency, leading to "I need to think about it" responses'
    },
    
    deep_probing: {
      behaviors: ['asked why', 'explored feelings', 'asked impact', 'asked consequences', 'quantified problem'],
      insight: 'Uncovers true motivations and creates self-discovered urgency',
      fix: 'Document specific phrases that work - use as templates for team',
      impact: 'Dramatically increases appointment-to-close rates'
    },
    
    pain_quantification: {
      behaviors: ['asked cost of problem', 'asked time wasted', 'calculated financial impact', 'discussed consequences of inaction'],
      insight: 'When client quantifies their pain, price objections drop significantly',
      fix: 'Always ask: "How much is this costing you?" and "What would it be worth to solve this?"',
      impact: 'Eliminates most price objections before they arise'
    },
    
    urgency_creation: {
      behaviors: ['asked timeline consequence', 'discussed market changes', 'referenced capacity limits', 'created scarcity'],
      insight: 'Urgency moves "think about it" to "yes" - reduces decision time',
      fix: 'Ask: "What happens if this isn\'t resolved in the next 30/60/90 days?"',
      impact: 'Major reduction in "I need to think about it" stalls'
    }
  },

  rapport: {
    ice_breaking: {
      behaviors: ['small talk', 'personal questions', 'humor', 'found commonality', 'made client comfortable'],
      insight: 'Transitions from "sales call" to "conversation" - reduces defensiveness',
      fix: 'Create personal connection before business discussion',
      impact: 'Significantly increases appointment booking rates'
    },
    
    active_listening: {
      behaviors: ['took notes', 'repeated back', 'asked clarifying questions', 'let client finish', 'acknowledged feelings'],
      insight: 'Client feels heard - increases trust and cooperation',
      fix: '3-second pause before responding. Repeat key points back.',
      impact: 'Foundation for all other sales techniques'
    },
    
    empathy_demonstration: {
      behaviors: ['acknowledged emotions', 'validated concerns', 'showed understanding', 'connected personally'],
      insight: 'De-escalates emotional resistance - critical for distressed sellers',
      fix: 'When emotion detected, stop and address it before continuing',
      impact: 'Major increase in cooperation from emotional sellers'
    },
    
    patience_pacing: {
      behaviors: ['slowed down for elderly', 'didn\'t rush', 'allowed silence', 'gave thinking time'],
      insight: 'Critical for elderly/cautious clients - builds trust substantially',
      fix: 'Adapt pace to client. Elderly clients need significantly more time.',
      impact: 'Massive impact for high-value demographic (65+ with equity)'
    },
    
    rushed: {
      behaviors: ['cutting off client', 'quick transitions', 'impatience', 'hurrying'],
      insight: 'Triggers client defensiveness and resistance',
      fix: 'Implement 30-second pause rule before transitions. Conscious breathing.',
      impact: 'Each rushed moment reduces trust and increases objections'
    },
    
    interrupting: {
      behaviors: ['talking over client', 'not letting them finish', 'cutting off mid-sentence'],
      insight: 'Signals "I don\'t care what you think" - breaks trust instantly',
      fix: 'Count to three after client speaks. If you interrupt, stop and apologize.',
      impact: 'Causes clients to shut down or hang up'
    }
  },

  objections: {
    think_about_it: {
      behaviors: ['asked what specifically', 'isolated concern', 'addressed hesitation', 'asked permission to discuss'],
      insight: 'Most who say "think about it" never call back - must address now',
      fix: 'Never accept first objection. Ask: "What specifically do you need to think about?"',
      impact: 'Recovering these responses significantly boosts close rates'
    },
    
    price_objection: {
      behaviors: ['referenced their quantified pain', 'compared to alternatives', 'broke down value', 'reframed perspective'],
      insight: 'Price objections mean you skipped pain quantification earlier',
      fix: 'Go back to discovery: "What was this costing you again?" Reference THEIR number.',
      impact: 'Proper handling maintains margins and close rates'
    },
    
    competitor_objection: {
      behaviors: ['taught unique insight', 'didn\'t bash competitor', 'asked about comparison criteria', 'refocused on their problem'],
      insight: 'Don\'t compete on features - refocus on their unique situation',
      fix: 'Ask: "What specifically appeals to you about them?" Then refocus on their problem.',
      impact: 'Differentiates without appearing desperate'
    }
  },

  closing: {
    assumptive_language: {
      behaviors: ['assumed yes', 'used "when" not "if"', 'moved to next steps naturally', 'confirmed details'],
      insight: 'Confidence is contagious - assumptive language increases closes',
      fix: 'Say "When would you like the appointment?" not "Would you like..."',
      impact: 'Signals authority and expectation of agreement'
    },
    
    trial_closing: {
      behaviors: ['tested readiness', 'asked confirming questions', 'checked agreement throughout'],
      insight: 'Tests temperature without risking full close rejection',
      fix: 'Throughout call: "Does this make sense?" "How does this sound?"',
      impact: 'Prevents wasted closing attempts on unready prospects'
    },
    
    multiple_attempts: {
      behaviors: ['tried different angles', 'didn\'t give up on first no', 'circled back to pain'],
      insight: 'Average close happens on 3rd-5th attempt - first "no" means little',
      fix: 'Commit to minimum 3 closing attempts per qualified prospect',
      impact: 'Could double close rate by itself'
    },
    
    taking_control: {
      behaviors: ['led conversation', 'set agenda', 'managed objections confidently', 'didn\'t let client dictate terms'],
      insight: 'Buyer wants seller to lead - confidence breeds confidence',
      fix: 'Open with agenda: "Here\'s what we\'ll cover..." Then stick to it.',
      impact: 'Positions as consultant not commodity salesperson'
    }
  }
};

// ==========================================
// PERFORMANCE IMPROVEMENT FRAMEWORK
// ==========================================

const IMPROVEMENT_TARGETS = {
  '40_to_60': {
    baseImprovement: 10,    // Target: +10%
    stretchImprovement: 20, // Stretch: +20%
    timeline: '4-6 weeks intensive coaching',
    focus: 'Foundation building - basic discovery, rapport, closing attempts'
  },
  
  '60_to_75': {
    baseImprovement: 10,
    stretchImprovement: 15,
    timeline: '3-4 weeks focused practice',
    focus: 'Skill refinement - deeper probing, objection handling, consistency'
  },
  
  '75_to_85': {
    baseImprovement: 8,
    stretchImprovement: 12,
    timeline: '4-6 weeks mastery phase',
    focus: 'Excellence development - advanced techniques, adaptation, momentum'
  },
  
  '85_to_100': {
    baseImprovement: 5,
    stretchImprovement: 10,
    timeline: '6-8 weeks optimization',
    focus: 'Mastery optimization - timing, intuition, subtle signals'
  }
};

// ==========================================
// MAIN ANALYSIS FUNCTION
// ==========================================

export const analyzeCategory = (category, agentId, sessions) => {
  const categoryKey = category.toLowerCase().replace(/[^a-z]/g, '_').replace(/__+/g, '_');
  
  const agentSessions = sessions
    .filter(s => s.agent_id === agentId)
    .sort((a, b) => new Date(a.call_date || a.session_date) - new Date(b.call_date || b.session_date));
  
  // Extract ONLY 1-5 category ratings (NO binary questions)
  const data = agentSessions
    .map(session => ({
      score: session.category_scores?.[0]?.[categoryKey],
      comment: session.category_scores?.[0]?.[`${categoryKey}_comment`],
      date: new Date(session.call_date || session.session_date),
      sessionId: session.id
    }))
    .filter(d => d.score !== null && d.score !== undefined && d.score >= 1 && d.score <= 5);

  if (data.length === 0) {
    return {
      summary: "No QC data available yet. Add sessions to unlock Claude AI analysis.",
      score: 0,
      consistency: 0,
      trend: "neutral",
      trendStrength: 0,
      strengths: [],
      gaps: [],
      focusAreas: [],
      projection: null
    };
  }

  // WEIGHTED CALCULATION (recent sessions matter more)
  const weightedAvgScore = calculateWeightedScore(data);
  const avgPercentage = (weightedAvgScore / 5) * 100;

  // Calculate consistency (standard deviation adjusted for weighted scores)
  const variance = data.reduce((sum, d) => sum + Math.pow(d.score - weightedAvgScore, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const consistency = Math.max(0, 100 - (stdDev * 40));

  // Analyze trend
  const { trend, trendStrength } = analyzeTrendWeighted(data);

  // INTERNAL: Analyze using sales science
  const comments = data.map(d => ({ text: d.comment, score: d.score })).filter(c => c.text);
  const internalAnalysis = analyzeWithSalesScience(comments, category, avgPercentage);

  // Generate improvement targets
  const projection = calculateImprovementTargets(avgPercentage);

  // Generate user-facing output
  const summary = generateProfessionalOutput(
    category,
    avgPercentage,
    consistency,
    trend,
    trendStrength,
    internalAnalysis,
    projection,
    data.length
  );

  return {
    summary,
    score: Math.round(avgPercentage),
    consistency: Math.round(consistency),
    trend,
    trendStrength,
    strengths: internalAnalysis.strengths,
    gaps: internalAnalysis.gaps,
    focusAreas: internalAnalysis.focusAreas,
    projection
  };
};

// ==========================================
// WEIGHTED TREND ANALYSIS
// ==========================================

const analyzeTrendWeighted = (data) => {
  if (data.length < 6) return { trend: "stable", trendStrength: 0 };

  // Compare recent weighted avg vs older weighted avg
  const recentData = data.slice(-10);
  const olderData = data.slice(0, Math.min(10, data.length - 10));

  const recentWeighted = calculateWeightedScore(recentData);
  const olderWeighted = calculateWeightedScore(olderData);

  const change = recentWeighted - olderWeighted;

  let trend = "stable";
  let trendStrength = 0;

  if (Math.abs(change) < 0.3) {
    trend = "stable";
  } else if (change > 0.5) {
    trend = "accelerating";
    trendStrength = Math.min(Math.round(change * 20), 40);
  } else if (change > 0) {
    trend = "improving";
    trendStrength = Math.round(change * 20);
  } else if (change < -0.5) {
    trend = "deteriorating";
    trendStrength = Math.min(Math.round(Math.abs(change) * 20), 40);
  } else {
    trend = "declining";
    trendStrength = Math.round(Math.abs(change) * 20);
  }

  return { trend, trendStrength };
};

// ==========================================
// SALES SCIENCE ANALYZER
// ==========================================

const analyzeWithSalesScience = (comments, category, avgPercentage) => {
  const analysis = {
    strengths: [],
    gaps: [],
    focusAreas: [],
    detectedBehaviors: {}
  };

  if (comments.length === 0) return analysis;

  const knowledgeDomain = getSalesKnowledgeDomain(category);
  if (!knowledgeDomain) return analysis;

  // Detect behaviors
  const behaviorFrequency = {};
  
  comments.forEach(({ text, score }) => {
    const lowerText = text.toLowerCase();
    
    Object.entries(knowledgeDomain).forEach(([behaviorKey, behaviorData]) => {
      const matchCount = behaviorData.behaviors.filter(keyword => 
        lowerText.includes(keyword.toLowerCase())
      ).length;
      
      if (matchCount > 0) {
        behaviorFrequency[behaviorKey] = (behaviorFrequency[behaviorKey] || 0) + 1;
        analysis.detectedBehaviors[behaviorKey] = behaviorData;
      }
    });
  });

  // Build strengths (positive behaviors found frequently)
  Object.entries(behaviorFrequency).forEach(([behaviorKey, frequency]) => {
    const behavior = analysis.detectedBehaviors[behaviorKey];
    if (!behavior) return;
    
    const isPositive = !['rushed', 'interrupting', 'surface_questioning'].includes(behaviorKey);
    
    if (isPositive && frequency >= 2) {
      analysis.strengths.push({
        what: translateToPlainEnglish(behaviorKey),
        why: behavior.insight,
        frequency: frequency
      });
    }
  });

  // Build gaps (missing critical behaviors or negative patterns)
  Object.entries(knowledgeDomain).forEach(([behaviorKey, behaviorData]) => {
    const detected = behaviorFrequency[behaviorKey] || 0;
    const isNegative = ['rushed', 'interrupting', 'surface_questioning'].includes(behaviorKey);
    
    if (isNegative && detected >= 3) {
      // Negative pattern detected frequently
      analysis.gaps.push({
        what: translateToPlainEnglish(behaviorKey),
        why: behaviorData.insight,
        fix: behaviorData.fix,
        impact: behaviorData.impact
      });
    } else if (!isNegative && detected === 0 && analysis.gaps.length < 2) {
      // Missing important positive behavior
      analysis.gaps.push({
        what: `Missing: ${translateToPlainEnglish(behaviorKey)}`,
        why: behaviorData.insight,
        fix: behaviorData.fix,
        impact: behaviorData.impact
      });
    }
  });

  // Focus areas = top 3 gaps
  analysis.focusAreas = analysis.gaps.slice(0, 3).map(gap => ({
    action: gap.fix,
    impact: gap.impact
  }));

  return analysis;
};

// ==========================================
// IMPROVEMENT TARGET CALCULATOR
// ==========================================

const calculateImprovementTargets = (currentPercentage) => {
  let framework;
  
  if (currentPercentage < 60) {
    framework = IMPROVEMENT_TARGETS['40_to_60'];
  } else if (currentPercentage < 75) {
    framework = IMPROVEMENT_TARGETS['60_to_75'];
  } else if (currentPercentage < 85) {
    framework = IMPROVEMENT_TARGETS['75_to_85'];
  } else {
    framework = IMPROVEMENT_TARGETS['85_to_100'];
  }

  const currentRounded = Math.round(currentPercentage);
  const targetScore = Math.min(100, currentRounded + framework.baseImprovement);
  const stretchScore = Math.min(100, currentRounded + framework.stretchImprovement);

  // Estimate additional conversions
  const improvementPoints = targetScore - currentRounded;
  const estimatedConversions = Math.round(improvementPoints * 0.3); // Rough: 10% = 3 conversions

  return {
    current: currentRounded,
    target: targetScore,
    stretch: stretchScore,
    improvement: framework.baseImprovement,
    stretchImprovement: framework.stretchImprovement,
    timeline: framework.timeline,
    estimatedConversions: Math.max(2, estimatedConversions),
    focus: framework.focus
  };
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getSalesKnowledgeDomain = (category) => {
  const cat = category.toLowerCase();
  if (cat.includes('bond') || cat.includes('rapport')) return SALES_INTELLIGENCE_DB.rapport;
  if (cat.includes('magic') || cat.includes('problem') || cat.includes('discovery')) return SALES_INTELLIGENCE_DB.discovery;
  if (cat.includes('second') || cat.includes('ask')) return { ...SALES_INTELLIGENCE_DB.closing, ...SALES_INTELLIGENCE_DB.objections };
  if (cat.includes('clos')) return { ...SALES_INTELLIGENCE_DB.closing, ...SALES_INTELLIGENCE_DB.objections };
  return null;
};

const translateToPlainEnglish = (behaviorKey) => {
  const translations = {
    'surface_questioning': 'asking basic questions without follow-up',
    'deep_probing': 'digging deep with follow-up questions',
    'pain_quantification': 'getting client to quantify their problem',
    'urgency_creation': 'creating urgency by exploring consequences',
    'ice_breaking': 'building rapport with ice breakers',
    'active_listening': 'active listening and note-taking',
    'empathy_demonstration': 'showing genuine empathy',
    'patience_pacing': 'patient pacing adapted to client',
    'rushed': 'rushed pacing',
    'interrupting': 'interrupting clients',
    'think_about_it': 'handling "I need to think about it"',
    'price_objection': 'handling price objections',
    'assumptive_language': 'confident, assumptive language',
    'trial_closing': 'testing readiness with trial closes',
    'multiple_attempts': 'making multiple closing attempts',
    'taking_control': 'taking control of conversations'
  };
  return translations[behaviorKey] || behaviorKey.replace(/_/g, ' ');
};

// ==========================================
// PROFESSIONAL OUTPUT GENERATOR
// ==========================================

const generateProfessionalOutput = (
  category,
  avgPercentage,
  consistency,
  trend,
  trendStrength,
  analysis,
  projection,
  sessionCount
) => {
  let output = `**${Math.round(avgPercentage)}% Performance** (${Math.round(consistency)}% consistency) | ${sessionCount} sessions`;

  if (trend === "accelerating") output += ` 🚀 +${trendStrength}%`;
  else if (trend === "improving") output += ` 📈 +${trendStrength}%`;
  else if (trend === "declining") output += ` 📉 -${trendStrength}%`;
  else if (trend === "deteriorating") output += ` ⚠️ -${trendStrength}%`;

  output += "\n\n";

  const sections = [];

  // STRENGTHS (concise)
  if (analysis.strengths.length > 0) {
    output += `**✅ Demonstrated Strengths:**\n`;
    analysis.strengths.slice(0, 2).forEach(strength => {
      output += `**${strength.what.charAt(0).toUpperCase() + strength.what.slice(1)}** — ${strength.why}\n\n`;
    });
  }

  // GAPS (concise with impact)
  if (analysis.gaps.length > 0) {
    output += `**⚠️ Performance Opportunities:**\n\n`;
    analysis.gaps.slice(0, 2).forEach((gap, idx) => {
      output += `**${idx + 1}. ${gap.what.toUpperCase()}**\n`;
      output += `Why It Matters: ${gap.why}\n`;
      output += `Recommended Approach: ${gap.fix}\n`;
      output += `Expected Outcome: ${gap.impact}\n\n`;
    });
  }

  // FOCUS AREAS
  if (analysis.focusAreas.length > 0 && projection) {
    output += `**📈 Areas to Improve (${projection.current}% → ${projection.target}%+):**\n\n`;
    analysis.focusAreas.forEach((area, idx) => {
      output += `Focus Area ${idx + 1}:\n`;
      output += `   Recommended Action: ${area.action}\n`;
      output += `   Expected Impact: ${area.impact}\n\n`;
    });
  }

  // PROJECTION
  if (projection) {
    output += `**📊 Performance Projection:**\n`;
    output += `With focused development in the areas identified above:\n`;
    output += `• Current Level: ${projection.current}%\n`;
    output += `• Target Level: ${projection.target}% (coaching + practice)\n`;
    output += `• Stretch Goal: ${projection.stretch}% (with extra commitment)\n`;
    output += `• Estimated Additional Conversions: ${projection.estimatedConversions}-${projection.estimatedConversions + 2} per month\n`;
    output += `• Development Timeline: ${projection.timeline}\n\n`;
  }

  // TREND ALERT
  if (trend === "declining" || trend === "deteriorating") {
    output += `**⚠️ Trend Alert:** Performance ${trend} recently. Investigate root causes - possible burnout, confidence issues, or external factors.\n\n`;
  }

  output += `*💡 Powered by Claude AI — Advanced Sales Intelligence*`;

  return output.trim();
};

// ==========================================
// CLAUDE'S CLEVER COMMENT (Overall Performance)
// ==========================================

export const generateClaudesComment = (agentName, overallScore, categoryAnalyses, sessions, binaryQuestions) => {
  let emoji = overallScore >= 80 ? "🔥" : overallScore >= 70 ? "💪" : overallScore >= 60 ? "📈" : "⚠️";

  const sortedCategories = Object.entries(categoryAnalyses).sort((a, b) => b[1].score - a[1].score);
  const strongest = sortedCategories[0];
  const weakest = sortedCategories[sortedCategories.length - 1];

  if (!strongest || !weakest) {
    return `📊 ${agentName} needs more QC sessions for Claude AI analysis. Add sessions to unlock intelligent insights!`;
  }

  let comment = `${emoji} **${agentName} is at ${Math.round(overallScore)}% overall performance.** `;

  // Highlight strength
  if (strongest[1].score >= 75) {
    comment += `Strongest area: **${strongest[0]}** (${strongest[1].score}%) — this is a revenue-generating strength. `;
  }

  // Identify gap
  if (weakest[1].score < 70 && weakest[1].gaps && weakest[1].gaps.length > 0) {
    const primaryGap = weakest[1].gaps[0];
    comment += `Primary opportunity: **${weakest[0]}** (${weakest[1].score}%) — ${primaryGap.why} `;
  }

  // Actionable close
  if (overallScore < 60) {
    comment += `Focus on fundamentals: discovery depth, objection handling, closing persistence. Target: 70%+ within 4-6 weeks.`;
  } else if (overallScore < 75) {
    comment += `Path to 80%+: Master the development areas outlined above. Biggest gains available in ${weakest[0]}.`;
  } else if (overallScore < 85) {
    comment += `Excellence within reach: Refine ${weakest[0]} to match ${strongest[0]} performance. Document winning techniques for team training.`;
  } else {
    comment += `Elite performance: Leverage ${agentName}'s mastery for peer coaching. Focus on 95%+ optimizations.`;
  }

  // Add binary questions insights if provided
  if (binaryQuestions && Object.keys(binaryQuestions).length > 0) {
    const missedItems = Object.entries(binaryQuestions)
      .filter(([key, value]) => value.frequency < 0.7) // Less than 70% completion
      .map(([key, value]) => ({
        item: key,
        rate: Math.round(value.frequency * 100)
      }));

    if (missedItems.length > 0) {
      comment += `\n\n**Process Note:** `;
      missedItems.forEach(item => {
        comment += `${item.item.replace(/_/g, ' ')} (${item.rate}% completion). `;
      });
    }
  }

  return comment;
};

// ==========================================
// BINARY QUESTIONS ANALYZER (for Claude's comment)
// ==========================================

export const analyzeBinaryQuestions = (agentId, sessions) => {
  const agentSessions = sessions.filter(s => s.agent_id === agentId);
  
  if (agentSessions.length === 0) return null;

  const binaryResults = {};
  const binaryKeys = [
    'introduced_themselves',
    'asked_first_desired_price',
    'collected_decision_maker'
    // Add other binary question keys as needed
  ];

  binaryKeys.forEach(key => {
    const results = agentSessions
      .map(s => s.binary_questions?.[key])
      .filter(v => v !== null && v !== undefined);
    
    if (results.length > 0) {
      const yesCount = results.filter(v => v === 'Yes' || v === true).length;
      binaryResults[key] = {
        frequency: yesCount / results.length,
        total: results.length
      };
    }
  });

  return Object.keys(binaryResults).length > 0 ? binaryResults : null;
};
