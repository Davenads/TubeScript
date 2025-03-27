import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import InputSection from './InputSection';
import ProgressSection from './ProgressSection';
import ResultSection from './ResultSection';
import { useTheme } from '../hooks/useTheme.jsx';

const App = () => {
  const [currentJobId, setCurrentJobId] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState(null);
  const [view, setView] = useState('input'); // 'input', 'progress', 'result'
  const [progress, setProgress] = useState({
    percent: 0,
    message: 'Initializing...'
  });
  
  // Initialize theme
  const { theme } = useTheme();

  return (
    <div className="app-container">
      <Header />
      
      <main>
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
      </main>
      
      <Footer />
    </div>
  );
};

export default App;