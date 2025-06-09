// LinkedinContentApp.jsx - Much simpler!
import React, { useEffect, useRef, useCallback } from 'react';
import { useLinkedInUrlTracking } from './hooks/useLinkedInUrlTracking';
import { useSimpleFormDetector } from './hooks/useSimpleFormDetector';
import { useChat } from './hooks/useChat';
import ContentApp from './ContentApp';
import {SummaryIcon, SalaryIcon, DutiesIcon, ResumeIcon} from './components/Icons'

const LinkedinContentApp = () => {
  const { jobObject,  formattedTitle } = useLinkedInUrlTracking();
  const chatHook = useChat();
  const lastJobId = useRef(null);

  const { focusedElement } = useSimpleFormDetector();

  useEffect(() => {
    if (focusedElement?.label && 
      jobObject && 
      focusedElement?.label !== "Unknown field" && 
      focusedElement?.placeholder !== "Ask me anything..." &&
      !focusedElement?.className?.includes('chat-input')) {

      const getSuggestion = async () => {
        // Very specific prompt for short, direct answers
        const context = `Job: ${JSON.stringify(jobObject, null, 2)}`

        const message = `
          I need to fill this field: "${focusedElement.label}"
          Platform: Linkedin
          Rules: No explanations or additional text, reply in format ans:[your_answer_here]`;
        
        const suggestion = await chatHook.sendMessage(
          context,
          message, 
          { 
            returnReply: true, 
            addToChat: false ,
            addResponseToChat: false,
            useFileContents: true
          }
        );
        
        // Extract answer from ans:[...] format
        let cleanSuggestion = suggestion;
        
        // Look for ans:[...] pattern
        const ansMatch = suggestion.match(/ans:\s*\[([^\]]+)\]/i);
        if (ansMatch) {
          cleanSuggestion = ansMatch[1];
        }
        
        // Additional cleaning
        cleanSuggestion = cleanSuggestion
          .replace(/['"]/g, '') // Remove quotes
          .replace(/^(ans|answer|placeholder|suggestion):\s*/i, '') // Remove prefixes
          .trim()
        
        console.log('🤖 AI suggestion for', focusedElement.label, ':', cleanSuggestion);
        
        // Update placeholder with suggestion (no need to store separately!)
        const actualElement = document.querySelector(`#${focusedElement.id}`);
        if (actualElement) {
          if (!actualElement.getAttribute('data-original-placeholder')) {
            actualElement.setAttribute('data-original-placeholder', actualElement.placeholder || '');
          }
          actualElement.placeholder = `${cleanSuggestion} (Press Tab to auto-fill)`;
        }
      };
      
      getSuggestion();
    }
  }, [focusedElement?.label]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab' && e.target.closest && e.target.placeholder && !e.target.closest('.extension-widget')) {
      // Extract suggestion from placeholder (remove the instruction part)
      const placeholder = e.target.placeholder;
      const cleanSuggestion = placeholder.replace(/\s*\(Press Tab to auto-fill\)$/i, '').trim();
      
      if (cleanSuggestion) {
        e.preventDefault(); // Prevent normal tab behavior
        
        // Store current value before overwriting
        const currentValue = e.target.getAttribute('value') || e.target.value || '';
        e.target.setAttribute('data-original-value', currentValue);
        
        // Fill the field with suggestion
        e.target.value = cleanSuggestion;
        e.target.setAttribute('value', cleanSuggestion);
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
        e.target.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Tab auto-filled input:', cleanSuggestion);
        
        // Move focus to next field
        setTimeout(() => {
          const formElements = Array.from(document.querySelectorAll('input, select, textarea'))
            .filter(el => !el.closest('.extension-widget') && !el.disabled && !el.readOnly);
          
          const currentIndex = formElements.indexOf(e.target);
          const nextField = formElements[currentIndex + 1];
          
          if (nextField) {
            nextField.focus();
          }
        }, 100);
      }
    }
  }, []);

  useEffect(() => {

    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Auto-extract when new job is detected

  const ask = async (question, resumeNeeded = false) => {
    if (!jobObject) {
      chatHook.addAssistantMessage("No job posting found to analyze.");
      return;
    }
  
    console.log('Asking question about job:', question);
    chatHook.addUserMessage(question);
    
    await chatHook.sendMessage(
      `Job Details: ${JSON.stringify(jobObject, null, 2)}`, 
      question, 
      { addToChat: false, useFileContents: resumeNeeded }
    );
  };

// Updated actions array with SVG icons
const linkedinActions = [
  {
    id: 'generate-summary',
    label: 'Summary',
    icon: <SummaryIcon />,
    onClick: () => ask("Provide a summary of this job posting"),
    isVisible: () => !!jobObject,
    className: 'summary-action',
    title: 'Generate a summary of the job'
  },
  {
    id: 'salary-info',
    label: 'Salary',
    icon: <SalaryIcon />,
    onClick: () => ask("What is the salary range for this position?"),
    isVisible: () => !!jobObject,
    className: 'salary-action',
    title: 'Get salary information'
  },
  {
    id: 'job-duties',
    label: 'Duties',
    icon: <DutiesIcon />,
    onClick: () => ask("What are the main duties and responsibilities?"),
    isVisible: () => !!jobObject,
    className: 'duties-action',
    title: 'Learn about job duties'
  },
  {
    id: 'resume-fit',
    label: 'Resume Fit',
    icon: <ResumeIcon />,
    onClick: () => ask("Is my resume a good fit for this job?", true),
    isVisible: () => !!jobObject,
    className: 'resume-fit-action',
    title: 'Check if your resume matches this job'
  }
];

  return (
    <ContentApp 
      title={formattedTitle}
      customChatHook={chatHook}
      customActions={linkedinActions}
    />
  );
};

export default LinkedinContentApp;