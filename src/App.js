import React, { useState, useEffect } from 'react';
import { Home, TrendingUp, Award, Target, ArrowLeft, Phone } from 'lucide-react';
import './App.css';
import { supabase } from './supabase';

/* ========== SCORING QUESTIONS CONFIGURATION ========== */
const binaryQuestions = [
  {
    key: 'intro',
    text: 'Did the rep introduce themselves, the company, state the nature of the call and ask if it\'s a convenient time to talk?'
  },
  {
    key: 'first_ask', 
    text: 'Did the rep ask for first desired price, timeframe and explain our process confidently?'
  },
  {
    key: 'property_condition',
    text: 'Did the rep collect decision maker information, gather occupancy/tenant details and cover the condition of all major systems and possible repairs?'
  }
];

const ratedQuestions = [
  {
    key: 'bonding_rapport',
    text: 'Did the rep find, build and maintain a personal connection?',
    category: 'Bonding & Rapport'
  },
  {
    key: 'magic_problem',
    text: 'Did the rep identify the core reason for selling, gather and leverage pain points?',
    category: 'Magic Problem Discovery'
  },
  {
    key: 'second_ask',
    text: 'Did the rep review and discuss the estimated repair costs to generate a second price?',
    category: 'Second Ask'
  },
];

const closingQuestions = [
  {
    key: 'closing_offer_presentation',
    text: 'Did the rep present CASH and RBP offers clearly?',
    weight: 0.4
  },
  {
    key: 'closing_motivation',
    text: 'Does the rep use seller motivation to position the offer?',
    weight: 0.4
  },
  {
    key: 'closing_objections',
    text: 'Does the rep handle objections confidently?',
    weight: 0.2
  }
];

/* ========== CALCULATION LOGIC SECTION ========== */
const calculateOverallScore = (binaryScores, categoryScores) => {
  // Binary section (30% weight)
  const binaryValues = Object.values(binaryScores).filter(score => score !== null);
  const binaryCount = binaryValues.length;
  const binaryYesCount = binaryValues.filter(score => score === true).length;
  const binaryPercentage = binaryCount > 0 ? (binaryYesCount / binaryCount) * 100 : 100;
  const binaryWeighted = binaryPercentage * 0.3;

  // Category section (70% weight) - EXCLUDE NULL VALUES
  const categoryValues = [];
  
  // Add individual category scores (only if not null)
  if (categoryScores.bonding_rapport !== null && categoryScores.bonding_rapport !== undefined) {
    categoryValues.push(categoryScores.bonding_rapport);
  }
  if (categoryScores.magic_problem !== null && categoryScores.magic_problem !== undefined) {
    categoryValues.push(categoryScores.magic_problem);
  }
  if (categoryScores.second_ask !== null && categoryScores.second_ask !== undefined) {
    categoryValues.push(categoryScores.second_ask);
  }
  if (categoryScores.objection_handling !== null && categoryScores.objection_handling !== undefined) {
    categoryValues.push(categoryScores.objection_handling);
  }
  
  // Calculate weighted closing score (only if at least one closing score exists)
  const closingScores = [];
  if (categoryScores.closing_offer_presentation !== null && categoryScores.closing_offer_presentation !== undefined) {
    closingScores.push({ score: categoryScores.closing_offer_presentation, weight: 0.4 });
  }
  if (categoryScores.closing_motivation !== null && categoryScores.closing_motivation !== undefined) {
    closingScores.push({ score: categoryScores.closing_motivation, weight: 0.4 });
  }
  if (categoryScores.closing_objections !== null && categoryScores.closing_objections !== undefined) {
    closingScores.push({ score: categoryScores.closing_objections, weight: 0.2 });
  }
  
  // Only add closing average if at least one closing score exists
  if (closingScores.length > 0) {
    const totalWeight = closingScores.reduce((sum, item) => sum + item.weight, 0);
    const weightedSum = closingScores.reduce((sum, item) => sum + (item.score * item.weight), 0);
    const closingAverage = weightedSum / totalWeight;
    categoryValues.push(closingAverage);
  }
  
  const categoryAverage = categoryValues.length > 0 ? 
    categoryValues.reduce((sum, val) => sum + val, 0) / categoryValues.length : 0;
  const categoryPercentage = (categoryAverage / 5) * 100;
  const categoryWeighted = categoryPercentage * 0.7;

  return Math.round((binaryWeighted + categoryWeighted) * 10) / 10;
};

