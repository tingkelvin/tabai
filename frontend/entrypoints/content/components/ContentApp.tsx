import React, { useState, useRef, useEffect, useCallback } from 'react'
// Components import
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import ChatHistory from './ChatHistory'
import ResizeHandle from './ResizeHandle'
import Notifications from './Notifications'

// Types import
import type { ActionButton, ContentAppProps } from '../types/components'
import { WIDGET_CONFIG, RESIZE_TYPES, MESSAGE_TYPES } from '../utils/constant'
import { useDragAndResize } from '../hooks/useDragAndResize'
import { useChat } from '../hooks/useChat'
import { usePage } from '../hooks/usePage'
import { useAgentChat } from '../hooks/useAgent'
import { AgentAction, PROMPT_TEMPLATES } from '../utils/prompMessages'
import { useAppState } from '../hooks/useAppState'
import { Position } from '../types/widget'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  const widgetRef = useRef<HTMLDivElement>(null)
  const isSendingMessage = useRef<boolean>(false);
  const { state, isInitialized, updateState } = useAppState();
  const { chatMessages, isThinking, useSearch, useAgent, task, actionsExecuted } = state;

  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  })



  // Chat refs
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  // Chat hook now receives state and updaters
  const chatHook = customChatHook ? customChatHook() : useChat();

  const {
    addAssistantMessage: originalAddAssistantMessage,
    sendMessage
  } = chatHook

  // Override addAssistantMessage to also update local state
  const addAssistantMessage = useCallback(async (content: string) => {
    // Call the original function
    await originalAddAssistantMessage(content);
    
    // Also update local state immediately
    const newMessage = {
      id: `msg-${Date.now()}`,
      type: 'ASSISTANT' as const,
      content: content.trim(),
      timestamp: new Date()
    };
    
    updateState({
      chatMessages: [...(state.chatMessages || []), newMessage]
    });
    
    // Scroll to bottom after adding message
    setTimeout(() => {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      }
    }, 100);
  }, [originalAddAssistantMessage, updateState, state.chatMessages]);

  // UI hooks
  const {
    handleMouseDown,
    handleToggle,
    startResize,
    isMinimized,
    setIsMinimized,
    setIconPosition,
    isDragging,
    isResizing,
    currentSize,
    iconPosition
  } = useDragAndResize(widgetRef, {
    widgetSize,
    onSizeChange: setWidgetSize
  })

  // And update your agent hook to handle undefined pageState
  const { processAgentReply, setSelectorMap, isExecuting, cleanup, executeAction } = useAgentChat(chatHook, {
    setIconPosition: (position: Position) => {
      setIconPosition(position)
    },
    onActionExecuted: async (action: AgentAction) => {
      // actionsExecuted.push(action)
      updateState({ actionsExecuted })
    },
    onFinish: async () => {
      console.log("on finish")

      const { pageState, isNew } = await updateAndGetPageState()
      const reply = await sendMessage(task);
      if (!reply) {
        addAssistantMessage(PROMPT_TEMPLATES.PARSING_ERROR);
      } else {
        console.log('🤖 Processing agent response:', reply);

        if (!pageState) {
          console.error("Empty page state")
          return
        }
        processAgentReply(reply);
      }

    }
  });

  const { updateAndGetPageState } = usePage({
    onPageChanged: async (newPageState) => {
      if (!isInitialized) return; // Don't update if not initialized
      const pageStateAsString = newPageState.domSnapshot?.root.clickableElementsToString() || ""
      await updateState({ pageStateAsString })
      if (newPageState.domSnapshot?.selectorMap)
        setSelectorMap(newPageState.domSnapshot?.selectorMap)
      // Handle the page change here
    }
  });

  // Simple workflow state
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState<NodeJS.Timeout | null>(null);
  const [isAutoSearching, setIsAutoSearching] = useState(false);
  const [autoSearchInterval, setAutoSearchInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Ref to store startAutoSearch function
  const startAutoSearchRef = useRef<(() => void) | null>(null);

  // Configure search after login - simplified version
  const configSearchAfterLogin = useCallback(async () => {
    try {
      console.log('🔧 Configuring search settings...');
      
      // Configure Store Type (販售)
      const storeTypeDropdown = document.querySelector("div#div_storetype") as HTMLElement;
      if (storeTypeDropdown) {
        console.log('✅ Found store type dropdown');
        storeTypeDropdown.setAttribute('_val', '0');
        storeTypeDropdown.textContent = '販售';
        storeTypeDropdown.setAttribute('data-value', '0');
        storeTypeDropdown.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Store type configured to 販售');
      }
      
      // Configure Server Selection (西格倫)
      const serverDropdown = document.querySelector("div#div_svr") as HTMLElement;
      if (serverDropdown) {
        console.log('✅ Found server dropdown');
        serverDropdown.setAttribute('_val', '529');
        serverDropdown.textContent = '西格倫';
        serverDropdown.setAttribute('data-value', '529');
        serverDropdown.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('✅ Server configured to 西格倫');
      }
      
      addAssistantMessage("🔧 已配置搜索設定為販售和西格倫伺服器");
      
    } catch (error) {
      console.error('Error configuring search after login:', error);
      addAssistantMessage("❌ 配置搜索設定時發生錯誤");
    }
  }, [addAssistantMessage]);


  // Simple monitoring function
  const checkLoginStatus = useCallback(async () => {
    const { pageState } = await updateAndGetPageState();
    
    if (pageState.domSnapshot?.selectorMap) {
      for (const [highlightIndex, element] of pageState.domSnapshot.selectorMap.entries()) {
        const elementText = element.getAllTextTillNextClickableElement?.() || '';
        
        // If user needs to login, click login button
        if (elementText.includes('請先登入')) {
          console.log('🔐 Found login prompt, clicking login button');
          try {
            const clickAction = { id: highlightIndex, type: 'click' as const };
            await executeAction(clickAction);
            addAssistantMessage("🔐 檢測到登入提示，已自動點擊登入按鈕");
          } catch (error) {
            console.error('Error clicking login button:', error);
          }
          return; // Exit after clicking
        }
        
        // If user is logged in (logout button found), start search
        if (elementText.includes('登出')) {
          console.log('🚪 Found logout button, user is logged in');
          if (!isAutoSearching) {
            addAssistantMessage("✅ 檢測到您已登入，開始配置搜索...");
            await configSearchAfterLogin();
            if (startAutoSearchRef.current) {
              startAutoSearchRef.current();
            }
          }
          return; // Exit after starting search
        }
      }
    }
  }, [updateAndGetPageState, executeAction, addAssistantMessage, configSearchAfterLogin, isAutoSearching]);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    console.log('🔍 Starting login monitoring...');
    setIsMonitoring(true);
    
    const interval = setInterval(checkLoginStatus, 1000);
    setMonitoringInterval(interval);
  }, [isMonitoring, checkLoginStatus, addAssistantMessage]);

  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    console.log('⏹️ Stopping login monitoring...');
    setIsMonitoring(false);
    
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
  }, [isMonitoring, monitoringInterval, addAssistantMessage]);


  // Cleanup monitoring and auto-search on unmount
  useEffect(() => {
    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
      if (autoSearchInterval) {
        clearInterval(autoSearchInterval);
      }
    };
  }, [monitoringInterval, autoSearchInterval]);

  // Search functionality - direct DOM manipulation
  const handleSearch = useCallback(async (searchTerm: string = "征伐隊戒指") => {
    try {
      console.log(`🔍 Starting search for: ${searchTerm}`);
      
      // Find search input field
      const searchInput = document.querySelector("input#txb_KeyWord") as HTMLInputElement;
      if (!searchInput) {
        console.log('❌ Search input not found');
        addAssistantMessage("❌ 找不到搜索輸入框");
        return false;
      }
      
      console.log('✅ Found search input: input#txb_KeyWord');
      
      // Set search term
      console.log(`🔧 Setting search term: ${searchTerm}`);
      searchInput.value = searchTerm;
      
      // Trigger input events
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log(`✅ Search term set: ${searchTerm}`);
      
      // Find and click search button
      const searchButton = document.querySelector("a#a_searchBtn") as HTMLElement;
      if (!searchButton) {
        console.log('❌ Search button not found');
        addAssistantMessage("❌ 找不到搜索按鈕");
        return false;
      }
      
      console.log('✅ Found search button: a#a_searchBtn');
      
      // Click search button
      console.log('🔧 Clicking search button...');
      searchButton.click();
      
      console.log('✅ Search executed');
      addAssistantMessage(`🔍 已搜索: ${searchTerm}`);
      
      return true;
      
    } catch (error) {
      console.error('Error executing search:', error);
      addAssistantMessage("❌ 搜索時發生錯誤");
      return false;
    }
  }, [addAssistantMessage]);


  // Search items management
  const [searchItems, setSearchItems] = useState<string[]>(['征伐隊戒指'])
  const [newSearchItem, setNewSearchItem] = useState('')
  const [showSearchModal, setShowSearchModal] = useState(false)

  // Search item management functions
  const addSearchItem = useCallback(() => {
    if (newSearchItem.trim() && !searchItems.includes(newSearchItem.trim())) {
      setSearchItems(prev => [...prev, newSearchItem.trim()]);
      setNewSearchItem('');
    }
  }, [newSearchItem, searchItems]);

  const removeSearchItem = useCallback((index: number) => {
    setSearchItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllSearchItems = useCallback(() => {
    setSearchItems([]);
  }, []);

  // Auto-search function that runs every 1 minute
  const startAutoSearch = useCallback(() => {
    if (isAutoSearching) return;
    
    console.log('🔄 Starting auto-search every 1 minute...');
    setIsAutoSearching(true);
    addAssistantMessage("🔄 開始自動搜索，每分鐘執行一次");
    
    const interval = setInterval(async () => {
      if (searchItems.length > 0) {
        console.log('🔄 Auto-search executing...');
        addAssistantMessage("🔄 執行自動搜索...");
        
        for (const item of searchItems) {
          try {
            await handleSearch(item);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between searches
          } catch (error) {
            console.error('Error in auto-search:', error);
          }
        }
      }
    }, 60000); // 1 minute = 60000ms
    
    setAutoSearchInterval(interval);
  }, [isAutoSearching, searchItems, handleSearch, addAssistantMessage]);

  // Store the function in ref for use in checkLoginStatus
  useEffect(() => {
    startAutoSearchRef.current = startAutoSearch;
  }, [startAutoSearch]);

  // Simple workflow: start monitoring
  const startWorkflow = useCallback(() => {
    if (searchItems.length === 0) {
      addAssistantMessage("❌ 請先添加搜索項目");
      return;
    }
    
    if (isMonitoring) {
      // If already monitoring, stop everything
      stopMonitoring();
      if (autoSearchInterval) {
        clearInterval(autoSearchInterval);
        setAutoSearchInterval(null);
        setIsAutoSearching(false);
      }
      return;
    }
    
    console.log('🚀 Starting workflow...');
    addAssistantMessage("🚀 開始工作流程：監控登入 → 自動搜索");
    
    // Start monitoring
    setIsMinimized(true)
    startMonitoring();
  }, [searchItems, isMonitoring, startMonitoring, stopMonitoring, autoSearchInterval, addAssistantMessage]);


  return (
    <>
      <div className="content-app">
        <Notifications
          iconPosition={iconPosition}
          chatMessages={chatMessages}
          isMinimized={isMinimized}
          isThinking={state.isThinking}
          onNotificationClick={handleToggle}
        />
        {isMinimized ? (
          <div
            ref={widgetRef}
            className='terminal-widget minimized'
            onMouseDown={handleMouseDown}
          >
            <TerminalIcon isThinking={isThinking} onClick={handleToggle} />
          </div>
        ) : (
          <div
            ref={widgetRef}
            className={`terminal-widget expanded ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
            style={{
              width: `${currentSize.width}px`,
              height: `${currentSize.height}px`,
            }}
          >
            <TerminalHeader
              dragging={isDragging}
              startDrag={handleMouseDown}
              handleMinimize={handleToggle}
              title={title}
            />
            <div className='terminal-content'>
              <div className='chat-section'>
                <ChatHistory
                  chatMessagesRef={chatMessagesRef}
                  chatMessages={chatMessages}
                  isThinking={isThinking}
                />

                {/* Search Configuration Button */}
                <div style={{
                  padding: '12px',
                  borderTop: '1px solid #e0e0e0',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => {
                      setIsMinimized(true)
                      setShowSearchModal(true)
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    Configure Search ({searchItems.length} items)
                  </button>
                  
                  <button
                    onClick={startWorkflow}
                    disabled={searchItems.length === 0}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: isMonitoring ? '#dc3545' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: searchItems.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isMonitoring ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                        Stop Workflow
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                        </svg>
                        Start Workflow
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            {/* Resize handles */}
            <ResizeHandle
              type={RESIZE_TYPES.SOUTHEAST}
              onMouseDown={startResize}
              className="resize-handle resize-se"
            />
            <ResizeHandle
              type={RESIZE_TYPES.SOUTHWEST}
              onMouseDown={startResize}
              className="resize-handle resize-sw"
            />
            <ResizeHandle
              type={RESIZE_TYPES.NORTHEAST}
              onMouseDown={startResize}
              className="resize-handle resize-ne"
            />
            <ResizeHandle
              type={RESIZE_TYPES.NORTHWEST}
              onMouseDown={startResize}
              className="resize-handle resize-nw"
            />
          </div>
        )}
      </div>

      {/* Search Configuration Modal */}
      {showSearchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>
                🔍 Search Configuration
              </h3>
              <button
                onClick={() => {
                  setShowSearchModal(false)
                  setIsMinimized(false)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Add new search item */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                Add Search Item
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newSearchItem}
                  onChange={(e) => setNewSearchItem(e.target.value)}
                  placeholder="Enter search term..."
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && addSearchItem()}
                />
                <button
                  onClick={addSearchItem}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Search items list */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                Search Items ({searchItems.length})
              </label>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                padding: '8px'
              }}>
                {searchItems.map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    marginBottom: '4px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    <span style={{ flex: 1 }}>{item}</span>
                    <button
                      onClick={() => removeSearchItem(index)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginLeft: '8px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {searchItems.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#666', fontSize: '14px', padding: '20px' }}>
                    No search items added yet
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={clearAllSearchItems}
                disabled={searchItems.length === 0}
                style={{
                  padding: '10px 16px',
                  backgroundColor: searchItems.length === 0 ? '#6c757d' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: searchItems.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  setShowSearchModal(false)
                  setIsMinimized(false)
                }}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ContentApp