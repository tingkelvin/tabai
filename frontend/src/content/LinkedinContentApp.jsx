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
  const resume = "Martin Los ✉️martinlos@icloud.com 📞049999991 linkedin.com/in/kelvin-ting-relu/ github.com/tingkelvin EXPERIENCE Google Jul 2024 – Present Software Engineer (Machine Learning Team) Adelaide, Australia Rewrote and optimized performance-critical C++ components of the object detection pipeline for deployment on Hailo AI chips. Integrated Apache Kafka for scalable, fault-tolerant streaming of inference metadata between pipeline components and downstream systems. Designed and implemented a post-processing backend using Spring Boot and PostgreSQL, with Redis caching and data retention policies to support high-throughput inference data handling. Developed a Flask-based control interface to orchestrate and manage real-time GStreamer pipelines for live video stream processing. Microsoft Jan 2023 – Jul 2024 Software Engineer (Tactical Communication Team) Adelaide, Australia Led development of Codan Xtend mobile applications for iOS and Android platforms. Implemented cross-platform features ensuring consistent user experience Achieved 4+ star ratings on both App Store and Google Play. Engineered a high-performance Python testing library for military communication systems. Accelerated testing procedures by 90%, resulting in $100,000 annual cost savings. Microsoft Student Accelerator March 2022 – Oct. 2022 Volunteer (Tech Team) Adelaide, Australia Organized technical events as part of an 8-member team for the Microsoft Student Accelerator 2022. Delivered a workshop on creating art images using Generative Adversarial Networks (GANs). University of Adelaide Nov. 2021 – Feb. 2022 Research Assistant Adelaide, Australia Co-authored a literature survey on the reproducibility of machine learning models in cybersecurity. Reproducing machine learning models focused on anomaly detection. Microsoft April 2021 – Oct. 2021 Microsoft Student Accelerator Australia Completed a year-long boot camp, earning the AZ-900 Azure Cloud Fundamentals certificate. Implemented two projects (Machine Learning and IoT) in Azure Cloud, ranking 2nd out of 1,528 participants with a score of 333/340. V6 Technology Jul. 2020 – Sep. 2020 Full Stack Developer Adelaide, Australia Developed a web application for distributing questionnaires to mobile devices, creating a responsive front-end interface that improved questionnaire distribution speed by 78%. PERSONAL PROJECTS tubetor.xyz May. 2025 – Current This full stack project on the Solana blockchain offers real-time token price updates and multi-wallet tracking capabilities. It aggregates wallet data to provide comprehensive portfolio visibility and performance metrics. Users can execute trades through direct Raydium integration for token swaps. Built with TypeScript, React, and Python, the system delivers a unified platform for Solana traders to monitor and manage their assets efficiently. SolanaRpCpp March. 2025 – Current Contributed to a modern C++ library for Solana JSON-RPC communication by refactoring core components to eliminate virtual functions using CRTP and C++20 concepts for improved performance and type safety. Implemented efficient HTTP request handling and WebSocket-based subscription support using Boost.Asio for asynchronous I/O. Optimized network performance by introducing request pooling and concurrent task execution with multithreading to reduce latency and increase throughput. MoonMap Jan. 2025 – Current This full stack project on the Solana blockchain offers real-time token price updates and multi-wallet tracking capabilities. It aggregates wallet data to provide comprehensive portfolio visibility and performance metrics. Users can execute trades through direct Raydium integration for token swaps. Built with TypeScript, React, and Python, the system delivers a unified platform for Solana traders to monitor and manage their assets efficiently. Cowboys & Aliens Aug. 2022 – Dec. 2022 Collaborated with a team of 9 to create a software system for testing distributed decision-making algorithms. Experimented with two different distributed decision-making methods, Paxos and Raft. Compared the effectiveness of each algorithm by stimulating aliens invading the cowboy’s scenario, where the cowboys communicated through a distributed algorithm. EDUCATION University of Adelaide Mar. 2021 – Dec 2022 Master of Innovation and Computing Adelaide, Australia Chinese University of Hong Kong Sep. 2018 – Sep. 2020 Bachelor of Information Engineering Hong Kong, China SKILLS & INTERESTS Skills: C++/C · Python · Java; Machine Learning: PyTorch · Tensorflow; Web: Flask · MERN Stack Intersets: Piano, Runner, Exercise"

  const { focusedElement } = useSimpleFormDetector();

  useEffect(() => {
    if (focusedElement?.label && 
      jobObject && 
      focusedElement?.label !== "Unknown field" && 
      focusedElement?.placeholder !== "Ask me anything..." &&
      !focusedElement?.className?.includes('chat-input')) {

      const getSuggestion = async () => {
        // Very specific prompt for short, direct answers
        const prompt = `
  Job: ${JSON.stringify(jobObject, null, 2)}
  Resume: ${resume}
  I need to fill this field: "${focusedElement.label}"
  Platform: Linkedin
  Rules: No explanations or additional text, reply in format ans:[your_answer_here]`;
        
        const suggestion = await chatHook.sendMessage(prompt, { 
          returnReply: true, 
          addToChat: false 
        });
        
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

  const ask = useCallback(async (question, resumeNeeded = false) => {
    if (!jobObject) {
      chatHook.addAssistantMessage("No job posting found to analyze.");
      return;
    }
  
    console.log('Asking question about job:', question);
    chatHook.addUserMessage(question);
    
    // Fix: Proper conditional string building
    const summaryPrompt = `${question} ${resumeNeeded ? `Resume: ${resume}` : ""} Job Details: ${JSON.stringify(jobObject, null, 2)}`;
    
    // Fix: Await the response and manually add to chat
    await chatHook.sendMessage(summaryPrompt, { addToChat: false });

  }, [jobObject, chatHook, resume]);
  

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