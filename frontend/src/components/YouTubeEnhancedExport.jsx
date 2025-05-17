import React, { useState, useEffect } from 'react';
import { exportTranscript } from '../utils/api';

const YouTubeEnhancedExport = ({ jobId, onClose, speakers = ['Speaker 1', 'Speaker 2'] }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState('ytt');
  const [autoStyling, setAutoStyling] = useState({
    highlightKeywords: true,
    styleQuestions: true,
    colorCodeSpeakers: true,
    questionStyles: {
      italic: true,
      bold: false,
      underline: false,
      color: false
    },
    questionColor: '#FFD700', // Default gold color for questions
    emphasisStyles: {
      bold: true,
      italic: false,
      underline: false,
      color: false
    },
    emphasisColor: '#FF6347' // Default tomato color for emphasis
  });
  const [speakerColors, setSpeakerColors] = useState(
    speakers.reduce((acc, speaker) => ({
      ...acc,
      [speaker]: '#00FF00' // Default green color
    }), {})
  );
  const [keywords, setKeywords] = useState(['']);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '' });

  // Effect to handle notification auto-hide
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ show: false, message: '' });
      }, 3000); // Notification disappears after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  // Step 1: Format Selection
  const renderFormatSelection = () => (
    <div className="format-selection">
      <h3 className="text-xl mb-4">Choose Export Format</h3>
      <div className="space-y-4">
        <div className="format-option">
          <input
            type="radio"
            id="format-ytt"
            name="format"
            value="ytt"
            checked={selectedFormat === 'ytt'}
            onChange={(e) => setSelectedFormat(e.target.value)}
          />
          <label htmlFor="format-ytt">
            <span className="font-bold">YTT/SRV3 Format (Recommended)</span>
            <p className="text-sm text-gray-400">Full styling support for YouTube</p>
          </label>
        </div>
        <div className="format-option">
          <input
            type="radio"
            id="format-ttml"
            name="format"
            value="ttml"
            checked={selectedFormat === 'ttml'}
            onChange={(e) => setSelectedFormat(e.target.value)}
          />
          <label htmlFor="format-ttml">
            <span className="font-bold">TTML Format</span>
            <p className="text-sm text-gray-400">Good styling support</p>
          </label>
        </div>
        <div className="format-option">
          <input
            type="radio"
            id="format-vtt"
            name="format"
            value="vtt"
            checked={selectedFormat === 'vtt'}
            onChange={(e) => setSelectedFormat(e.target.value)}
          />
          <label htmlFor="format-vtt">
            <span className="font-bold">WebVTT Format</span>
            <p className="text-sm text-gray-400">Basic styling support</p>
          </label>
        </div>
      </div>
    </div>
  );

  // Step 2: Auto-Styling Options
  const renderAutoStyling = () => (
    <div className="auto-styling">
      <h3 className="text-xl mb-4">Styling Options</h3>
      <div className="space-y-4">
        <div className="checkbox-option">
          <input
            type="checkbox"
            id="highlight-keywords"
            checked={autoStyling.highlightKeywords}
            onChange={(e) => setAutoStyling(prev => ({
              ...prev,
              highlightKeywords: e.target.checked
            }))}
          />
          <label htmlFor="highlight-keywords">Highlight important keywords</label>
        </div>
        <div className="checkbox-option">
          <input
            type="checkbox"
            id="style-questions"
            checked={autoStyling.styleQuestions}
            onChange={(e) => setAutoStyling(prev => ({
              ...prev,
              styleQuestions: e.target.checked
            }))}
          />
          <label htmlFor="style-questions">Style questions and emphasis</label>
        </div>
        <div className="checkbox-option">
          <input
            type="checkbox"
            id="color-code-speakers"
            checked={autoStyling.colorCodeSpeakers}
            onChange={(e) => setAutoStyling(prev => ({
              ...prev,
              colorCodeSpeakers: e.target.checked
            }))}
          />
          <label htmlFor="color-code-speakers">Color-code speakers</label>
        </div>
      </div>
    </div>
  );

  // Step 3: Format-Specific Customization
  const renderCustomization = () => (
    <div className="customization">
      <h3 className="text-xl mb-4">Customize Styling</h3>
      <div className="space-y-6">
        <div className="checkbox-option">
          <input
            type="checkbox"
            id="speaker-colors"
            checked={autoStyling.colorCodeSpeakers}
            onChange={(e) => setAutoStyling(prev => ({
              ...prev,
              colorCodeSpeakers: e.target.checked
            }))}
          />
          <label htmlFor="speaker-colors" className="ml-3">Color-code different speakers</label>
        </div>

        {autoStyling.colorCodeSpeakers && (
          <div className="speaker-colors-section mt-4 ml-8">
            <h4 className="text-lg mb-3">Speaker Colors</h4>
            <div className="space-y-3">
              {speakers.map((speaker, index) => (
                <div key={speaker} className="flex items-center space-x-4">
                  <label className="text-gray-300 w-32">{speaker}</label>
                  <input
                    type="color"
                    value={speakerColors[speaker] || '#00FF00'}
                    onChange={(e) => setSpeakerColors(prev => ({
                      ...prev,
                      [speaker]: e.target.value
                    }))}
                    className="color-picker w-12 h-8 rounded cursor-pointer bg-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="checkbox-option">
          <input
            type="checkbox"
            id="keyword-highlight"
            checked={autoStyling.highlightKeywords}
            onChange={(e) => setAutoStyling(prev => ({
              ...prev,
              highlightKeywords: e.target.checked
            }))}
          />
          <label htmlFor="keyword-highlight" className="ml-3">Highlight important keywords</label>
        </div>

        {autoStyling.highlightKeywords && (
          <div className="keyword-section mt-4 ml-8">
            <h4 className="text-lg mb-3">Keywords to Highlight</h4>
            <div className="space-y-3">
              {keywords.map((keyword, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => {
                      const newKeywords = [...keywords];
                      newKeywords[index] = e.target.value;
                      setKeywords(newKeywords);
                    }}
                    placeholder="Enter keyword"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => {
                      const newKeywords = keywords.filter((_, i) => i !== index);
                      setKeywords(newKeywords.length ? newKeywords : ['']);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500"
                    aria-label="Remove keyword"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              {keywords.length < 5 && (
                <button
                  onClick={() => {
                    setKeywords([...keywords, '']);
                    setNotification({ show: true, message: 'Keyword added successfully!' });
                  }}
                  className="text-emerald-500 hover:text-emerald-400 flex items-center space-x-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Add keyword</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="checkbox-option">
          <input
            type="checkbox"
            id="style-questions"
            checked={autoStyling.styleQuestions}
            onChange={(e) => setAutoStyling(prev => ({
              ...prev,
              styleQuestions: e.target.checked
            }))}
          />
          <label htmlFor="style-questions" className="ml-3">Style questions and emphasis</label>
        </div>

        {autoStyling.styleQuestions && (
          <div className="styling-options-section mt-4 ml-8">
            <h4 className="text-lg mb-3">Question & Emphasis Styling</h4>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Question Styling (select multiple)</label>
              <div className="flex space-x-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="questionStyleItalic"
                    checked={autoStyling.questionStyles.italic}
                    onChange={(e) => setAutoStyling(prev => ({
                      ...prev,
                      questionStyles: {
                        ...prev.questionStyles,
                        italic: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <span className="italic">Italic</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="questionStyleBold"
                    checked={autoStyling.questionStyles.bold}
                    onChange={(e) => setAutoStyling(prev => ({
                      ...prev,
                      questionStyles: {
                        ...prev.questionStyles,
                        bold: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <span className="font-bold">Bold</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="questionStyleUnderline"
                    checked={autoStyling.questionStyles.underline}
                    onChange={(e) => setAutoStyling(prev => ({
                      ...prev,
                      questionStyles: {
                        ...prev.questionStyles,
                        underline: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <span className="underline">Underline</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="questionStyleColor"
                    checked={autoStyling.questionStyles.color}
                    onChange={(e) => setAutoStyling(prev => ({
                      ...prev,
                      questionStyles: {
                        ...prev.questionStyles,
                        color: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <span style={{ color: '#FFD700' }}>Color</span>
                  {autoStyling.questionStyles.color && (
                    <input 
                      type="color" 
                      value={autoStyling.questionColor || '#FFD700'}
                      onChange={(e) => setAutoStyling(prev => ({ ...prev, questionColor: e.target.value }))}
                      className="ml-2 w-8 h-6 rounded cursor-pointer bg-transparent"
                    />
                  )}
                </label>
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Emphasis Styling (ALL CAPS text)</label>
              <div className="flex space-x-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="emphasisStyleBold"
                    checked={autoStyling.emphasisStyles.bold}
                    onChange={(e) => setAutoStyling(prev => ({
                      ...prev,
                      emphasisStyles: {
                        ...prev.emphasisStyles,
                        bold: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <span className="font-bold">Bold</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="emphasisStyleItalic"
                    checked={autoStyling.emphasisStyles.italic}
                    onChange={(e) => setAutoStyling(prev => ({
                      ...prev,
                      emphasisStyles: {
                        ...prev.emphasisStyles,
                        italic: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <span className="italic">Italic</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="emphasisStyleUnderline"
                    checked={autoStyling.emphasisStyles.underline}
                    onChange={(e) => setAutoStyling(prev => ({
                      ...prev,
                      emphasisStyles: {
                        ...prev.emphasisStyles,
                        underline: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <span className="underline">Underline</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="emphasisStyleColor"
                    checked={autoStyling.emphasisStyles.color}
                    onChange={(e) => setAutoStyling(prev => ({
                      ...prev,
                      emphasisStyles: {
                        ...prev.emphasisStyles,
                        color: e.target.checked
                      }
                    }))}
                    className="mr-2"
                  />
                  <span style={{ color: '#FF6347' }}>Color</span>
                  {autoStyling.emphasisStyles.color && (
                    <input 
                      type="color" 
                      value={autoStyling.emphasisColor || '#FF6347'}
                      onChange={(e) => setAutoStyling(prev => ({ ...prev, emphasisColor: e.target.value }))}
                      className="ml-2 w-8 h-6 rounded cursor-pointer bg-transparent"
                    />
                  )}
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Step 4: Preview & Export
  const renderPreview = () => {
    // Generate a simple preview based on the current settings
    const generatePreview = () => {
      const applyStyling = (text, speaker) => {
        let styledText = text;

        // Apply keyword highlighting
        if (autoStyling.highlightKeywords && keywords.filter(k => k.trim()).length > 0) {
          keywords.forEach(keyword => {
            if (keyword && keyword.trim()) {
              const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
              styledText = styledText.replace(regex, match => `<b>${match}</b>`);
            }
          });
        }

        // Apply question styling
        if (autoStyling.styleQuestions && text.includes('?')) {
          const styles = autoStyling.questionStyles;
          let questionText = styledText;
          
          if (styles.bold) {
            questionText = `<b>${questionText}</b>`;
          }
          if (styles.italic) {
            questionText = `<i>${questionText}</i>`;
          }
          if (styles.underline) {
            questionText = `<u>${questionText}</u>`;
          }
          if (styles.color) {
            const questionColor = autoStyling.questionColor || '#FFD700';
            questionText = `<span style="color: ${questionColor}">${questionText}</span>`;
          }
          
          styledText = questionText;
        }

        // Detect and style emphasized text (ALL CAPS phrases)
        if (autoStyling.styleQuestions) {
          // Simple regex to find ALL CAPS words of 2+ characters
          const capsPattern = /\b[A-Z]{2,}\b/g;
          const matches = styledText.match(capsPattern);
          
          if (matches && (autoStyling.emphasisStyles.bold || 
                          autoStyling.emphasisStyles.italic || 
                          autoStyling.emphasisStyles.underline || 
                          autoStyling.emphasisStyles.color)) {
            matches.forEach(match => {
              let replacement = match;
              const styles = autoStyling.emphasisStyles;
              
              if (styles.bold) {
                replacement = `<b>${replacement}</b>`;
              }
              if (styles.italic) {
                replacement = `<i>${replacement}</i>`;
              }
              if (styles.underline) {
                replacement = `<u>${replacement}</u>`;
              }
              if (styles.color) {
                const emphasisColor = autoStyling.emphasisColor || '#FF6347';
                replacement = `<span style="color: ${emphasisColor}">${replacement}</span>`;
              }
              
              styledText = styledText.replace(new RegExp(`\\b${match}\\b`, 'g'), replacement);
            });
          }
        }

        // Apply speaker color
        if (autoStyling.colorCodeSpeakers) {
          const color = speakerColors[speaker];
          // Only apply color if it exists and isn't white (to avoid overriding other styles)
          if (color && color !== '#FFFFFF') {
            styledText = `<span style="color: ${color}">${styledText}</span>`;
          }
        }

        return styledText;
      };

      // Create a preview with a few sample segments
      return (
        <div className="preview-content p-4 bg-gray-800 rounded text-white font-mono text-sm overflow-auto max-h-60">
          <div className="mb-2">WEBVTT</div>
          <div className="mb-2">
            <div>NOTE</div>
            <div>Title: Preview of Enhanced Export</div>
            <div>Duration: 00:05:30</div>
            <div>Speakers: {speakers.length}</div>
          </div>
          <div className="mb-2">
            <div>1</div>
            <div>00:00:01.000 --&gt; 00:00:05.000</div>
            <div dangerouslySetInnerHTML={{
              __html: applyStyling("Welcome to this sample transcript. This shows how your styling will look.", speakers[0])
            }} />
          </div>
          <div className="mb-2">
            <div>2</div>
            <div>00:00:06.000 --&gt; 00:00:10.000</div>
            <div dangerouslySetInnerHTML={{
              __html: applyStyling("Are you seeing how the question styling works?", speakers[0])
            }} />
          </div>
          <div className="mb-2">
            <div>3</div>
            <div>00:00:11.000 --&gt; 00:00:13.000</div>
            <div dangerouslySetInnerHTML={{
              __html: applyStyling("IMPORTANT EMPHASIS is shown in all caps.", speakers[0])
            }} />
          </div>
          <div className="mb-2">
            <div>4</div>
            <div>00:00:14.000 --&gt; 00:00:18.000</div>
            <div dangerouslySetInnerHTML={{
              __html: applyStyling("Yes, I can see how the different speaker colors appear in the transcript.", speakers[1])
            }} />
          </div>
          <div className="mb-2">
            <div>5</div>
            <div>00:00:19.000 --&gt; 00:00:23.000</div>
            <div dangerouslySetInnerHTML={{
              __html: applyStyling(`The ${keywords[0] || 'keywords'} you add will be highlighted like this.`, speakers[0])
            }} />
          </div>
        </div>
      );
    };

    return (
      <div className="preview">
        <h3 className="text-xl mb-4">Preview & Export</h3>
        <div className="preview-container mb-4">
          {generatePreview()}
        </div>
        <div className="export-info mb-4 space-y-2">
          <p className="font-medium">Final Format: <span className="font-bold">{selectedFormat.toUpperCase()}</span></p>
          <p>Speaker Colors: {autoStyling.colorCodeSpeakers ? 'Enabled' : 'Disabled'}</p>
          <p>Keyword Highlighting: {autoStyling.highlightKeywords ? `Enabled (${keywords.filter(k => k.trim()).length} keywords)` : 'Disabled'}</p>
          <p>Question Styling: {autoStyling.styleQuestions ?
            `Enabled (${Object.entries(autoStyling.questionStyles)
              .filter(([k, v]) => v)
              .map(([k, v]) => k.charAt(0).toUpperCase() + k.slice(1))
              .join(', ') || 'None'})` : 'Disabled'}</p>
          <p>Emphasis Styling: {autoStyling.styleQuestions && (autoStyling.emphasisStyles.bold || 
                                                             autoStyling.emphasisStyles.italic || 
                                                             autoStyling.emphasisStyles.underline || 
                                                             autoStyling.emphasisStyles.color) ?
            `Enabled (${Object.entries(autoStyling.emphasisStyles)
              .filter(([k, v]) => v)
              .map(([k, v]) => k.charAt(0).toUpperCase() + k.slice(1))
              .join(', ')})` : 'Disabled'}</p>
          <p className="text-xs text-gray-400 mt-2 italic">This is a preview only. The actual output may vary slightly.</p>
        </div>
      </div>
    );
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError('');
      
      // Prepare export options
      const exportOptions = {
        format: selectedFormat,
        styling: {
          ...autoStyling,
          speakerColors,
          keywords
        }
      };

      // Log export attempt
      console.log('Initiating enhanced export:', {
        jobId,
        options: exportOptions
      });

      // Call the enhanced export endpoint
      await exportTranscript(jobId, 'enhanced', exportOptions);
      
      // Close the wizard on success
      onClose();
    } catch (err) {
      console.error('Enhanced export error:', err);
      setError(err.message || 'Failed to export with enhanced styling');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="youtube-enhanced-export">
      <div className="wizard-header flex justify-between items-center">
        <h2 className="text-2xl mb-4">YouTube Enhanced Export</h2>
        <button 
          onClick={onClose}
          className="close-button text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="step-indicators flex space-x-2 mb-6">
        {[1, 2, 3, 4].map(step => (
          <div
            key={step}
            className={`step-indicator ${currentStep === step ? 'active' : ''}`}
            onClick={() => setCurrentStep(step)}
          >
            {step}
          </div>
        ))}
      </div>

      <div className="step-content">
        {currentStep === 1 && renderFormatSelection()}
        {currentStep === 2 && renderAutoStyling()}
        {currentStep === 3 && renderCustomization()}
        {currentStep === 4 && renderPreview()}
      </div>

      <div className="navigation-buttons flex justify-between mt-6">
        {currentStep > 1 && (
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="back-button px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Back
          </button>
        )}
        {currentStep < 4 ? (
          <button
            onClick={() => setCurrentStep(prev => prev + 1)}
            className="continue-button px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded ml-4"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="export-button px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        )}
      </div>

      {error && (
        <div className="error-message mt-4 text-red-500">
          {error}
        </div>
      )}

      {/* Success notification */}
      {notification.show && (
        <div
          className="notification-toast fixed bottom-4 right-4 px-4 py-2 bg-emerald-500 text-white rounded-md shadow-lg flex items-center space-x-2 transition-opacity duration-300"
          style={{ opacity: notification.show ? '1' : '0', pointerEvents: 'none' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default YouTubeEnhancedExport;