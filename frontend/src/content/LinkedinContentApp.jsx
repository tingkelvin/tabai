// LinkedinContentApp.jsx - Much simpler!
import React, { useEffect, useRef, useCallback } from 'react';
import { useLinkedInUrlTracking } from './hooks/useLinkedInUrlTracking';
import { useSimpleFormDetector } from './hooks/useSimpleFormDetector';
import { useChat } from './hooks/useChat';
import ContentApp from './ContentApp';
import { SummaryIcon, SalaryIcon, DutiesIcon, ResumeIcon } from './components/Icons'
import { useFileContext } from './contexts/FileProvider';

const LinkedinContentApp = () => {
  const { jobObject, formattedTitle } = useLinkedInUrlTracking();
  const chatHook = useChat();
  const lastJobId = useRef(null);
  const { getAllContentAsString, uploadedFiles } = useFileContext();

  const { focusedElement, sectionElements } = useSimpleFormDetector();

  useEffect(() => {
    console.log("focusedElement changed")

    let fieldsToAutoFill = []
    if ((focusedElement?.label || focusedElement?.placeholder) &&
      focusedElement?.label !== "Unknown field" &&
      focusedElement?.placeholder !== "Ask me anything..." &&
      !focusedElement?.className?.includes('chat-input')) {

      for (const element of sectionElements) {
        if (element.tagName === 'textarea' || element.tagName === 'input') {
          console.log('Found textarea, setting placeholder...');
          element.element.placeholder = "Please describe your experience and why you're interested in this position...";

          // Destructure to exclude the 'element' property
          const { element: _, ...elementWithoutDomRef } = element;
          fieldsToAutoFill.push(elementWithoutDomRef);
        }
      }

      console.log(fieldsToAutoFill)
    }
  }, [focusedElement, sectionElements]);

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

  const ask = async (question, resumeNeeded = false, ansOnly = false) => {
    if (!jobObject) {
      chatHook.addAssistantMessage("No job posting found to analyze.");
      return;
    }

    console.log('Asking question about job:', question);
    chatHook.addUserMessage(question);

    try {
      const jobContext = `${JSON.stringify(jobObject, null, 2)}`;
      const fileContents = await getAllContentAsString();

      if (resumeNeeded && (!fileContents || !fileContents.trim())) {
        chatHook.addAssistantMessage("Please upload your resume first.");
        return;
      }

      let message = `<job>${jobContext}</job>`
      message += "<platform>linkedin<</platform>"
      message += `<resume>${resumeNeeded && fileContents ? `Resume: ${fileContents}` : ''} </resume>`
      message += `<request>${question}</request>`
      if (ansOnly) message += "<rules>no other text</rules>"
      console.log('🚀 Message:', message);
      const response = await chatHook.sendMessage(message);

      if (response) {
        chatHook.addAssistantMessage(response);
        console.log('🚀 Response:', response);
      }
    } catch (error) {
      console.error('Error processing request:', error);
      chatHook.addAssistantMessage("Sorry, I encountered an error while processing your request. Please try again.");
    }
  };

  // Updated actions array with SVG icons
  const linkedinActions = [
    {
      id: 'generate-cover-letter',
      label: 'Cover letter',
      icon: <SummaryIcon />,
      onClick: () => ask("cover letter", true, true),
      isVisible: () => !!jobObject,
      className: 'cover-letter-action',
      title: 'Generate a cover letter of the job'
    },
    {
      id: 'generate-summary',
      label: 'Summary',
      icon: <SummaryIcon />,
      onClick: () => ask("summary"),
      isVisible: () => !!jobObject,
      className: 'summary-action',
      title: 'Generate a summary of the job'
    },
    {
      id: 'salary-info',
      label: 'Salary',
      icon: <SalaryIcon />,
      onClick: () => ask("salary?"),
      isVisible: () => !!jobObject,
      className: 'salary-action',
      title: 'Get salary information'
    },
    {
      id: 'job-duties',
      label: 'Duties',
      icon: <DutiesIcon />,
      onClick: () => ask("duties?"),
      isVisible: () => !!jobObject,
      className: 'duties-action',
      title: 'Learn about job duties'
    },
    {
      id: 'resume-fit',
      label: 'Resume Fit',
      icon: <ResumeIcon />,
      onClick: () => ask("resume fit?", true),
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