/* ========== MAIN APP COMPONENT ========== */
const App = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agents, setAgents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qcAgents, setQcAgents] = useState([]);
  const [objectionLibrary, setObjectionLibrary] = useState([]);
  const [skillsLibrary, setSkillsLibrary] = useState([]);

  useEffect(() => {
    fetchAgentsData();
    fetchQCAgents();
    fetchObjectionLibrary();
    fetchSkillsLibrary();
  }, []);

  /* ========== DATA FETCHING SECTION ========== */
  const fetchQCAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('qc_agents')
        .select('*');
      
      if (error) throw error;
      setQcAgents(data);
    } catch (error) {
      console.error('Error fetching QC agents:', error);
    }
  };

  const fetchObjectionLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('objections_library')
        .select('*')
        .order('usage_count', { ascending: false });
      
      if (error) throw error;
      setObjectionLibrary(data || []);
    } catch (error) {
      console.error('Error fetching objection library:', error);
    }
  };

  const fetchSkillsLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('skills_library')
        .select('*')
        .order('usage_count', { ascending: false });
      
      if (error) throw error;
      setSkillsLibrary(data || []);
    } catch (error) {
      console.error('Error fetching skills library:', error);
    }
  };

  const fetchAgentsData = async () => {
    try {
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('*');

      if (agentsError) throw agentsError;

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('qc_sessions')
        .select(`
          *,
          agents(*),
          qc_agents(*),
          binary_scores(*),
          category_scores(*)
        `);

      if (sessionsError) throw sessionsError;

      const agentPerformance = agentsData.map(agent => {
        const agentSessions = sessionsData.filter(session => session.agent_id === agent.id);
        
        if (agentSessions.length === 0) {
          return {
            id: agent.id,
            name: agent.name,
            overallScore: 0,
            status: 'red',
            scores: {
              'Bonding & Rapport': 0,
              'Magic Problem': 0,
              'Second Ask': 0,
              'Closing': 0
            },
            trend: 'down',
            lastEvaluation: 'No data'
          };
        }

        const totalSessions = agentSessions.length;
        let totalBonding = 0, totalMagic = 0, totalSecond = 0, totalClosing = 0;
        let bondingCount = 0, magicCount = 0, secondCount = 0, closingCount = 0;

        agentSessions.forEach(session => {
          if (session.category_scores && session.category_scores.length > 0) {
            const scores = session.category_scores[0];
            
            // Only add scores that are not null and count them
            if (scores.bonding_rapport !== null && scores.bonding_rapport !== undefined) {
              totalBonding += scores.bonding_rapport;
              bondingCount++;
            }
            if (scores.magic_problem !== null && scores.magic_problem !== undefined) {
              totalMagic += scores.magic_problem;
              magicCount++;
            }
            if (scores.second_ask !== null && scores.second_ask !== undefined) {
              totalSecond += scores.second_ask;
              secondCount++;
            }
            
            // Handle closing scores with null checking
            let totalClosingWeight = 0;
            let weightedClosingSum = 0;
            
            if (scores.closing_offer_presentation !== null && scores.closing_offer_presentation !== undefined) {
              weightedClosingSum += scores.closing_offer_presentation * 0.4;
              totalClosingWeight += 0.4;
            }
            if (scores.closing_motivation !== null && scores.closing_motivation !== undefined) {
              weightedClosingSum += scores.closing_motivation * 0.4;
              totalClosingWeight += 0.4;
            }
            if (scores.closing_objections !== null && scores.closing_objections !== undefined) {
              weightedClosingSum += scores.closing_objections * 0.2;
              totalClosingWeight += 0.2;
            }
            
            // Only add closing average if at least one closing score exists
            if (totalClosingWeight > 0) {
              const closingAvg = weightedClosingSum / totalClosingWeight;
              totalClosing += closingAvg;
              closingCount++;
            }
          }
        });

        // Calculate averages only using sessions that had scores (not N/A)
        const avgBonding = bondingCount > 0 ? ((totalBonding / bondingCount) / 5 * 100) : 0;
        const avgMagic = magicCount > 0 ? ((totalMagic / magicCount) / 5 * 100) : 0;
        const avgSecond = secondCount > 0 ? ((totalSecond / secondCount) / 5 * 100) : 0;
        const avgClosing = closingCount > 0 ? ((totalClosing / closingCount) / 5 * 100) : 0;

        // Calculate overall score based on categories that have data
        const validScores = [];
        if (bondingCount > 0) validScores.push(avgBonding);
        if (magicCount > 0) validScores.push(avgMagic);
        if (secondCount > 0) validScores.push(avgSecond);
        if (closingCount > 0) validScores.push(avgClosing);

        const overallScore = validScores.length > 0 ? 
          validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
        
        return {
          id: agent.id,
          name: agent.name,
          overallScore: Math.round(overallScore * 10) / 10,
          status: overallScore >= 70 ? 'green' : overallScore >= 50 ? 'yellow' : 'red',
          scores: {
            'Bonding & Rapport': Math.round(avgBonding),
            'Magic Problem': Math.round(avgMagic),
            'Second Ask': Math.round(avgSecond),
            'Closing': Math.round(avgClosing)
          },
          trend: 'up',
          lastEvaluation: agentSessions[agentSessions.length - 1]?.session_date || 'No data'
        };
      });

      setAgents(agentPerformance);
      setSessions(sessionsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  /* ========== UTILITY FUNCTIONS SECTION ========== */
  const teamData = {
    averageScore: agents.length > 0 ? Math.round(agents.reduce((sum, agent) => sum + agent.overallScore, 0) / agents.length * 10) / 10 : 0,
    trend: 2.3,
    topRep: agents.length > 0 ? agents.reduce((prev, current) => prev.overallScore > current.overallScore ? prev : current) : { name: 'No data', score: 0 },
    mostImproved: { name: 'Calculating...', improvement: 0 },
    teamStrength: (() => {
      if (agents.length === 0) return { category: 'No data', score: 0 };
      
      const categoryAverages = {
        'Bonding & Rapport': agents.reduce((sum, agent) => sum + (agent.scores['Bonding & Rapport'] || 0), 0) / agents.length,
        'Magic Problem': agents.reduce((sum, agent) => sum + (agent.scores['Magic Problem'] || 0), 0) / agents.length,
        'Second Ask': agents.reduce((sum, agent) => sum + (agent.scores['Second Ask'] || 0), 0) / agents.length,
        'Closing': agents.reduce((sum, agent) => sum + (agent.scores['Closing'] || 0), 0) / agents.length
      };
      
      const strongest = Object.entries(categoryAverages).reduce((prev, current) => 
        current[1] > prev[1] ? current : prev
      );
      
      return { category: strongest[0], score: Math.round(strongest[1] * 10) / 10 };
    })()
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'green': return 'status-green';
      case 'yellow': return 'status-yellow';
      case 'red': return 'status-red';
      default: return 'status-gray';
    }
  };

  const getStatusIndicator = (status) => {
    switch(status) {
      case 'green': return '🟢';
      case 'yellow': return '🟡';
      case 'red': return '🔴';
      default: return '⚪';
    }
  };

  const getProgressBarColor = (score) => {
    if (score >= 70) return 'progress-green';
    if (score >= 50) return 'progress-yellow';
    return 'progress-red';
  };

  const generateQCCommentSummary = (category, agentId) => {
    const agentSessions = sessions.filter(s => s.agent_id === agentId);
    const categoryKey = category.toLowerCase().replace(/[^a-z]/g, '_').replace(/__+/g, '_');
    
    const comments = agentSessions
      .map(session => session.category_scores?.[0]?.[`${categoryKey}_comment`])
      .filter(comment => comment && comment.trim());
    
    if (comments.length === 0) return "No QC comments available for this category.";
    
    const positiveWords = ['excellent', 'great', 'good', 'strong', 'well', 'solid'];
    const negativeWords = ['needs', 'weak', 'poor', 'lacking', 'struggled', 'missed'];
    
    const sentiment = comments.some(c => 
      positiveWords.some(word => c.toLowerCase().includes(word))
    ) ? 'positive' : 
    comments.some(c => 
      negativeWords.some(word => c.toLowerCase().includes(word))
    ) ? 'negative' : 'neutral';
    
    return comments.join(' ');
  };

  /* ========== DASHBOARD COMPONENT SECTION ========== */
  const Dashboard = () => (
    <div className="app-container">
      <div className="app-header">
        <div className="header-content">
          <Home className="header-icon" />
          <div>
            <h1 className="header-title">TRUSTED HOME BUYERS</h1>
            <p className="header-subtitle">Performance Command Center</p>
          </div>
        </div>
      </div>

      <div className="main-content">
        <h2 className="section-title">Team Performance Highlights</h2>
        
        <div className="team-cards-grid">
          <div className="team-card">
            <div className="card-header">
              <h3 className="card-title">Team Average Score</h3>
              <Target className="card-icon" />
            </div>
            <div className="card-score">{teamData.averageScore}%</div>
            <div className="card-trend">
              <TrendingUp className="trend-icon" />
              <span>+{teamData.trend}% from last week</span>
            </div>
          </div>

          <div className="team-card">
            <div className="card-header">
              <h3 className="card-title">Top Rep This Week</h3>
              <Award className="card-icon-gold" />
            </div>
            <div className="card-name">{teamData.topRep.name}</div>
            <div className="card-subscore">{teamData.topRep.overallScore}%</div>
            <div className="badge badge-gold">🏆 Top Performer</div>
          </div>

          <div className="team-card">
            <div className="card-header">
              <h3 className="card-title">Most Improved Rep</h3>
              <TrendingUp className="card-icon-green" />
            </div>
            <div className="card-name">{teamData.mostImproved.name}</div>
            <div className="card-subscore-green">+{teamData.mostImproved.improvement}%</div>
            <div className="badge badge-green">📈 Most Growth</div>
          </div>

          <div className="team-card">
            <div className="card-header">
              <h3 className="card-title">Team's Greatest Strength</h3>
              <Target className="card-icon-purple" />
            </div>
            <div className="card-strength">{teamData.teamStrength.category}</div>
            <div className="card-subscore-purple">{teamData.teamStrength.score}%</div>
            <div className="badge badge-purple">💪 Team Superpower</div>
          </div>
        </div>

        <h2 className="section-title">Agent Performance</h2>
        <div className="section-actions">
          <button 
            onClick={() => setCurrentView('qc-scoring')}
            className="qc-scoring-btn"
          >
            + New QC Evaluation
          </button>
        </div>
        <div className="agent-cards-grid">
          {loading ? (
            <div className="loading-state">Loading agents...</div>
          ) : (
            agents.map((agent) => (
              <div 
                key={agent.id} 
                className="agent-card"
                onClick={() => {
                  setSelectedAgent(agent);
                  setCurrentView('reporting');
                }}
              >
                <div className="agent-card-header">
                  <h3 className="agent-name">{agent.name}</h3>
                  <span className="status-indicator">{getStatusIndicator(agent.status)}</span>
                </div>
                <div className="agent-score">{agent.overallScore}%</div>
                <div className="agent-date">Last: {agent.lastEvaluation}</div>
                <div className={`agent-status-bar ${getStatusColor(agent.status)}`}></div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  /* ========== REPORTING VIEW COMPONENT SECTION ========== */
  const ReportingView = () => (
    <div className="app-container">
      <div className="app-header">
        <div className="header-content">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="back-button"
          >
            <ArrowLeft className="back-icon" />
          </button>
          <Home className="header-icon" />
          <div>
            <h1 className="header-title">Agent Performance - {selectedAgent.name}</h1>
            <p className="header-subtitle">Overall Score: {selectedAgent.overallScore}% {getStatusIndicator(selectedAgent.status)}</p>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="performance-card">
          <h2 className="section-title">Performance Breakdown</h2>
          
          <div className="progress-container">
            {Object.entries(selectedAgent.scores).map(([category, score]) => (
              <div key={category} className="progress-item">
                <div className="progress-header">
                  <span className="progress-label">{category}</span>
                  <span className="progress-score">{score}%</span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar ${getProgressBarColor(score)}`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="insights-container">
            <div className="insights-grid">
              <div>
                <h4 className="insights-title-green">Strengths:</h4>
                <p className="insights-text">
                  {Object.entries(selectedAgent.scores)
                    .filter(([_, score]) => score >= 85)
                    .map(([category]) => category)
                    .join(', ') || 'Building foundational skills'}
                </p>
              </div>
              <div>
                <h4 className="insights-title-yellow">Focus Areas:</h4>
                <p className="insights-text">
                  {Object.entries(selectedAgent.scores)
                    .filter(([_, score]) => score < 70)
                    .map(([category]) => category)
                    .join(', ') || 'Continue current development'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setCurrentView('deepdive')}
          className="deep-dive-button"
        >
          <Phone className="button-icon" />
          <span>View Scoring Sessions & Deep Dive Analysis</span>
        </button>
      </div>
    </div>
  );

/* ========== DEEP DIVE VIEW COMPONENT SECTION ========== */
const DeepDiveView = () => {
  // Import React hooks we need
  const { useCallback, useRef } = React;

  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // ESC key listener for modals
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (showEditModal) {
          setShowEditModal(false);
        }
        if (showSessionDetail) {
          setShowSessionDetail(false);
        }
      }
    };

    if (showEditModal || showSessionDetail) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showEditModal, showSessionDetail]);

  const handleSessionClick = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('qc_sessions')
        .select(`
          *,
          binary_scores(*),
          category_scores(*),
          qc_agents(name)
        `)
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      setSelectedSession(data);
      setShowSessionDetail(true);
    } catch (error) {
      console.error('Error fetching session details:', error);
    }
  };

  const handleEditSession = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('qc_sessions')
        .select(`
          *,
          binary_scores(*),
          category_scores(*)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      // Initialize with completely stable data structure
      const initialData = {
        property_address: data.property_address || '',
        lead_status: data.lead_status || 'Active',
        call_date: data.call_date || '',
        call_time: data.call_time || '',
        final_comment: data.final_comment || '',
        intro: data.binary_scores?.[0]?.intro || null,
        first_ask: data.binary_scores?.[0]?.first_ask || null,
        property_condition: data.binary_scores?.[0]?.property_condition || null,
        bonding_rapport: data.category_scores?.[0]?.bonding_rapport || null,
        bonding_rapport_comment: data.category_scores?.[0]?.bonding_rapport_comment || '',
        magic_problem: data.category_scores?.[0]?.magic_problem || null,
        magic_problem_comment: data.category_scores?.[0]?.magic_problem_comment || '',
        second_ask: data.category_scores?.[0]?.second_ask || null,
        second_ask_comment: data.category_scores?.[0]?.second_ask_comment || '',
        objection_handling: data.category_scores?.[0]?.objection_handling || null,
        objection_handling_comment: data.category_scores?.[0]?.objection_handling_comment || '',
        closing_offer_presentation: data.category_scores?.[0]?.closing_offer_presentation || null,
        closing_offer_comment: data.category_scores?.[0]?.closing_offer_comment || '',
        closing_motivation: data.category_scores?.[0]?.closing_motivation || null,
        closing_motivation_comment: data.category_scores?.[0]?.closing_motivation_comment || '',
        closing_objections: data.category_scores?.[0]?.closing_objections || null,
        closing_objections_comment: data.category_scores?.[0]?.closing_objections_comment || ''
      };

      setEditingSession(sessionId);
      setEditFormData(initialData);
      setShowEditModal(true);
      
    } catch (error) {
      console.error('Error loading session for edit:', error);
      alert('Error loading session data');
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Update QC session
      const { error: sessionError } = await supabase
        .from('qc_sessions')
        .update({
          property_address: editFormData.property_address,
          lead_status: editFormData.lead_status,
          call_date: editFormData.call_date,
          call_time: editFormData.call_time,
          final_comment: editFormData.final_comment
        })
        .eq('id', editingSession);

      if (sessionError) throw sessionError;

      // Update binary scores
      const { error: binaryError } = await supabase
        .from('binary_scores')
        .update({
          intro: editFormData.intro,
          first_ask: editFormData.first_ask,
          property_condition: editFormData.property_condition
        })
        .eq('session_id', editingSession);

      if (binaryError) throw binaryError;

      // Update category scores
      const { error: categoryError } = await supabase
        .from('category_scores')
        .update({
          bonding_rapport: editFormData.bonding_rapport,
          bonding_rapport_comment: editFormData.bonding_rapport_comment,
          magic_problem: editFormData.magic_problem,
          magic_problem_comment: editFormData.magic_problem_comment,
          second_ask: editFormData.second_ask,
          second_ask_comment: editFormData.second_ask_comment,
          objection_handling: editFormData.objection_handling,
          objection_handling_comment: editFormData.objection_handling_comment,
          closing_offer_presentation: editFormData.closing_offer_presentation,
          closing_offer_comment: editFormData.closing_offer_comment,
          closing_motivation: editFormData.closing_motivation,
          closing_motivation_comment: editFormData.closing_motivation_comment,
          closing_objections: editFormData.closing_objections,
          closing_objections_comment: editFormData.closing_objections_comment
        })
        .eq('session_id', editingSession);

      if (categoryError) throw categoryError;

      // Recalculate overall score
      const binaryScores = {
        intro: editFormData.intro,
        first_ask: editFormData.first_ask,
        property_condition: editFormData.property_condition
      };

      const categoryScores = {
        bonding_rapport: editFormData.bonding_rapport,
        magic_problem: editFormData.magic_problem,
        second_ask: editFormData.second_ask,
        objection_handling: editFormData.objection_handling,
        closing_offer_presentation: editFormData.closing_offer_presentation,
        closing_motivation: editFormData.closing_motivation,
        closing_objections: editFormData.closing_objections
      };

      const newOverallScore = calculateOverallScore(binaryScores, categoryScores);

      // Update overall score
      await supabase
        .from('qc_sessions')
        .update({ overall_score: newOverallScore })
        .eq('id', editingSession);

      setShowEditModal(false);
      alert('Session updated successfully!');
      await fetchAgentsData();
    } catch (error) {
      console.error('Error updating session:', error);
      alert('Error updating session');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this QC session?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('qc_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      alert('QC Session deleted successfully');
      await fetchAgentsData();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session');
    }
  };

  // SIMPLE handler - back to basics
  const handleFormChange = (fieldName, value) => {
    setEditFormData(prevData => ({
      ...prevData,
      [fieldName]: value
    }));
  };

  const agentSessions = sessions.filter(session => session.agent_id === selectedAgent.id);
  const activeCalls = agentSessions.filter(session => session.lead_status === 'Active').length;
  const pendingCalls = agentSessions.filter(session => session.lead_status === 'Pending').length;
  const deadCalls = agentSessions.filter(session => session.lead_status === 'Dead').length;

  // Session Detail Modal
  const SessionDetailModal = () => {
    return showSessionDetail && selectedSession && (
      <div 
        className="modal-overlay" 
        onClick={() => setShowSessionDetail(false)}
      >
        <div 
          className="modal-content" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="session-detail-header">
            <div>
              <h2>Session Details - {selectedAgent.name}</h2>
              <p><strong>Property:</strong> {selectedSession.property_address}</p>
              <p><strong>Date:</strong> {selectedSession.call_date} {selectedSession.call_time}</p>
              <p><strong>Lead Status:</strong> {selectedSession.lead_status}</p>
              <p><strong>QC Agent:</strong> {selectedSession.qc_agents?.name}</p>
              <p><strong>Overall Score:</strong> {selectedSession.overall_score}%</p>
            </div>
            <button onClick={() => setShowSessionDetail(false)}>✕</button>
          </div>

          {/* Binary Questions */}
          <div className="session-section">
            <h3>Binary Questions</h3>
            {selectedSession.binary_scores && selectedSession.binary_scores.length > 0 && (
              <div>
                {binaryQuestions.map((question) => {
                  const score = selectedSession.binary_scores[0][question.key];
                  return (
                    <div key={question.key} className="question-result">
                      <div><strong>{question.text}</strong></div>
                      <span className={`score-badge ${score === true ? 'yes' : score === false ? 'no' : 'na'}`}>
                        {score === true ? 'Yes' : score === false ? 'No' : 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Category Ratings */}
          <div className="session-section">
            <h3>Category Ratings</h3>
            {selectedSession.category_scores && selectedSession.category_scores.length > 0 && (
              <div>
                {ratedQuestions.map((question) => {
                  const score = selectedSession.category_scores[0][question.key];
                  const comment = selectedSession.category_scores[0][`${question.key}_comment`];
                  return (
                    <div key={question.key} className="category-result">
                      <div className="category-header">
                        <strong>{question.category}</strong>
                        <span className={`score-badge rating-${score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low'}`}>
                          {score || 'N/A'}/5
                        </span>
                      </div>
                      <p className="question-text">{question.text}</p>
                      {comment && (
                        <div className="comment-box">
                          <strong>QC Comment:</strong>
                          <p>{comment}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Closing Questions */}
          <div className="session-section">
            <h3>Closing Questions</h3>
            {selectedSession.category_scores && selectedSession.category_scores.length > 0 && (
              <div>
                {closingQuestions.map((question) => {
                  const score = selectedSession.category_scores[0][question.key];
                  const comment = selectedSession.category_scores[0][`${question.key}_comment`];
                  return (
                    <div key={question.key} className="category-result">
                      <div className="category-header">
                        <strong>{question.text} ({Math.round(question.weight * 100)}% weight)</strong>
                        <span className={`score-badge rating-${score >= 4 ? 'high' : score >= 3 ? 'medium' : 'low'}`}>
                          {score || 'N/A'}/5
                        </span>
                      </div>
                      {comment && (
                        <div className="comment-box">
                          <strong>QC Comment:</strong>
                          <p>{comment}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Final Comment */}
          {selectedSession.final_comment && (
            <div className="session-section">
              <h3>Final Comment</h3>
              <div className="comment-box">
                {selectedSession.final_comment}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button onClick={() => setShowSessionDetail(false)}>Close (ESC)</button>
          </div>
        </div>
      </div>
    );
  };

  // LAST RESORT - Simple textareas with debounced updates
  const EditModal = () => {
    if (!showEditModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content edit-modal">
          <h2>Edit QC Session</h2>
          
          <div className="edit-form">
            {/* Call Details */}
            <h3>Call Details</h3>
            <input
              type="text"
              placeholder="Property Address"
              value={editFormData.property_address || ''}
              onChange={(e) => handleFormChange('property_address', e.target.value)}
              className="form-input"
            />
            
            <select
              value={editFormData.lead_status || 'Active'}
              onChange={(e) => handleFormChange('lead_status', e.target.value)}
              className="form-select"
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Dead">Dead</option>
            </select>

            {/* Binary Questions */}
            <h3>Binary Questions</h3>
            {binaryQuestions.map((question) => (
              <div key={question.key} className="binary-question-edit">
                <label>{question.text}</label>
                <div className="binary-options">
                  <button
                    type="button"
                    className={editFormData[question.key] === true ? 'active yes' : 'yes'}
                    onClick={() => handleFormChange(question.key, true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={editFormData[question.key] === false ? 'active no' : 'no'}
                    onClick={() => handleFormChange(question.key, false)}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className={editFormData[question.key] === null ? 'active na' : 'na'}
                    onClick={() => handleFormChange(question.key, null)}
                  >
                    N/A
                  </button>
                </div>
              </div>
            ))}

            {/* Category Ratings - BACK TO SIMPLE */}
            <h3>Category Ratings (1-5)</h3>
            {ratedQuestions.map((question) => (
              <div key={question.key} className="rating-category-edit">
                <label>{question.category}</label>
                <div className="rating-buttons">
                  {[1,2,3,4,5].map(score => (
                    <button
                      key={score}
                      type="button"
                      className={editFormData[question.key] === score ? 'active' : ''}
                      onClick={() => handleFormChange(question.key, score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Comments..."
                  value={editFormData[`${question.key}_comment`] || ''}
                  onChange={(e) => handleFormChange(`${question.key}_comment`, e.target.value)}
                  className="form-input"
                  style={{marginTop: '8px'}}
                />
              </div>
            ))}

            {/* Closing Questions - BACK TO SIMPLE */}
            <h3>Closing Questions</h3>
            {closingQuestions.map((question) => (
              <div key={question.key} className="rating-category-edit">
                <label>{question.text}</label>
                <div className="rating-buttons">
                  {[1,2,3,4,5].map(score => (
                    <button
                      key={score}
                      type="button"
                      className={editFormData[question.key] === score ? 'active' : ''}
                      onClick={() => handleFormChange(question.key, score)}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Comments..."
                  value={editFormData[`${question.key}_comment`] || ''}
                  onChange={(e) => handleFormChange(`${question.key}_comment`, e.target.value)}
                  className="form-input"
                  style={{marginTop: '8px'}}
                />
              </div>
            ))}

            {/* Final Comment - BACK TO SIMPLE */}
            <h3>Final Comment</h3>
            <input
              type="text"
              placeholder="Overall comments..."
              value={editFormData.final_comment || ''}
              onChange={(e) => handleFormChange('final_comment', e.target.value)}
              className="form-input"
            />
          </div>

          <div className="modal-actions">
            <button onClick={() => setShowEditModal(false)}>Cancel (ESC)</button>
            <button onClick={handleSaveEdit} className="primary">Save Changes</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="header-content">
          <button 
            onClick={() => setCurrentView('reporting')}
            className="back-button"
          >
            <ArrowLeft className="back-icon" />
          </button>
          <Home className="header-icon" />
          <div>
            <h1 className="header-title">
              QC SESSIONS | {selectedAgent.name} - {selectedAgent.overallScore}% Overall
            </h1>
            <div className="lead-breakdown">
              <span className="breakdown-item">📊 Lead Breakdown:</span>
              <span className="breakdown-status active">🟢 Active {activeCalls}</span>
              <span className="breakdown-status pending">🟡 Pending {pendingCalls}</span>
              <span className="breakdown-status dead">🔴 Dead {deadCalls}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="qc-section">
          <h2 className="qc-title">📞 Session Details</h2>
          <div className="qc-calls-grid">
            {agentSessions.map((session) => (
              <div 
                key={session.id} 
                className={`qc-call-card ${session.lead_status?.toLowerCase() || 'active'}`}
                onClick={() => handleSessionClick(session.id)}
              >
                <div className="qc-call-header">
                  <div className="session-title">
                    {session.property_address} - {session.overall_score}%
                  </div>
                  <div className="session-meta">
                    {session.qc_agents?.name} - {session.call_date} | {selectedAgent.name} - {session.overall_score}% Overall
                  </div>
                  <div className="click-hint">
                    Click here to view more info
                  </div>
                </div>
                
                <div className="qc-call-time">
                  🕒 {session.call_date} {session.call_time} ({session.lead_status} Lead)
                </div>
                
                <div className="session-actions">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSession(session.id);
                    }}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {Object.entries(selectedAgent.scores).map(([category, score]) => (
          <div key={category} className="category-section">
            <div className="category-header">
              <span className="category-icon">
                {category === 'Bonding & Rapport' && '🤝'}
                {category === 'Magic Problem' && '🔍'}
                {category === 'Second Ask' && '❓'}
                {category === 'Objection Handling' && '⚡'}
                {category === 'Closing' && '🎯'}
              </span>
              <h3 className="category-title">{category} ({score}%)</h3>
            </div>
            
            <div className="coaching-insight">
              <span className="insight-icon">💡</span>
              <span className="insight-text">
                <strong>QC Comment Summaries:</strong> 
                {generateQCCommentSummary(category, selectedAgent.id)}
              </span>
            </div>
          </div>
        ))}

        <div className="claude-section">
          <div className="claude-header">
            <div className="claude-avatar">C</div>
            <h3 className="claude-title">Claude's Clever Comment</h3>
          </div>
          
          <div className="claude-comment">
            <p className="claude-text">
              "{selectedAgent.name}'s showing real promise with some standout strengths! 
              {Object.entries(selectedAgent.scores).filter(([_, score]) => score >= 90).length > 0 && 
                ` Absolutely crushing it in ${Object.entries(selectedAgent.scores)
                  .filter(([_, score]) => score >= 90)
                  .map(([category]) => category)
                  .join(' and ')} with ${Math.max(...Object.values(selectedAgent.scores))}% - that's elite territory!`
              }
              {selectedAgent.overallScore >= 80 ? 
                ` With an ${selectedAgent.overallScore}% overall, they're consistently delivering quality calls. ` :
                selectedAgent.overallScore >= 70 ?
                ` At ${selectedAgent.overallScore}% overall, they're building solid momentum. ` :
                ` At ${selectedAgent.overallScore}% overall, there's clear growth opportunity. `
              }
              The data shows focusing on 
              {Object.entries(selectedAgent.scores)
                .filter(([_, score]) => score < 70)
                .map(([category]) => category)
                .slice(0, 2)
                .join(' and ') || 'maintaining current performance'} 
              could unlock their next level!"
            </p>
          </div>
        </div>

        {showSessionDetail && <SessionDetailModal />}
        {showEditModal && <EditModal />}
      </div>
    </div>
  );
};
  /* ========== QC SCORING COMPONENT SECTION ========== */
  const QCScoringView = () => {
    const [selectedQCAgent, setSelectedQCAgent] = useState(null);
    const [selectedAgentToScore, setSelectedAgentToScore] = useState(null);
    const [formData, setFormData] = useState({
      intro: null,
      first_ask: null,
      property_condition: null,
      bonding_rapport: 3,
      bonding_rapport_comment: '',
      bonding_rapport_skills: [],
      magic_problem: 3,
      magic_problem_comment: '',
      magic_problem_skills: [],
      second_ask: 3,
      second_ask_comment: '',
      second_ask_skills: [],
      objection_handling: 3,
      objection_handling_comment: '',
      objection_handling_skills: [],
      selected_objections: [],
      new_objection: '',
      closing_offer_presentation: 3,
      closing_offer_comment: '',
      closing_motivation: 3,
      closing_motivation_comment: '',
      closing_objections: 3,
      closing_objections_comment: '',
      closing_skills: [],
      property_address: '',
      lead_status: 'Active',
      call_date: new Date().toISOString().split('T')[0],
      call_time: '',
      final_comment: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showTrainingRedirect, setShowTrainingRedirect] = useState(false);
    const [trainingData, setTrainingData] = useState(null);

    const analyzeForTraining = (categoryScores) => {
      const trainingCandidates = [];
      
      Object.entries(categoryScores).forEach(([category, data]) => {
        if (data.score >= 4) {
          const comment = data.comment || '';
          const positiveWords = ['great', 'excellent', 'amazing', 'outstanding', 'superb', 'fantastic', 'good', 'well', 'strong', 'solid', 'confident'];
          const hasPositiveLanguage = comment.length > 0 && positiveWords.some(word => 
            comment.toLowerCase().includes(word)
          );
          
          console.log(`Category: ${category}, Score: ${data.score}, Comment: "${comment}", HasPositive: ${hasPositiveLanguage}`);
          
          if (hasPositiveLanguage || data.score === 5) {
            trainingCandidates.push({
              category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              score: data.score,
              comment: comment
            });
          }
        }
      });

      console.log('Training candidates found:', trainingCandidates);
      return trainingCandidates;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!selectedQCAgent || !selectedAgentToScore) {
        alert('Please select both QC agent and agent to score');
        return;
      }

      setSubmitting(true);

      try {
        const binaryScores = {
          intro: formData.intro,
          first_ask: formData.first_ask,
          property_condition: formData.property_condition
        };

        const categoryScores = {
          bonding_rapport: formData.bonding_rapport,
          magic_problem: formData.magic_problem,
          second_ask: formData.second_ask,
          objection_handling: formData.objection_handling,
          closing_offer_presentation: formData.closing_offer_presentation,
          closing_motivation: formData.closing_motivation,
          closing_objections: formData.closing_objections
        };

        const overallScore = calculateOverallScore(binaryScores, categoryScores);

        const { data: sessionData, error: sessionError } = await supabase
          .from('qc_sessions')
          .insert([
            {
              agent_id: selectedAgentToScore,
              qc_agent_id: selectedQCAgent,
              session_date: new Date().toISOString().split('T')[0],
              call_date: formData.call_date,
              overall_score: overallScore,
              property_address: formData.property_address,
              lead_status: formData.lead_status,
              call_time: formData.call_time,
              final_comment: formData.final_comment
            }
          ])
          .select()
          .single();

        if (sessionError) throw sessionError;

        const { error: binaryError } = await supabase
          .from('binary_scores')
          .insert([
            {
              session_id: sessionData.id,
              intro: formData.intro,
              first_ask: formData.first_ask,
              property_condition: formData.property_condition
            }
          ]);

        if (binaryError) throw binaryError;

        const { error: categoryError } = await supabase
          .from('category_scores')
          .insert([
            {
              session_id: sessionData.id,
              bonding_rapport: formData.bonding_rapport,
              bonding_rapport_comment: formData.bonding_rapport_comment,
              bonding_rapport_skills: JSON.stringify(formData.bonding_rapport_skills),
              magic_problem: formData.magic_problem,
              magic_problem_comment: formData.magic_problem_comment,
              magic_problem_skills: JSON.stringify(formData.magic_problem_skills),
              second_ask: formData.second_ask,
              second_ask_comment: formData.second_ask_comment,
              second_ask_skills: JSON.stringify(formData.second_ask_skills),
              objection_handling: formData.objection_handling,
              objection_handling_comment: formData.objection_handling_comment,
              objection_handling_skills: JSON.stringify(formData.objection_handling_skills),
              closing_offer_presentation: formData.closing_offer_presentation,
              closing_offer_comment: formData.closing_offer_comment,
              closing_motivation: formData.closing_motivation,
              closing_motivation_comment: formData.closing_motivation_comment,
              closing_objections: formData.closing_objections,
              closing_objections_comment: formData.closing_objections_comment,
              closing_skills: JSON.stringify(formData.closing_skills)
            }
          ]);

        if (categoryError) throw categoryError;

        if (formData.selected_objections.length > 0) {
          for (const objectionId of formData.selected_objections) {
            await supabase
              .from('objections_library')
              .update({ usage_count: supabase.raw('usage_count + 1') })
              .eq('id', objectionId);
          }
        }

        if (formData.new_objection.trim()) {
          await supabase
            .from('objections_library')
            .insert([
              {
                objection_text: formData.new_objection.trim(),
                category: 'custom',
                usage_count: 1
              }
            ]);
        }

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        const categoryData = {
          bonding_rapport: { score: formData.bonding_rapport, comment: formData.bonding_rapport_comment },
          magic_problem: { score: formData.magic_problem, comment: formData.magic_problem_comment },
          second_ask: { score: formData.second_ask, comment: formData.second_ask_comment },
          closing_offer_presentation: { score: formData.closing_offer_presentation, comment: formData.closing_offer_comment },
          closing_motivation: { score: formData.closing_motivation, comment: formData.closing_motivation_comment },
          closing_objections: { score: formData.closing_objections, comment: formData.closing_objections_comment }
        };

        console.log('Analyzing category data:', categoryData);
        const trainingCandidates = analyzeForTraining(categoryData);
        console.log('Training candidates result:', trainingCandidates);

        if (trainingCandidates.length > 0) {
          const selectedAgent = agents.find(agent => agent.id === selectedAgentToScore);
          setTrainingData({
            agentName: selectedAgent?.name || 'Unknown',
            categories: trainingCandidates,
            propertyAddress: formData.property_address,
            callDate: formData.call_date,
            callTime: formData.call_time
          });
          
          setTimeout(() => {
            setShowTrainingRedirect(true);
          }, 1500);
        }

        resetForm();
        await fetchAgentsData();
        
      } catch (error) {
        console.error('Error submitting QC session:', error);
        alert('Error submitting QC session. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    const resetForm = () => {
      setFormData({
        intro: null,
        first_ask: null,
        property_condition: null,
        bonding_rapport: 3,
        bonding_rapport_comment: '',
        bonding_rapport_skills: [],
        magic_problem: 3,
        magic_problem_comment: '',
        magic_problem_skills: [],
        second_ask: 3,
        second_ask_comment: '',
        second_ask_skills: [],
        objection_handling: 3,
        objection_handling_comment: '',
        objection_handling_skills: [],
        selected_objections: [],
        new_objection: '',
        closing_offer_presentation: 3,
        closing_offer_comment: '',
        closing_motivation: 3,
        closing_motivation_comment: '',
        closing_objections: 3,
        closing_objections_comment: '',
        closing_skills: [],
        property_address: '',
        lead_status: 'Active',
        call_date: new Date().toISOString().split('T')[0],
        call_time: '',
        final_comment: ''
      });
      setSelectedQCAgent(null);
      setSelectedAgentToScore(null);
    };

    const addSkill = (category, skill) => {
      const skillsKey = `${category}_skills`;
      setFormData(prev => ({
        ...prev,
        [skillsKey]: [...prev[skillsKey], skill]
      }));
    };

    const removeSkill = (category, skillIndex) => {
      const skillsKey = `${category}_skills`;
      setFormData(prev => ({
        ...prev,
        [skillsKey]: prev[skillsKey].filter((_, index) => index !== skillIndex)
      }));
    };

    const updateSkillUsage = async (skillId) => {
      await supabase
        .from('skills_library')
        .update({ usage_count: supabase.raw('usage_count + 1') })
        .eq('id', skillId);
    };

    const saveNewSkill = async (skillText, category) => {
      await supabase
        .from('skills_library')
        .insert([{
          skill_text: skillText,
          category: category,
          usage_count: 1
        }]);
      await fetchSkillsLibrary();
    };

    const removeSkillByText = (category, skillText) => {
      const skillsKey = `${category}_skills`;
      setFormData(prev => ({
        ...prev,
        [skillsKey]: prev[skillsKey].filter(skill => skill !== skillText)
      }));
    };

    const handleNAToggle = (field) => {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field] === null ? 3 : null
      }));
    };

    const TrainingRedirectModal = () => (
      <div className="training-modal-overlay">
        <div className="training-modal">
          <div className="training-header">
            <h2>Training Library - Add Timestamps</h2>
            <p>High-scoring performance detected! Add timestamps for training examples.</p>
          </div>
          
          <div className="training-content">
            <div className="training-agent-info">
              <h3>{trainingData.agentName}</h3>
              <p>Property: {trainingData.propertyAddress}</p>
              <p>Call Date: {trainingData.callDate} {trainingData.callTime}</p>
            </div>

            {trainingData.categories.map((category, index) => (
              <div key={index} className="training-category">
                <h4>{category.category} - Score: {category.score}/5</h4>
                <p className="training-comment">{category.comment}</p>
                <div className="timestamp-input">
                  <label>Timestamp (e.g., 2:30):</label>
                  <input type="text" placeholder="mm:ss" />
                </div>
              </div>
            ))}
          </div>

          <div className="training-actions">
            <button 
              onClick={() => setShowTrainingRedirect(false)}
              className="btn-secondary"
            >
              Skip for Now
            </button>
            <button 
              onClick={async () => {
                try {
                  for (let index = 0; index < trainingData.categories.length; index++) {
                    const category = trainingData.categories[index];
                    const timestampInput = document.querySelectorAll('.timestamp-input input')[index];
                    
                    await supabase.from('training_examples').insert([{
                      agent_id: selectedAgentToScore,
                      category: category.category,
                      score: category.score,
                      qc_comment: category.comment,
                      property_address: trainingData.propertyAddress,
                      call_date: trainingData.callDate,
                      call_time: trainingData.callTime,
                      timestamp_start: timestampInput?.value || ''
                    }]);
                  }
                  
                  setShowTrainingRedirect(false);
                  alert('Training examples saved to library!');
                } catch (error) {
                  console.error('Error saving training examples:', error);
                  alert('Error saving training examples');
                }
              }}
              className="btn-primary"
            >
              Save Training Examples
            </button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="app-container">
        <div className="app-header">
          <div className="header-content">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="back-button"
            >
              <ArrowLeft className="back-icon" />
            </button>
            <Home className="header-icon" />
            <div>
              <h1 className="header-title">QC Scoring Interface</h1><p className="header-subtitle">Submit performance evaluations</p>
            </div>
          </div>
        </div>

        {/* Success Message Overlay */}
        {showSuccess && (
          <div className="success-overlay">
            <div className="success-message">
              QC EVALUATION SUBMITTED SUCCESSFULLY!
            </div>
          </div>
        )}

        {/* Training Library Redirect Modal */}
        {showTrainingRedirect && trainingData && <TrainingRedirectModal />}

        <div className="main-content">
          <form onSubmit={handleSubmit} className="qc-form">
            
            {/* QC Agent Selection */}
            <div className="form-section">
              <h3 className="section-title">QC Agent</h3>
              <div className="qc-agent-selection">
                {qcAgents.map(qcAgent => (
                  <button
                    key={qcAgent.id}
                    type="button"
                    className={`qc-agent-btn ${selectedQCAgent === qcAgent.id ? 'active' : ''}`}
                    onClick={() => setSelectedQCAgent(qcAgent.id)}
                  >
                    {qcAgent.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent to Score Selection */}
            <div className="form-section">
              <h3 className="section-title">Agent to Score</h3>
              <select 
                value={selectedAgentToScore || ''}
                onChange={(e) => setSelectedAgentToScore(e.target.value)}
                className="agent-select"
                required
              >
                <option value="">Select Agent</option>
                {agents
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Call Details */}
            <div className="form-section">
              <h3 className="section-title">Call Details</h3>
              <div className="call-details-simple">
                <input
                  type="text"
                  placeholder="Property Address"
                  value={formData.property_address}
                  onChange={(e) => setFormData({...formData, property_address: e.target.value})}
                  className="form-input"
                  required
                />
                
                <select
                  value={formData.lead_status}
                  onChange={(e) => setFormData({...formData, lead_status: e.target.value})}
                  className="form-select"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Dead">Dead</option>
                </select>

                <input
                  type="date"
                  value={formData.call_date}
                  onChange={(e) => setFormData({...formData, call_date: e.target.value})}
                  className="form-input"
                  required
                />

                <div className="time-selector">
                  <select 
                    value={formData.call_time.split(':')[0] ? 
                      (parseInt(formData.call_time.split(':')[0]) === 0 ? '12' : 
                       parseInt(formData.call_time.split(':')[0]) > 12 ? 
                       (parseInt(formData.call_time.split(':')[0]) - 12).toString() : 
                       formData.call_time.split(':')[0]) : ''}
                    onChange={(e) => {
                      const minutes = formData.call_time.split(':')[1] || '00';
                      const currentHour = parseInt(formData.call_time.split(':')[0]) || 0;
                      const isAM = currentHour < 12;
                      let hour24 = parseInt(e.target.value);
                      if (!isAM && hour24 !== 12) hour24 += 12;
                      if (isAM && hour24 === 12) hour24 = 0;
                      setFormData({...formData, call_time: `${hour24.toString().padStart(2, '0')}:${minutes}`});
                    }}
                    className="form-select"
                  >
                    <option value="">Hour</option>
                    {Array.from({length: 12}, (_, i) => (
                      <option key={i+1} value={i+1}>{i+1}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={formData.call_time.split(':')[1] || ''}
                    onChange={(e) => {
                      const hours = formData.call_time.split(':')[0] || '00';
                      setFormData({...formData, call_time: `${hours}:${e.target.value}`});
                    }}
                    className="form-select"
                  >
                    <option value="">Min</option>
                    {Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0')).map(min => (
                      <option key={min} value={min}>{min}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={formData.call_time.split(':')[0] ? 
                      (parseInt(formData.call_time.split(':')[0]) < 12 ? 'AM' : 'PM') : ''}
                    onChange={(e) => {
                      const currentHour = parseInt(formData.call_time.split(':')[0]) || 0;
                      const minutes = formData.call_time.split(':')[1] || '00';
                      let newHour = currentHour;
                      if (e.target.value === 'PM' && currentHour < 12) newHour += 12;
                      if (e.target.value === 'AM' && currentHour >= 12) newHour -= 12;
                      setFormData({...formData, call_time: `${newHour.toString().padStart(2, '0')}:${minutes}`});
                    }}
                    className="form-select"
                  >
                    <option value="">AM/PM</option>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Binary Questions */}
            <div className="form-section">
              <h3 className="section-title">Binary Questions (Yes/No/N/A)</h3>
              
              {binaryQuestions.map((question) => (
                <div key={question.key} className="binary-question">
                  <label>{question.text}</label>
                  <div className="binary-options">
                    <button
                      type="button"
                      className={`binary-btn ${formData[question.key] === true ? 'yes active' : 'yes'}`}
                      onClick={() => setFormData({...formData, [question.key]: true})}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`binary-btn ${formData[question.key] === false ? 'no active' : 'no'}`}
                      onClick={() => setFormData({...formData, [question.key]: false})}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      className={`binary-btn ${formData[question.key] === null ? 'na active' : 'na'}`}
                      onClick={() => handleNAToggle(question.key)}
                    >
                      N/A
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Ratings */}
            <div className="form-section">
              <h3 className="section-title">Performance Ratings (1-5) with Comments & Skills</h3>
              
              {ratedQuestions.map((question) => (
                <div key={question.key} className="rating-category-full">
                  <div className="category-header-form">
                    <h4>{question.category}</h4>
                    <label>{question.text}</label>
                  </div>
                  
                  <div className="rating-section">
                    <div className="rating-buttons">
                      {[1,2,3,4,5].map(score => (
                        <button
                          key={score}
                          type="button"
                          className={`rating-btn ${formData[question.key] === score ? 'active' : ''}`}
                          onClick={() => setFormData({...formData, [question.key]: score})}
                          disabled={formData[question.key] === null}
                        >
                          {score}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`rating-btn na-btn ${formData[question.key] === null ? 'active' : ''}`}
                        onClick={() => handleNAToggle(question.key)}
                      >
                        N/A
                      </button>
                    </div>
                  </div>

                  <div className="comments-section">
                    <label>Comments (Narrative):</label>
                    <textarea
                      value={formData[`${question.key}_comment`]}
                      onChange={(e) => setFormData({...formData, [`${question.key}_comment`]: e.target.value})}
                      className="form-textarea"
                      rows={3}
                      placeholder="Describe how the rep performed in this category..."
                    />
                  </div>

                  <div className="skills-section">
                    <label>Skills & Techniques Used:</label>
                    
                    <div className="skills-library">
                      <h5>Quick Select (Common Skills):</h5>
                      <div className="skills-checkboxes">
                        {skillsLibrary.filter(skill => skill.category === question.key || skill.category === 'general').map(skill => (
                          <label key={skill.id} className="skill-checkbox">
                            <input
                              type="checkbox"
                              checked={formData[`${question.key}_skills`].includes(skill.skill_text)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  addSkill(question.key, skill.skill_text);
                                  updateSkillUsage(skill.id);
                                } else {
                                  removeSkillByText(question.key, skill.skill_text);
                                }
                              }}
                            />
                            {skill.skill_text}
                            <span className="usage-count">({skill.usage_count})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="skills-input-group">
                      <input
                        type="text"
                        placeholder="Add new skill or technique..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (e.target.value.trim()) {
                              addSkill(question.key, e.target.value.trim());
                              saveNewSkill(e.target.value.trim(), question.key);
                              e.target.value = '';
                            }
                          }
                        }}
                        className="skills-input"
                      />
                    </div>
                        
                    <div className="skills-tags">
                      {formData[`${question.key}_skills`].map((skill, index) => (
                        <span key={index} className="skill-tag">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(question.key, index)}
                            className="remove-skill"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Closing Questions */}
            <div className="form-section">
              <h3 className="section-title">The Close (3 Weighted Questions)</h3>
              
              {closingQuestions.map((question) => (
                <div key={question.key} className="rating-category-full">
                  <div className="category-header-form">
                    <h4>{question.text} ({Math.round(question.weight * 100)}% weight)</h4>
                  </div>
                  
                  <div className="rating-section">
                    <div className="rating-buttons">
                      {[1,2,3,4,5].map(score => (
                        <button
                          key={score}
                          type="button"
                          className={`rating-btn ${formData[question.key] === score ? 'active' : ''}`}
                          onClick={() => setFormData({...formData, [question.key]: score})}
                          disabled={formData[question.key] === null}
                        >
                          {score}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`rating-btn na-btn ${formData[question.key] === null ? 'active' : ''}`}
                        onClick={() => handleNAToggle(question.key)}
                      >
                        N/A
                      </button>
                    </div>
                  </div>

                  <div className="comments-section">
                    <label>Comments:</label>
                    <textarea
                      value={formData[`${question.key}_comment`]}
                      onChange={(e) => setFormData({...formData, [`${question.key}_comment`]: e.target.value})}
                      className="form-textarea"
                      rows={2}
                      placeholder="Describe the performance..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Objection Library */}
            <div className="form-section">
              <h3 className="section-title">Objection Library (for Objection Handling category)</h3>
              
              <div className="objections-grid">
                <div className="common-objections">
                  <h4>Common Objections (Select all that apply):</h4>
                  <div className="objection-checkboxes">
                    {objectionLibrary.map(objection => (
                      <label key={objection.id} className="objection-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.selected_objections.includes(objection.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                selected_objections: [...prev.selected_objections, objection.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                selected_objections: prev.selected_objections.filter(id => id !== objection.id)
                              }));
                            }
                          }}
                        />
                        {objection.objection_text}
                        <span className="usage-count">({objection.usage_count} uses)</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="new-objection">
                  <h4>Add New Objection:</h4>
                  <input
                    type="text"
                    value={formData.new_objection}
                    onChange={(e) => setFormData({...formData, new_objection: e.target.value})}
                    className="form-input"
                    placeholder="Enter new objection encountered..."
                  />
                </div>
              </div>
            </div>

            {/* Final Comment */}
            <div className="form-section">
              <h3 className="section-title">Final Comment</h3>
              <textarea
                value={formData.final_comment}
                onChange={(e) => setFormData({...formData, final_comment: e.target.value})}
                className="form-textarea"
                rows={4}
                placeholder="Enter overall comments about the call performance..."
              />
            </div>

            <button 
              type="submit" 
              className="submit-btn"
              disabled={submitting || !selectedQCAgent || !selectedAgentToScore}
            >
              {submitting ? 'Submitting...' : 'Submit QC Evaluation'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  /* ========== MAIN RENDER SECTION ========== */
  return (
    <div>
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'reporting' && selectedAgent && <ReportingView />}
      {currentView === 'deepdive' && selectedAgent && <DeepDiveView />}
      {currentView === 'qc-scoring' && <QCScoringView />}
    </div>
  );
};

export default App;