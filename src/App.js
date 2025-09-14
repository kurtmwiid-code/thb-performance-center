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
  const binaryCount = Object.values(binaryScores).filter(score => score !== null).length;
  const binaryYesCount = Object.values(binaryScores).filter(score => score === true).length;
  const binaryPercentage = binaryCount > 0 ? (binaryYesCount / binaryCount) * 100 : 100;
  const binaryWeighted = binaryPercentage * 0.3;

  // Category section (70% weight)
  const categoryValues = [];
  
  // Add individual category scores
  if (categoryScores.bonding_rapport) categoryValues.push(categoryScores.bonding_rapport);
  if (categoryScores.magic_problem) categoryValues.push(categoryScores.magic_problem);
  if (categoryScores.second_ask) categoryValues.push(categoryScores.second_ask);
  if (categoryScores.objection_handling) categoryValues.push(categoryScores.objection_handling);
  
  // Calculate weighted closing score
  if (categoryScores.closing_offer_presentation || categoryScores.closing_motivation || categoryScores.closing_objections) {
    const closingScore = 
      (categoryScores.closing_offer_presentation || 0) * 0.4 +
      (categoryScores.closing_motivation || 0) * 0.4 +
      (categoryScores.closing_objections || 0) * 0.2;
    categoryValues.push(closingScore);
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
              'Objection Handling': 0,
              'Closing': 0
            },
            trend: 'down',
            lastEvaluation: 'No data'
          };
        }

        const totalSessions = agentSessions.length;
        let totalBonding = 0, totalMagic = 0, totalSecond = 0, totalObj = 0;
        let totalClosing = 0;

        agentSessions.forEach(session => {
          if (session.category_scores && session.category_scores.length > 0) {
            const scores = session.category_scores[0];
            totalBonding += scores.bonding_rapport || 0;
            totalMagic += scores.magic_problem || 0;
            totalSecond += scores.second_ask || 0;
            totalObj += scores.objection_handling || 0;
            
            const offerScore = scores.closing_offer_presentation || 0;
            const motivationScore = scores.closing_motivation || 0;
            const objectionScore = scores.closing_objections || 0;
            const closingAvg = (offerScore * 0.4 + motivationScore * 0.4 + objectionScore * 0.2);
            totalClosing += closingAvg;
          }
        });

        const avgBonding = ((totalBonding / totalSessions) / 5 * 100);
        const avgMagic = ((totalMagic / totalSessions) / 5 * 100);
        const avgSecond = ((totalSecond / totalSessions) / 5 * 100);
        const avgObj = ((totalObj / totalSessions) / 5 * 100);
        const avgClosing = ((totalClosing / totalSessions) / 5 * 100);

        const overallScore = (avgBonding + avgMagic + avgSecond + avgObj + avgClosing) / 5;
        
        return {
          id: agent.id,
          name: agent.name,
          overallScore: Math.round(overallScore * 10) / 10,
          status: overallScore >= 70 ? 'green' : overallScore >= 50 ? 'yellow' : 'red',
          scores: {
            'Bonding & Rapport': Math.round(avgBonding),
            'Magic Problem': Math.round(avgMagic),
            'Second Ask': Math.round(avgSecond),
            'Objection Handling': Math.round(avgObj),
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
    teamStrength: { category: 'Bonding & Rapport', score: 87.3 }
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

  const extractKeywordTags = (comments, category) => {
    if (!comments || comments.length === 0) return [];
    
    const allText = comments.join(' ').toLowerCase();
    
    const keywordPatterns = {
      positive: ['excellent', 'great', 'strong', 'good', 'well', 'solid', 'confident'],
      negative: ['needs', 'weak', 'poor', 'lacking', 'struggled', 'missed', 'unclear'],
      neutral: ['average', 'okay', 'standard', 'typical', 'normal']
    };
    
    const tags = [];
    
    Object.entries(keywordPatterns).forEach(([sentiment, words]) => {
      words.forEach(word => {
        if (allText.includes(word)) {
          tags.push({ text: word, sentiment });
        }
      });
    });
    
    return tags;
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
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionDetail, setShowSessionDetail] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});

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

      // Populate edit form with existing data
      const editData = {
        property_address: data.property_address || '',
        lead_status: data.lead_status || 'Active',
        call_date: data.call_date || '',
        call_time: data.call_time || '',
        final_comment: data.final_comment || '',
      };

      // Add binary scores
      if (data.binary_scores && data.binary_scores.length > 0) {
        const binaryData = data.binary_scores[0];
        editData.intro = binaryData.intro;
        editData.first_ask = binaryData.first_ask;
        editData.property_condition = binaryData.property_condition;
      }

      // Add category scores
      if (data.category_scores && data.category_scores.length > 0) {
        const categoryData = data.category_scores[0];
        editData.bonding_rapport = categoryData.bonding_rapport;
        editData.bonding_rapport_comment = categoryData.bonding_rapport_comment || '';
        editData.magic_problem = categoryData.magic_problem;
        editData.magic_problem_comment = categoryData.magic_problem_comment || '';
        editData.second_ask = categoryData.second_ask;
        editData.second_ask_comment = categoryData.second_ask_comment || '';
        editData.objection_handling = categoryData.objection_handling;
        editData.objection_handling_comment = categoryData.objection_handling_comment || '';
        editData.closing_offer_presentation = categoryData.closing_offer_presentation;
        editData.closing_offer_comment = categoryData.closing_offer_comment || '';
        editData.closing_motivation = categoryData.closing_motivation;
        editData.closing_motivation_comment = categoryData.closing_motivation_comment || '';
        editData.closing_objections = categoryData.closing_objections;
        editData.closing_objections_comment = categoryData.closing_objections_comment || '';
      }

      setEditFormData(editData);
      setEditingSession(sessionId);
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
      await fetchAgentsData(); // Refresh data
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

  const agentSessions = sessions.filter(session => session.agent_id === selectedAgent.id);
  const activeCalls = agentSessions.filter(session => session.lead_status === 'Active').length;
  const pendingCalls = agentSessions.filter(session => session.lead_status === 'Pending').length;
  const deadCalls = agentSessions.filter(session => session.lead_status === 'Dead').length;

  // Session Detail Modal
