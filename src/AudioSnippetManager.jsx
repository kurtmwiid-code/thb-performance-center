/* ========== PACKAGE 2: AUDIO SNIPPET MANAGER ========== */
/* 
 * Complete audio snippet management with:
 * - WhatsApp-style dual slider trimmer
 * - 4-minute maximum trim length
 * - Visual waveform with Wavesurfer.js
 * - Supabase Storage integration
 * - Library organization (Objections vs Training)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Scissors, Save, X, Play, Pause, Volume2, Loader } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { supabase } from './supabaseClient';

const AudioSnippetManager = ({ agents, onClose, onSnippetAdded }) => {
  // State management
  const [step, setStep] = useState(1); // 1: Upload, 2: Trim, 3: Metadata, 4: Uploading
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [wavesurfer, setWavesurfer] = useState(null);
  const [region, setRegion] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Metadata form
  const [selectedAgent, setSelectedAgent] = useState('');
  const [library, setLibrary] = useState('objections'); // 'objections' or 'training'
  const [snippetName, setSnippetName] = useState('');
  const [customAgentName, setCustomAgentName] = useState('');
  
  // Refs
  const waveformRef = useRef(null);
  const MAX_DURATION = 240; // 4 minutes in seconds

  // Initialize Wavesurfer when audio is uploaded
  useEffect(() => {
    if (audioUrl && waveformRef.current && !wavesurfer) {
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#60a5fa',
        progressColor: '#3b82f6',
        cursorColor: '#ef4444',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 2,
        height: 120,
        barGap: 2,
        normalize: true,
        plugins: [
          RegionsPlugin.create()
        ]
      });

      ws.load(audioUrl);

      ws.on('ready', () => {
        const audioDuration = ws.getDuration();
        setDuration(audioDuration);
        
        // Create initial region (first 4 minutes or full duration)
        const initialEnd = Math.min(audioDuration, MAX_DURATION);
        
        const wsRegion = ws.registerPlugin(RegionsPlugin.create());
        const newRegion = wsRegion.addRegion({
          start: 0,
          end: initialEnd,
          color: 'rgba(59, 130, 246, 0.3)',
          drag: true,
          resize: true
        });

        setRegion(newRegion);
        setTrimStart(0);
        setTrimEnd(initialEnd);
        setSelectedDuration(initialEnd);

        // Handle region updates
        newRegion.on('update-end', () => {
          const start = newRegion.start;
          const end = newRegion.end;
          const regionDuration = end - start;

          // Enforce 4-minute maximum
          if (regionDuration > MAX_DURATION) {
            const adjustedEnd = start + MAX_DURATION;
            newRegion.setOptions({ end: adjustedEnd });
            setTrimEnd(adjustedEnd);
            setSelectedDuration(MAX_DURATION);
          } else {
            setTrimStart(start);
            setTrimEnd(end);
            setSelectedDuration(regionDuration);
          }
        });
      });

      ws.on('play', () => setIsPlaying(true));
      ws.on('pause', () => setIsPlaying(false));
      ws.on('finish', () => setIsPlaying(false));

      setWavesurfer(ws);

      return () => {
        if (ws) ws.destroy();
      };
    }
  }, [audioUrl, wavesurfer]);

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setStep(2);
    } else {
      alert('Please upload a valid audio file');
    }
  };

  // Play/pause toggle
  const togglePlayPause = () => {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Move to metadata step
  const proceedToMetadata = () => {
    if (selectedDuration === 0) {
      alert('Please select a portion of the audio to trim');
      return;
    }
    setStep(3);
  };

  // Upload trimmed snippet to Supabase
  const handleUpload = async () => {
    // Validation
    if (!snippetName.trim()) {
      alert('Please enter a snippet name');
      return;
    }
    if (selectedAgent === '' && customAgentName.trim() === '') {
      alert('Please select an agent or enter a custom name');
      return;
    }

    setStep(4);
    setUploadProgress(10);

    try {
      // Create audio context for trimming
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      setUploadProgress(30);

      // Calculate sample ranges
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(trimStart * sampleRate);
      const endSample = Math.floor(trimEnd * sampleRate);
      const trimmedLength = endSample - startSample;

      // Create trimmed buffer
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        sampleRate
      );

      // Copy audio data for trimmed portion
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const trimmedData = trimmedBuffer.getChannelData(channel);
        for (let i = 0; i < trimmedLength; i++) {
          trimmedData[i] = originalData[startSample + i];
        }
      }

      setUploadProgress(50);

      // Convert to WAV blob
      const wavBlob = await audioBufferToWav(trimmedBuffer);

      setUploadProgress(70);

      // Upload to Supabase Storage
      const agentName = selectedAgent === 'other' ? customAgentName : 
                        agents.find(a => a.id === selectedAgent)?.name || 'Unknown';
      
      const fileName = `${library}/${agentName.replace(/\s+/g, '_')}_${Date.now()}.wav`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-snippets')
        .upload(fileName, wavBlob, {
          contentType: 'audio/wav',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploadProgress(85);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('audio-snippets')
        .getPublicUrl(fileName);

      // Save metadata to database
      const { error: dbError } = await supabase
        .from(library === 'objections' ? 'objections_library' : 'training_library')
        .insert({
          agent_id: selectedAgent === 'other' ? null : selectedAgent,
          agent_name: agentName,
          snippet_name: snippetName,
          audio_url: urlData.publicUrl,
          duration: selectedDuration,
          created_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      setUploadProgress(100);

      // Success!
      setTimeout(() => {
        if (onSnippetAdded) onSnippetAdded();
        onClose();
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload snippet: ' + error.message);
      setStep(3);
    }
  };

  // Convert AudioBuffer to WAV Blob
  const audioBufferToWav = (buffer) => {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const wav = new ArrayBuffer(44 + length);
    const view = new DataView(wav);

    // WAV header
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const channels = [];
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([wav], { type: 'audio/wav' });
  };

  return (
    <div className="snippet-manager-overlay" onClick={onClose}>
      <div className="snippet-manager-modal" onClick={(e) => e.stopPropagation()}>
        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="snippet-step">
            <div className="step-header">
              <h2>📂 Import Audio Snippet</h2>
              <button onClick={onClose} className="close-btn"><X size={24} /></button>
            </div>
            <div className="upload-zone">
              <Upload size={48} className="upload-icon" />
              <p className="upload-text">Upload audio file from your laptop</p>
              <p className="upload-hint">Drag and drop or click to browse</p>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="file-input"
                id="audio-upload"
              />
              <label htmlFor="audio-upload" className="upload-btn">
                Choose File
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: TRIM */}
        {step === 2 && (
          <div className="snippet-step">
            <div className="step-header">
              <h2>✂️ Trim Audio (Max 4 minutes)</h2>
              <button onClick={onClose} className="close-btn"><X size={24} /></button>
            </div>
            
            <div className="waveform-container" ref={waveformRef}></div>

            <div className="trim-controls">
              <div className="time-display">
                <div className="time-item">
                  <span className="time-label">Start:</span>
                  <span className="time-value">{formatTime(trimStart)}</span>
                </div>
                <div className="time-item duration">
                  <span className="time-label">Duration:</span>
                  <span className={`time-value ${selectedDuration >= MAX_DURATION ? 'max-duration' : ''}`}>
                    {formatTime(selectedDuration)} / {formatTime(MAX_DURATION)}
                    {selectedDuration >= MAX_DURATION && ' MAX'}
                  </span>
                </div>
                <div className="time-item">
                  <span className="time-label">End:</span>
                  <span className="time-value">{formatTime(trimEnd)}</span>
                </div>
              </div>

              <div className="playback-controls">
                <button onClick={togglePlayPause} className="play-btn">
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <span className="playback-hint">
                  Drag the highlighted region to select your snippet
                </span>
              </div>
            </div>

            <div className="step-actions">
              <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
              <button onClick={proceedToMetadata} className="btn-primary">
                Next: Add Details
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: METADATA */}
        {step === 3 && (
          <div className="snippet-step">
            <div className="step-header">
              <h2>📝 Snippet Details</h2>
              <button onClick={onClose} className="close-btn"><X size={24} /></button>
            </div>

            <div className="metadata-form">
              <div className="form-group">
                <label>Snippet Name *</label>
                <input
                  type="text"
                  value={snippetName}
                  onChange={(e) => setSnippetName(e.target.value)}
                  placeholder="e.g., 'Handling Price Objection' or 'Perfect Rapport Building'"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Select Agent *</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Select Agent --</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                  <option value="other">Other (Custom Name)</option>
                </select>
              </div>

              {selectedAgent === 'other' && (
                <div className="form-group">
                  <label>Custom Agent Name *</label>
                  <input
                    type="text"
                    value={customAgentName}
                    onChange={(e) => setCustomAgentName(e.target.value)}
                    placeholder="Enter agent name"
                    className="form-input"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Library *</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="objections"
                      checked={library === 'objections'}
                      onChange={(e) => setLibrary(e.target.value)}
                    />
                    <span>☑️ Objection Library</span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      value="training"
                      checked={library === 'training'}
                      onChange={(e) => setLibrary(e.target.value)}
                    />
                    <span>☑️ Training Library</span>
                  </label>
                </div>
              </div>

              <div className="snippet-summary">
                <h4>Summary</h4>
                <p><strong>Duration:</strong> {formatTime(selectedDuration)}</p>
                <p><strong>File:</strong> {audioFile?.name}</p>
              </div>
            </div>

            <div className="step-actions">
              <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
              <button onClick={handleUpload} className="btn-primary">
                <Save size={18} /> Save Snippet
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: UPLOADING */}
        {step === 4 && (
          <div className="snippet-step">
            <div className="step-header">
              <h2>⏳ Uploading Snippet...</h2>
            </div>
            <div className="upload-progress">
              <Loader className="spinner" size={48} />
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p>{uploadProgress}% Complete</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioSnippetManager;
