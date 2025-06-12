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
  const { getAllContentAsString } = useFileContext();
  const { focusedElement, sectionElements } = useSimpleFormDetector();
  const userFilledElementsRef = useRef(new Map());
  const chatHook = useChat();

  useEffect(() => {
    console.log("focusedElement changed")

    let fieldsToAutoFill = []
    let idToDomMap = {}

    if ((focusedElement?.label || focusedElement?.placeholder || focusedElement?.nearestHeader?.text) &&
      focusedElement?.label !== "Unknown field" &&
      focusedElement?.placeholder !== "Ask me anything..." &&
      !focusedElement?.className?.includes('chat-input') &&
      focusedElement?.element) {

      if (userFilledElementsRef.current.has(focusedElement.element)) {
        console.log("user has filled this element")
        return
      }

      console.log("focusedElement", focusedElement.nearestHeader?.text)

      for (const element of sectionElements) {
        if ((element.tagName === 'textarea' || element.tagName === 'input') && element.nearestHeader?.text === focusedElement.nearestHeader?.text) {
          console.log('Found form element, setting placeholder...');
          // Destructure to exclude the 'element' property
          const { element: _, ...elementWithoutDomRef } = element;
          fieldsToAutoFill.push(elementWithoutDomRef);
          idToDomMap[elementWithoutDomRef.id] = element;
        }
      }
      console.log(fieldsToAutoFill)

      const getSuggestion = async () => {
        console.log("getSuggestion")
        if (fieldsToAutoFill.length === 0) return;
        console.log("getSuggestion2")

        // Get resume content
        const fileContents = await getAllContentAsString();
        if (!fileContents) {
          chatHook.addAssistantMessage("Please upload a resume")
          return;
        }

        // Build message with all fields
        let message = `<job>${JSON.stringify(jobObject, null, 2)}</job>`
        message += `<resume>${fileContents}</resume>`
        message += `<fields>${JSON.stringify(fieldsToAutoFill.map(field => ({
          id: field.id || "unknown",
          label: field.label || "unknown",
          header: field.nearestHeader?.text || "unknown",
          value: field.value || "unknown",
          tagName: field.tagName || "unknown",
          required: field.required || false
        })), null, 2)}</fields>`
        message += "<request>job apply, fill in ALL the fields using resume data</request>"
        message += "<rules>Reply with JSON format: [{\"id\": \"field_id\", \"suggestion\": \"your_answer_here\"}] for each field. No explanations.</rules>"

        const suggestion = await chatHook.sendMessage(message);

        try {
          // Parse JSON response
          let suggestions = [];

          // Try to extract JSON from response
          const jsonMatch = suggestion.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            suggestions = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback: try to parse the entire response
            suggestions = JSON.parse(suggestion);
          }

          console.log(suggestions)

          // Update placeholders/values for each field
          suggestions.forEach(({ id, suggestion: fieldSuggestion }) => {
            const fieldElement = fieldsToAutoFill.find(field => field.id === id);
            const domElement = idToDomMap[id];
            console.log("find", fieldElement, domElement)
            if (fieldElement && domElement) {
              // Clean the suggestion
              const cleanSuggestion = fieldSuggestion
                .replace(/['"]/g, '')
                .trim();

              // Handle textarea vs input differently
              if (fieldElement.tagName === 'textarea') {
                // For textarea, set the value directly
                domElement.element.placeholder = cleanSuggestion;
              } else {
                domElement.element.placeholder = `${cleanSuggestion} (Press Tab to auto-fill)`;
              }

              console.log('🤖 AI suggestion for', fieldElement.label || fieldElement.nearestHeader?.text, ':', cleanSuggestion);

            }
          });

        } catch (error) {
          console.error('Error parsing AI suggestions:', error);
        }
      };

      getSuggestion();
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

        console.log("focusedElement?.id", e.target)

        userFilledElementsRef.current.set(e.target, {
          value: cleanSuggestion,
          timestamp: new Date(),
          agreedByTab: true
        });

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