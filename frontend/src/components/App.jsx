import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import InputSection from './InputSection';
import ProgressSection from './ProgressSection';
import ResultSection from './ResultSection';
import BatchProcessingSection from './BatchProcessingSection';
import BatchProgressSection from './BatchProgressSection';
import BatchResultsSection from './BatchResultsSection';
import { useTheme } from '../hooks/useTheme.jsx';

const App = () => {
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'batch'
  
  // Single video processing state
  const [currentJobId, setCurrentJobId] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState(null);
  const [view, setView] = useState('input'); // 'input', 'progress', 'result'
  const [progress, setProgress] = useState({
    percent: 0,
    message: 'Initializing...'
  });
  
  // Batch processing state
  const [currentBatchId, setCurrentBatchId] = useState(null);
  const [batchView, setBatchView] = useState('input'); // 'input', 'progress', 'results'
  const [batchStatus, setBatchStatus] = useState(null);
  
  // Initialize theme
  const { theme } = useTheme();

  const resetSingleView = () => {
    setView('input');
    setCurrentJobId(null);
    setCurrentTranscript(null);
  };

  const resetBatchView = () => {
    setBatchView('input');
    setCurrentBatchId(null);
    setBatchStatus(null);
  };

  return (
    <div className="app-container">
      <Header />
      
      <main>
        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => {
                setActiveTab('single');
                resetBatchView();
              }}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'single'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Single Video
            </button>
            <button
              onClick={() => {
                setActiveTab('batch');
                resetSingleView();
              }}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'batch'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Batch Processing
            </button>
          </div>
        </div>

        {/* Single Video Processing Tab */}
        {activeTab === 'single' && (
          <>
            {view === 'input' && (
              <InputSection 
                onProcessStart={(jobId) => {
                  setCurrentJobId(jobId);
                  setView('progress');
                }}
              />
            )}
            
            {view === 'progress' && (
              <ProgressSection
                jobId={currentJobId}
                onProcessComplete={(transcript) => {
                  setCurrentTranscript(transcript);
                  setView('result');
                }}
                progress={progress}
                setProgress={setProgress}
              />
            )}
            
            {view === 'result' && currentTranscript && (
              <ResultSection
                transcript={currentTranscript}
                jobId={currentJobId}
                onTranscriptUpdate={setCurrentTranscript}
              />
            )}
          </>
        )}

        {/* Batch Processing Tab */}
        {activeTab === 'batch' && (
          <>
            {batchView === 'input' && (
              <BatchProcessingSection
                onBatchStart={(batchId) => {
                  setCurrentBatchId(batchId);
                  setBatchView('progress');
                }}
              />
            )}
            
            {batchView === 'progress' && (
              <BatchProgressSection
                batchId={currentBatchId}
                onBatchComplete={(status) => {
                  setBatchStatus(status);
                  setBatchView('results');
                }}
              />
            )}
            
            {batchView === 'results' && batchStatus && (
              <BatchResultsSection
                batchId={currentBatchId}
                batchStatus={batchStatus}
              />
            )}
          </>
        )}

        {/* New Job Button */}
        {((activeTab === 'single' && view !== 'input') || (activeTab === 'batch' && batchView !== 'input')) && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                if (activeTab === 'single') {
                  resetSingleView();
                } else {
                  resetBatchView();
                }
              }}
              className="btn-secondary"
            >
              Start New {activeTab === 'single' ? 'Video' : 'Batch'}
            </button>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default App;