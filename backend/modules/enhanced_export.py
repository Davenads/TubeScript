import logging
import json
import re
from datetime import datetime
from typing import Dict, List, Optional
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('enhanced_export')

class EnhancedExport:
    def __init__(self, transcript: Dict, options: Dict):
        self.transcript = transcript
        self.options = options
        self.format = options.get('format', 'ytt')
        self.styling = options.get('styling', {})
        
        # Set up export-specific logger
        self.export_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.logger = logging.getLogger(f'enhanced_export_{self.export_id}')
        
        # Log export initialization
        self.logger.info(f"Initializing enhanced export with format: {self.format}")
        self.logger.debug(f"Export options: {json.dumps(options, indent=2)}")
    
    def generate_export(self) -> str:
        """Generate the enhanced export content based on the selected format and options"""
        try:
            self.logger.info("Starting export generation")
            
            if self.format == 'ytt':
                return self._generate_ytt()
            elif self.format == 'ttml':
                return self._generate_ttml()
            elif self.format == 'vtt':
                return self._generate_vtt()
            else:
                raise ValueError(f"Unsupported format: {self.format}")
                
        except Exception as e:
            self.logger.error(f"Error generating export: {str(e)}", exc_info=True)
            raise
    
    def _generate_ytt(self) -> str:
        """Generate YTT/SRV3 format with full styling support for YouTube"""
        try:
            self.logger.info("Generating YTT/SRV3 format")

            # Start with YTT header
            content = "WEBVTT\nKind: captions\nLanguage: en\n\n"

            # Add metadata as comments
            content += f"NOTE\n"
            content += f"Title: {self.transcript['metadata']['title']}\n"
            content += f"Duration: {self.transcript['metadata']['duration']}\n"
            content += f"Speakers: {self.transcript['metadata']['num_speakers']}\n\n"

            # Add styling section if we're using speaker colors
            if self.styling.get('colorCodeSpeakers'):
                content += "STYLE\n"
                for speaker, color in self.styling.get('speakerColors', {}).items():
                    # Convert color to a valid CSS color if needed
                    if color and color.startswith('#'):
                        # It's already a valid hex color
                        css_color = color
                    else:
                        # Skip invalid colors
                        continue

                    # Create a CSS class for this speaker
                    speaker_id = speaker.lower().replace(' ', '_')
                    content += f"::cue(.{speaker_id}) {{ color: {css_color}; }}\n"
                content += "\n"

            # Process each segment with styling
            for i, segment in enumerate(self.transcript['segments'], 1):
                # Format timestamps
                start_time = self._format_timestamp(segment['start'])
                end_time = self._format_timestamp(segment['end'])

                # Add cue with optional position and alignment
                content += f"{i}\n"
                content += f"{start_time} --> {end_time} align:start position:5%\n"

                # Add speaker label first (in parentheses and styled with color)
                speaker = segment['speaker']
                speaker_id = speaker.lower().replace(' ', '_')

                # Apply styling based on options
                text = self._apply_styling(segment['text'], segment['speaker'])

                # Add final styled text with speaker voice class
                if self.styling.get('colorCodeSpeakers'):
                    content += f"<c.{speaker_id}>{text}</c>\n\n"
                else:
                    content += f"{text}\n\n"

            self.logger.info("YTT/SRV3 generation completed successfully")
            return content

        except Exception as e:
            self.logger.error(f"Error generating YTT format: {str(e)}", exc_info=True)
            raise
    
    def _generate_ttml(self) -> str:
        """Generate TTML format with styling support"""
        try:
            self.logger.info("Generating TTML format")
            
            # TTML XML structure
            content = '<?xml version="1.0" encoding="UTF-8"?>\n'
            content += '<tt xmlns="http://www.w3.org/ns/ttml">\n'
            content += '  <head>\n'
            content += '    <styling>\n'
            
            # Add styles for speakers if color coding is enabled
            if self.styling.get('colorCodeSpeakers'):
                for speaker in self._get_unique_speakers():
                    color = self.styling.get('speakerColors', {}).get(speaker)
                    # Only add color styling if a valid color is provided
                    if color and color.startswith('#'):
                        content += f'      <style id="{speaker}" tts:color="{color}"/>\n'
            
            content += '    </styling>\n'
            content += '  </head>\n'
            content += '  <body>\n'
            content += '    <div>\n'
            
            # Add segments
            for segment in self.transcript['segments']:
                start_time = self._format_timestamp(segment['start'])
                end_time = self._format_timestamp(segment['end'])
                
                content += f'      <p begin="{start_time}" end="{end_time}"'
                
                # Add style if color coding is enabled
                if self.styling.get('colorCodeSpeakers'):
                    content += f' style="{segment["speaker"]}"'
                
                content += '>\n'
                
                # Apply styling to text
                text = self._apply_styling(segment['text'], segment['speaker'])
                content += f'        {text}\n'
                content += '      </p>\n'
            
            content += '    </div>\n'
            content += '  </body>\n'
            content += '</tt>'
            
            self.logger.info("TTML generation completed successfully")
            return content
            
        except Exception as e:
            self.logger.error(f"Error generating TTML format: {str(e)}", exc_info=True)
            raise
    
    def _generate_vtt(self) -> str:
        """Generate WebVTT format with enhanced styling for YouTube"""
        try:
            self.logger.info("Generating YouTube-compatible WebVTT format")

            content = "WEBVTT\n\n"

            # Add metadata as comments
            content += "NOTE\n"
            content += f"Title: {self.transcript['metadata']['title']}\n"
            content += f"Duration: {self.transcript['metadata']['duration']}\n"
            content += f"Speakers: {self.transcript['metadata']['num_speakers']}\n\n"

            # Add segments
            for i, segment in enumerate(self.transcript['segments'], 1):
                start_time = self._format_timestamp(segment['start'])
                end_time = self._format_timestamp(segment['end'])

                content += f"{i}\n"
                content += f"{start_time} --> {end_time}\n"

                # Apply styling based on options
                text = segment['text']

                # Apply styling transforms
                styled_text = self._apply_styling(text, segment['speaker'])

                # YouTube supports the <v> tag for voice but we'll use more styling control
                # with the span tag for greater visual customization
                # content += f"<v {segment['speaker']}>{styled_text}</v>\n\n"
                content += f"{styled_text}\n\n"

            self.logger.info("WebVTT generation completed successfully")
            return content

        except Exception as e:
            self.logger.error(f"Error generating WebVTT format: {str(e)}", exc_info=True)
            raise
    
    def _format_timestamp(self, seconds: float) -> str:
        """Format seconds into timestamp string"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = seconds % 60
        milliseconds = int((seconds % 1) * 1000)
        seconds = int(seconds)
        
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}"
    
    def _apply_styling(self, text: str, speaker: str) -> str:
        """Apply styling to text based on options"""
        try:
            self.logger.debug(f"Applying styling to text: {text}")

            # Apply keyword highlighting if enabled
            if self.styling.get('highlightKeywords'):
                text = self._highlight_keywords(text)

            # Apply question styling if enabled
            if self.styling.get('styleQuestions'):
                text = self._style_questions(text)

            # Apply speaker color if enabled
            if self.styling.get('colorCodeSpeakers'):
                color = self.styling.get('speakerColors', {}).get(speaker)
                # Only apply color if it's explicitly provided and not None or white
                if color and color != '#FFFFFF':
                    text = f'<span style="color: {color}">{text}</span>'

            return text

        except Exception as e:
            self.logger.error(f"Error applying styling: {str(e)}", exc_info=True)
            return text
    
    def _highlight_keywords(self, text: str) -> str:
        """Highlight important keywords in the text"""
        # Get keywords from styling options
        keywords = self.styling.get('keywords', [])

        # Skip if no keywords defined
        if not keywords or all(k == '' for k in keywords):
            return text

        # Log keywords for debugging
        self.logger.debug(f"Highlighting keywords: {keywords}")

        # Apply highlight to each keyword
        highlighted_text = text
        for keyword in keywords:
            if keyword and keyword.strip():
                # Use case-insensitive replacement with word boundaries
                # Format differs based on export format
                if self.format in ['ytt', 'vtt']:
                    # For YTT/WebVTT - use b tag for bold highlighting
                    pattern = r'(?i)\b(' + re.escape(keyword.strip()) + r')\b'
                    highlighted_text = re.sub(pattern, r'<b>\1</b>', highlighted_text)
                elif self.format == 'ttml':
                    # For TTML - use span with font-weight styling
                    pattern = r'(?i)\b(' + re.escape(keyword.strip()) + r')\b'
                    highlighted_text = re.sub(pattern, r'<span tts:fontWeight="bold">\1</span>', highlighted_text)

        return highlighted_text
    
    def _style_questions(self, text: str) -> str:
        """Style questions and emphasis in the text"""
        if not self.styling.get('styleQuestions', False):
            return text

        try:
            # Detect questions by looking for question marks
            if '?' in text:
                question_styles = self.styling.get('questionStyles', {'italic': True})

                # Store original text to apply combinations
                question_text = text

                if self.format in ['ytt', 'vtt']:
                    # Apply each style if enabled
                    if question_styles.get('bold', False):
                        question_text = f'<b>{question_text}</b>'
                    if question_styles.get('italic', False):
                        question_text = f'<i>{question_text}</i>'
                    if question_styles.get('underline', False):
                        question_text = f'<u>{question_text}</u>'
                    if question_styles.get('color', False):
                        question_color = self.styling.get('questionColor', '#FFD700')
                        question_text = f'<span style="color: {question_color}">{question_text}</span>'

                    # Update the text with all styles applied
                    text = question_text

                elif self.format == 'ttml':
                    # For TTML format, we need to use nested spans for multiple styles
                    current_text = question_text

                    if question_styles.get('bold', False):
                        current_text = f'<span tts:fontWeight="bold">{current_text}</span>'
                    if question_styles.get('italic', False):
                        current_text = f'<span tts:fontStyle="italic">{current_text}</span>'
                    if question_styles.get('underline', False):
                        current_text = f'<span tts:textDecoration="underline">{current_text}</span>'
                    if question_styles.get('color', False):
                        question_color = self.styling.get('questionColor', '#FFD700')
                        current_text = f'<span tts:color="{question_color}">{current_text}</span>'

                    text = current_text

            # Detect emphasized text (ALL CAPS phrases or words)
            emphasis_styles = self.styling.get('emphasisStyles', {'bold': True})
            if any(emphasis_styles.values()):
                # Match ALL CAPS words or phrases
                caps_pattern = r'\b[A-Z][A-Z]+(?:\s+[A-Z][A-Z]+)*\b'
                if re.search(caps_pattern, text):
                    # Get matches
                    matches = re.finditer(caps_pattern, text)
                    for match in matches:
                        emphasized_text = match.group(0)

                        if self.format in ['ytt', 'vtt']:
                            # Apply each enabled style sequentially
                            replacement = emphasized_text

                            if emphasis_styles.get('bold', False):
                                replacement = f'<b>{replacement}</b>'
                            if emphasis_styles.get('italic', False):
                                replacement = f'<i>{replacement}</i>'
                            if emphasis_styles.get('underline', False):
                                replacement = f'<u>{replacement}</u>'
                            if emphasis_styles.get('color', False):
                                emphasis_color = self.styling.get('emphasisColor', '#FF6347')
                                replacement = f'<span style="color: {emphasis_color}">{replacement}</span>'

                            # Only replace if any styling was applied
                            if replacement != emphasized_text:
                                text = text.replace(emphasized_text, replacement)

                        elif self.format == 'ttml':
                            # Apply TTML specific styling with nested spans as needed
                            replacement = emphasized_text

                            if emphasis_styles.get('bold', False):
                                replacement = f'<span tts:fontWeight="bold">{replacement}</span>'
                            if emphasis_styles.get('italic', False):
                                replacement = f'<span tts:fontStyle="italic">{replacement}</span>'
                            if emphasis_styles.get('underline', False):
                                replacement = f'<span tts:textDecoration="underline">{replacement}</span>'
                            if emphasis_styles.get('color', False):
                                emphasis_color = self.styling.get('emphasisColor', '#FF6347')
                                replacement = f'<span tts:color="{emphasis_color}">{replacement}</span>'

                            # Only replace if any styling was applied
                            if replacement != emphasized_text:
                                text = text.replace(emphasized_text, replacement)

            return text
        except Exception as e:
            self.logger.error(f"Error styling questions: {str(e)}")
            return text
    
    def _get_unique_speakers(self) -> List[str]:
        """Get list of unique speakers in the transcript"""
        speakers = set()
        for segment in self.transcript['segments']:
            speakers.add(segment['speaker'])
        return list(speakers) 