const SessionDetailModal = () => {
  // Add ESC key listener
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setShowSessionDetail(false);
      }
    };

    if (showSessionDetail) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showSessionDetail]);

  return showSessionDetail && selectedSession && (
    <div 
      className="modal-overlay" 
      onClick={() => setShowSessionDetail(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '900px',
          maxHeight: '85vh',
          overflow: 'auto',
          width: '95%',
          border: '1px solid #333'
        }}
      >
        <div className="session-detail-header" style={{ 
          borderBottom: '2px solid #333', 
          paddingBottom: '1rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <h2 style={{ color: '#ffffff', margin: '0 0 1rem 0' }}>Session Details - {selectedAgent.name}</h2>
            <p style={{ color: '#cccccc', margin: '0.25rem 0' }}><strong>Property:</strong> {selectedSession.property_address}</p>
            <p style={{ color: '#cccccc', margin: '0.25rem 0' }}><strong>Date:</strong> {selectedSession.call_date} {selectedSession.call_time}</p>
            <p style={{ color: '#cccccc', margin: '0.25rem 0' }}><strong>Lead Status:</strong> {selectedSession.lead_status}</p>
            <p style={{ color: '#cccccc', margin: '0.25rem 0' }}><strong>QC Agent:</strong> {selectedSession.qc_agents?.name}</p>
            <p style={{ color: '#cccccc', margin: '0.25rem 0' }}><strong>Overall Score:</strong> {selectedSession.overall_score}%</p>
          </div>
          <button 
            onClick={() => setShowSessionDetail(false)}
            style={{ 
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Binary Questions */}
        <div className="session-section" style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#ffffff', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Binary Questions</h3>
          {selectedSession.binary_scores && selectedSession.binary_scores.length > 0 && (
            <div>
              {binaryQuestions.map((question) => {
                const score = selectedSession.binary_scores[0][question.key];
                return (
                  <div key={question.key} style={{ 
                    margin: '1rem 0', 
                    padding: '1rem', 
                    backgroundColor: '#2a2a2a', 
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <div style={{ color: '#ffffff', marginBottom: '0.5rem' }}><strong>{question.text}</strong></div>
                    <span style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      backgroundColor: score === true ? '#22c55e' : score === false ? '#ef4444' : '#f59e0b',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {score === true ? 'Yes' : score === false ? 'No' : 'N/A'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Ratings */}
        <div className="session-section" style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#ffffff', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Category Ratings</h3>
          {selectedSession.category_scores && selectedSession.category_scores.length > 0 && (
            <div>
              {ratedQuestions.map((question) => {
                const score = selectedSession.category_scores[0][question.key];
                const comment = selectedSession.category_scores[0][`${question.key}_comment`];
                return (
                  <div key={question.key} style={{ 
                    margin: '1rem 0', 
                    padding: '1rem', 
                    backgroundColor: '#2a2a2a', 
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#ffffff' }}>{question.category}</strong>
                      <span style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        backgroundColor: score >= 4 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#ef4444',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>
                        {score || 'N/A'}/5
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#cccccc', margin: '0.5rem 0', fontStyle: 'italic' }}>
                      {question.text}
                    </p>
                    {comment && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem', 
                        backgroundColor: '#1a1a1a', 
                        borderRadius: '6px',
                        border: '1px solid #444'
                      }}>
                        <strong style={{ color: '#ffffff' }}>QC Comment:</strong>
                        <p style={{ color: '#cccccc', margin: '0.5rem 0 0 0' }}>{comment}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Closing Questions */}
        <div className="session-section" style={{ marginBottom: '2rem' }}>
          <h3 style={{ color: '#ffffff', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Closing Questions</h3>
          {selectedSession.category_scores && selectedSession.category_scores.length > 0 && (
            <div>
              {closingQuestions.map((question) => {
                const score = selectedSession.category_scores[0][question.key];
                const comment = selectedSession.category_scores[0][`${question.key}_comment`];
                return (
                  <div key={question.key} style={{ 
                    margin: '1rem 0', 
                    padding: '1rem', 
                    backgroundColor: '#2a2a2a', 
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ color: '#ffffff' }}>
                        {question.text} ({Math.round(question.weight * 100)}% weight)
                      </strong>
                      <span style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        backgroundColor: score >= 4 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#ef4444',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>
                        {score || 'N/A'}/5
                      </span>
                    </div>
                    {comment && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem', 
                        backgroundColor: '#1a1a1a', 
                        borderRadius: '6px',
                        border: '1px solid #444'
                      }}>
                        <strong style={{ color: '#ffffff' }}>QC Comment:</strong>
                        <p style={{ color: '#cccccc', margin: '0.5rem 0 0 0' }}>{comment}</p>
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
            <h3 style={{ color: '#ffffff', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Final Comment</h3>
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#2a2a2a', 
              borderRadius: '8px',
              border: '1px solid #333',
              color: '#cccccc'
            }}>
              {selectedSession.final_comment}
            </div>
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button 
            onClick={() => setShowSessionDetail(false)}
            style={{ 
              padding: '0.75rem 2rem',
              backgroundColor: '#374151',
              color: 'white',
              border: '1px solid #6b7280',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Close (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};

  const EditModal = () => (
    showEditModal && (
      <div className="modal-overlay" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div className="modal-content" style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflow: 'auto',
          width: '90%'
        }}>
          <h2>Edit QC Session</h2>
          
          <div className="edit-form">
            {/* Call Details */}
            <h3>Call Details</h3>
            <input
              type="text"
              placeholder="Property Address"
              value={editFormData.property_address || ''}
              onChange={(e) => setEditFormData({...editFormData, property_address: e.target.value})}
              style={{ width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
            />
            
            <select
              value={editFormData.lead_status || 'Active'}
              onChange={(e) => setEditFormData({...editFormData, lead_status: e.target.value})}
              style={{ width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
            >
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Dead">Dead</option>
            </select>

            {/* Binary Questions */}
            <h3>Binary Questions</h3>
            {binaryQuestions.map((question) => (
              <div key={question.key} style={{ margin: '1rem 0' }}>
                <label>{question.text}</label>
                <div>
                  <button
                    type="button"
                    onClick={() => setEditFormData({...editFormData, [question.key]: true})}
                    style={{
                      backgroundColor: editFormData[question.key] === true ? 'green' : 'gray',
                      color: 'white',
                      margin: '0 0.25rem',
                      padding: '0.25rem 0.5rem'
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({...editFormData, [question.key]: false})}
                    style={{
                      backgroundColor: editFormData[question.key] === false ? 'red' : 'gray',
                      color: 'white',
                      margin: '0 0.25rem',
                      padding: '0.25rem 0.5rem'
                    }}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({...editFormData, [question.key]: null})}
                    style={{
                      backgroundColor: editFormData[question.key] === null ? 'orange' : 'gray',
                      color: 'white',
                      margin: '0 0.25rem',
                      padding: '0.25rem 0.5rem'
                    }}
                  >
                    N/A
                  </button>
                </div>
              </div>
            ))}

            {/* Category Ratings */}
            <h3>Category Ratings (1-5)</h3>
            {ratedQuestions.map((question) => (
              <div key={question.key} style={{ margin: '1rem 0' }}>
                <label>{question.category}</label>
                <div>
                  {[1,2,3,4,5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setEditFormData({...editFormData, [question.key]: score})}
                      style={{
                        backgroundColor: editFormData[question.key] === score ? 'blue' : 'gray',
                        color: 'white',
                        margin: '0 0.25rem',
                        padding: '0.25rem 0.5rem'
                      }}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Comments..."
                  value={editFormData[`${question.key}_comment`] || ''}
                  onChange={(e) => setEditFormData({...editFormData, [`${question.key}_comment`]: e.target.value})}
                  style={{ width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
                  rows="2"
                />
              </div>
            ))}

            {/* Closing Questions */}
            <h3>Closing Questions</h3>
            {closingQuestions.map((question) => (
              <div key={question.key} style={{ margin: '1rem 0' }}>
                <label>{question.text} ({Math.round(question.weight * 100)}% weight)</label>
                <div>
                  {[1,2,3,4,5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setEditFormData({...editFormData, [question.key]: score})}
                      style={{
                        backgroundColor: editFormData[question.key] === score ? 'blue' : 'gray',
                        color: 'white',
                        margin: '0 0.25rem',
                        padding: '0.25rem 0.5rem'
                      }}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Comments..."
                  value={editFormData[`${question.key}_comment`] || ''}
                  onChange={(e) => setEditFormData({...editFormData, [`${question.key}_comment`]: e.target.value})}
                  style={{ width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
                  rows="2"
                />
              </div>
            ))}

            {/* Final Comment */}
            <h3>Final Comment</h3>
            <textarea
              placeholder="Overall comments..."
              value={editFormData.final_comment || ''}
              onChange={(e) => setEditFormData({...editFormData, final_comment: e.target.value})}
              style={{ width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
              rows="3"
            />
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'right' }}>
            <button 
              onClick={() => setShowEditModal(false)}
              style={{ 
                marginRight: '1rem', 
                padding: '0.5rem 1rem',
                backgroundColor: 'gray',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveEdit}
              style={{ 
                padding: '0.5rem 1rem',
                backgroundColor: 'blue',
                color: 'white',
                border: 'none',
                borderRadius: '4px'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    )
  );

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
              {new Date().toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric' 
              }).toUpperCase()} - QC Session | {selectedAgent.name} - {selectedAgent.overallScore}% Overall
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
          <h2 className="qc-title">📞 Call Details</h2>
          <div className="qc-calls-grid">
            {agentSessions.map((session, index) => (
              <div 
                key={session.id} 
                className={`qc-call-card ${session.lead_status?.toLowerCase() || 'active'}`}
                onClick={() => handleSessionClick(session.id)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div className="qc-call-header">
                  <span className="qc-call-title">Session {index + 1} - {session.overall_score}%</span>
                  <div className="session-actions" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSession(session.id);
                      }}
                      className="edit-btn"
                      style={{ 
                        marginRight: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'orange',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      className="delete-btn"
                      style={{ 
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'red',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
                <div className="qc-call-address">📍 {session.property_address}</div>
                <div className="qc-call-time">🕒 {session.call_date} {session.call_time} ({session.lead_status} Lead)</div>
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
      /* ========== BINARY QUESTIONS DATA ========== */
      intro: null,
      first_ask: null,
      property_condition: null,
      /* ========== 1-5 RATED QUESTIONS DATA ========== */
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
      /* ========== CLOSING QUESTIONS DATA ========== */
      closing_offer_presentation: 3,
      closing_offer_comment: '',
      closing_motivation: 3,
      closing_motivation_comment: '',
      closing_objections: 3,
      closing_objections_comment: '',
      closing_skills: [],
      /* ========== SESSION DETAILS DATA ========== */
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

    /* ========== TRAINING LIBRARY AUTO-REDIRECT LOGIC ========== */
    const analyzeForTraining = (categoryScores) => {
      const trainingCandidates = [];
      
      // Check each category for high scores + positive sentiment
      Object.entries(categoryScores).forEach(([category, data]) => {
        if (data.score >= 4) {
          const comment = data.comment || '';
          const positiveWords = ['great', 'excellent', 'amazing', 'outstanding', 'superb', 'fantastic', 'good', 'well', 'strong'];
          const hasPositiveLanguage = positiveWords.some(word => 
            comment.toLowerCase().includes(word)
          );
          
          if (hasPositiveLanguage) {
            trainingCandidates.push({
              category: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
              score: data.score,
              comment: comment
            });
          }
        }
      });

      return trainingCandidates;
    };

    /* ========== FORM SUBMISSION SECTION ========== */
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!selectedQCAgent || !selectedAgentToScore) {
        alert('Please select both QC agent and agent to score');
        return;
      }

      setSubmitting(true);

      try {
        // Prepare binary scores
        const binaryScores = {
          intro: formData.intro,
          first_ask: formData.first_ask,
          property_condition: formData.property_condition
        };

        // Prepare category scores
        const categoryScores = {
          bonding_rapport: formData.bonding_rapport,
          magic_problem: formData.magic_problem,
          second_ask: formData.second_ask,
          objection_handling: formData.objection_handling,
          closing_offer_presentation: formData.closing_offer_presentation,
          closing_motivation: formData.closing_motivation,
          closing_objections: formData.closing_objections
        };

        // Calculate overall score using weighted system
        const overallScore = calculateOverallScore(binaryScores, categoryScores);

        // Create QC session
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

        // Create binary scores
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

        // Create category scores with comments and skills
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

        /* ========== OBJECTION LIBRARY UPDATE SECTION ========== */
        // Update objection usage counts and add new objections
        if (formData.selected_objections.length > 0) {
          for (const objectionId of formData.selected_objections) {
            await supabase
              .from('objections_library')
              .update({ usage_count: supabase.raw('usage_count + 1') })
              .eq('id', objectionId);
          }
        }

        // Add new objection if provided
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

        // Show success message
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        /* ========== TRAINING LIBRARY AUTO-REDIRECT SECTION ========== */
        // Analyze scores and comments for training opportunities
        const categoryData = {
          bonding_rapport: { score: formData.bonding_rapport, comment: formData.bonding_rapport_comment },
          magic_problem: { score: formData.magic_problem, comment: formData.magic_problem_comment },
          second_ask: { score: formData.second_ask, comment: formData.second_ask_comment },
          objection_handling: { score: formData.objection_handling, comment: formData.objection_handling_comment }
        };

        const trainingCandidates = analyzeForTraining(categoryData);

        if (trainingCandidates.length > 0) {
          const selectedAgent = agents.find(agent => agent.id === selectedAgentToScore);
          setTrainingData({
            agentName: selectedAgent?.name || 'Unknown',
            categories: trainingCandidates,
            propertyAddress: formData.property_address,
            callDate: formData.call_date,
            callTime: formData.call_time
          });
          
          // Show training redirect after short delay
          setTimeout(() => {
            setShowTrainingRedirect(true);
          }, 1500);
        }

        // Reset form
        resetForm();
        
        // Refresh the data
        await fetchAgentsData();
        
      } catch (error) {
        console.error('Error submitting QC session:', error);
        alert('Error submitting QC session. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    /* ========== FORM RESET SECTION ========== */
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

    /* ========== SKILLS MANAGEMENT SECTION ========== */
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
      await fetchSkillsLibrary(); // Refresh the library
    };

    const removeSkillByText = (category, skillText) => {
      const skillsKey = `${category}_skills`;
      setFormData(prev => ({
        ...prev,
        [skillsKey]: prev[skillsKey].filter(skill => skill !== skillText)
      }));
    };

    /* ========== N/A FUNCTIONALITY SECTION ========== */
    const handleNAToggle = (field) => {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field] === null ? 3 : null
      }));
    };

    /* ========== TRAINING LIBRARY REDIRECT COMPONENT ========== */
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
                  // Save each training example
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

    /* ========== QC SCORING FORM RENDER SECTION ========== */
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
              <h1 className="header-title">QC Scoring Interface</h1>
              <p className="header-subtitle">Submit performance evaluations</p>
            </div>
          </div>
        </div>

        {/* Success Message Overlay */}
        {showSuccess && (
          <div className="success-overlay">
            <div className="success-message">
              ✅ QC Session submitted successfully!
            </div>
          </div>
        )}

        {/* Training Library Redirect Modal */}
        {showTrainingRedirect && trainingData && <TrainingRedirectModal />}

        <div className="main-content">
          <form onSubmit={handleSubmit} className="qc-form">
            
            {/* ========== QC AGENT SELECTION SECTION ========== */}
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

            {/* ========== AGENT TO SCORE SELECTION SECTION ========== */}
            <div className="form-section">
              <h3 className="section-title">Agent to Score</h3>
              <select 
                value={selectedAgentToScore || ''}
                onChange={(e) => setSelectedAgentToScore(e.target.value)}
                className="agent-select"
                required
              >
                <option value="">Select Agent</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ========== CALL DETAILS SECTION ========== */}
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

            {/* ========== BINARY QUESTIONS SECTION ========== */}
            <div className="form-section">
              <h3 className="section-title">Binary Questions (Yes/No/N/A)</h3>
              
              {binaryQuestions.map((question, index) => (
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

            {/* ========== 1-5 RATED QUESTIONS SECTION ========== */}
            <div className="form-section">
              <h3 className="section-title">Performance Ratings (1-5) with Comments & Skills</h3>
              
              {ratedQuestions.map((question) => (
                <div key={question.key} className="rating-category-full">
                  <div className="category-header-form">
                    <h4>{question.category}</h4>
                    <label>{question.text}</label>
                  </div>
                  
                  {/* Rating Buttons with N/A option */}
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

                  {/* Comments Section */}
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

                  {/* Skills Section */}
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

            {/* ========== CLOSING QUESTIONS SECTION ========== */}
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

            {/* ========== OBJECTION HANDLING LIBRARY SECTION ========== */}
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

            {/* ========== FINAL COMMENT SECTION ========== */}
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