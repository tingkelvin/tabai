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
import { getClickableElementsFromDomTree, removeHighlights } from '../services/DomTreeService'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  const widgetRef = useRef<HTMLDivElement>(null)
  const isSendingMessage = useRef<boolean>(false);
  const { state, isInitialized, updateState } = useAppState();
  const { chatMessages, isThinking, useSearch, useAgent, task, actionsExecuted } = state;

  const [widgetSize, setWidgetSize] = useState({
    width: WIDGET_CONFIG.DEFAULT_WIDTH,
    height: WIDGET_CONFIG.DEFAULT_HEIGHT,
  })

  // Highlight state
  const [isHighlighting, setIsHighlighting] = useState(false)


  // Chat refs
  const chatMessagesRef = useRef<HTMLDivElement>(null)

  // Chat hook now receives state and updaters
  const chatHook = customChatHook ? customChatHook() : useChat();

  const {
    addAssistantMessage,
    sendMessage
  } = chatHook

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

  const { getElementAtCoordinate, updateAndGetPageState } = usePage({
    onPageChanged: async (newPageState) => {
      if (!isInitialized) return; // Don't update if not initialized
      const pageStateAsString = newPageState.domSnapshot?.root.clickableElementsToString() || ""
      await updateState({ pageStateAsString })
      if (newPageState.domSnapshot?.selectorMap)
        setSelectorMap(newPageState.domSnapshot?.selectorMap)
        console.log("pageStateAsString", newPageState)

      // Handle the page change here
    }
  });

  // Throttle function to limit how often updateAndGetPageState is called
  const throttle = useCallback((func: Function, limit: number) => {
    let inThrottle: boolean;
    return function (this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }, []);

  useEffect(() => {
    const handlePageStateChange = async () => {
      console.log("handlePageState", task, useAgent)
      const { pageState, isNew } = await updateAndGetPageState()
      
      // Search for login prompt button
      if (pageState.domSnapshot?.selectorMap) {
        for (const [highlightIndex, element] of pageState.domSnapshot.selectorMap.entries()) {
        const elementText = element.getAllTextTillNextClickableElement?.() || '';
        
        // Check if this element contains the login prompt text
        if (elementText.includes('請先登入')) {
          console.log('Found login prompt button:', element);
          
          // Add assistant message asking user to log in first
          addAssistantMessage("請先登入");
          
          // Click the login button using agent executeAction
          try {
            console.log('Clicking login button using agent...');
            const clickAction = {
              id: highlightIndex,
              type: 'click' as const
            };
            
            const success = await executeAction(clickAction);
            if (!success) {
              console.log('Could not click login button via agent');
            }
          } catch (error) {
            console.error('Error clicking login button:', error);
          }
          
          // Break out of loop since we found what we're looking for
          break;
        }
        }
      }
    };
    if (isInitialized)
      handlePageStateChange();
  }, [isInitialized])

  // Dynamic login/logout state monitoring
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loginStateChecked, setLoginStateChecked] = useState(false);
  const [isConfiguringSearch, setIsConfiguringSearch] = useState(false);
  const [searchConfigured, setSearchConfigured] = useState(false);

  useEffect(() => {
    const checkLoginStatus = async () => {
      // Skip login check if search configuration is running
      if (isConfiguringSearch) {
        console.log("⏸️ Skipping login check - search configuration in progress");
        return;
      }
      
      console.log("checkLoginStatus - current state:", isLoggedIn);
      const { pageState } = await updateAndGetPageState();
      
      if (pageState.domSnapshot?.selectorMap) {
        let foundLoginPrompt = false;
        let foundLogoutButton = false;
        
        for (const [highlightIndex, element] of pageState.domSnapshot.selectorMap.entries()) {
          const elementText = element.getAllTextTillNextClickableElement?.() || '';
          
          // Check for login prompt
          if (elementText.includes('請先登入')) {
            foundLoginPrompt = true;
            console.log('🔐 Found login prompt');
          }
          
          // Check for logout button
          if (elementText.includes('登出')) {
            foundLogoutButton = true;
            console.log('🚪 Found logout button');
          }
        }
        
        // Determine login status
        let newLoginStatus: boolean;
        if (foundLoginPrompt) {
          newLoginStatus = false; // User needs to login
        } else if (foundLogoutButton) {
          newLoginStatus = true; // User is logged in
        } else {
          // Neither found - keep current state or assume logged out
          newLoginStatus = isLoggedIn || false;
        }
        
        // Handle state changes
        if (isLoggedIn === null) {
          // Initial state detection
          setIsLoggedIn(newLoginStatus);
          setLoginStateChecked(true);
          console.log('🎯 Initial login status detected:', newLoginStatus);
          
          if (newLoginStatus) {
            addAssistantMessage("✅ 您已經登入，我可以開始幫助您了！");
            // Configure search after login
            await configSearchAfterLogin();
            setSearchConfigured(true);
          } else {
            addAssistantMessage("🔐 請先登入以繼續使用服務。");
          }
        } else if (isLoggedIn !== newLoginStatus) {
          // State change detected
          setIsLoggedIn(newLoginStatus);
          console.log('🔄 Login status changed:', newLoginStatus);
          
          if (newLoginStatus) {
            // User just logged in
            addAssistantMessage("🎉 登入成功！我現在可以幫助您了。");
            
            // Configure search after login
            await configSearchAfterLogin();
            setSearchConfigured(true);
          } else {
            // User just logged out
            addAssistantMessage("👋 您已登出，請重新登入以繼續使用。");
            setSearchConfigured(false);
          }
        } else if (isLoggedIn === true && !searchConfigured) {
          // User is logged in but search not configured yet - try to configure
          console.log('🔄 User is logged in but search not configured - attempting configuration');
          await configSearchAfterLogin();
          setSearchConfigured(true);
        }
      }
    };

    // Only start monitoring when initialized
    if (isInitialized) {
      const interval = setInterval(checkLoginStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [isInitialized, isLoggedIn, updateAndGetPageState, addAssistantMessage, isConfiguringSearch, searchConfigured]);

  // Configure search after login - use direct DOM manipulation for both store type and server
  const configSearchAfterLogin = useCallback(async () => {
    try {
      console.log('🔧 Configuring search after login using direct DOM manipulation...');
      setIsConfiguringSearch(true);
      
      // Configure Store Type (販售)
      const storeTypeDropdownSelectors = [
        "div#div_storetype",
        "div.default__option[id='div_storetype']",
        "[id='div_storetype']"
      ];
      
      let storeTypeDropdown = null;
      for (const selector of storeTypeDropdownSelectors) {
        try {
          const element = document.querySelector(selector) as HTMLElement;
          if (element && element.offsetParent !== null) {
            storeTypeDropdown = element;
            console.log(`✅ Found store type dropdown: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Store type selector ${selector} failed:`, e);
          continue;
        }
      }
      
      if (storeTypeDropdown) {
        console.log('🔧 Setting store type to 販售 (value: 0)');
        storeTypeDropdown.setAttribute('_val', '0');
        
        const displayElement = storeTypeDropdown.querySelector('.default__single-value') || 
                             storeTypeDropdown.querySelector('.default__placeholder') ||
                             storeTypeDropdown;
        
        if (displayElement) {
          displayElement.textContent = '販售';
          displayElement.setAttribute('data-value', '0');
        }
        
        const changeEvent = new Event('change', { bubbles: true });
        storeTypeDropdown.dispatchEvent(changeEvent);
        
        console.log('✅ Store type configured to 販售');
      } else {
        console.log('⚠️ Store type dropdown not found');
      }
      
      // Configure Server Selection (西格倫)
      const serverDropdownSelectors = [
        "div#div_svr",
        "div.default__option[id='div_svr']",
        "[id='div_svr']"
      ];
      
      let serverDropdown = null;
      for (const selector of serverDropdownSelectors) {
        try {
          const element = document.querySelector(selector) as HTMLElement;
          if (element && element.offsetParent !== null) {
            serverDropdown = element;
            console.log(`✅ Found server dropdown: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Server selector ${selector} failed:`, e);
          continue;
        }
      }
      
      if (serverDropdown) {
        console.log('🔧 Setting server to 西格倫 (value: 529)');
        serverDropdown.setAttribute('_val', '529');
        
        const displayElement = serverDropdown.querySelector('.default__single-value') || 
                             serverDropdown.querySelector('.default__placeholder') ||
                             serverDropdown;
        
        if (displayElement) {
          displayElement.textContent = '西格倫';
          displayElement.setAttribute('data-value', '529');
        }
        
        const changeEvent = new Event('change', { bubbles: true });
        serverDropdown.dispatchEvent(changeEvent);
        
        console.log('✅ Server configured to 西格倫');
      } else {
        console.log('⚠️ Server dropdown not found');
      }
      
      addAssistantMessage("🔧 已配置搜索設定為販售和西格倫伺服器");
      
    } catch (error) {
      console.error('Error configuring search after login:', error);
      addAssistantMessage("❌ 配置搜索設定時發生錯誤");
    } finally {
      setIsConfiguringSearch(false);
    }
  }, [addAssistantMessage]);

  // Search functionality - direct DOM manipulation
  const handleSearch = useCallback(async (searchTerm: string = "征伐隊戒指") => {
    try {
      console.log(`🔍 Starting search for: ${searchTerm}`);
      
      // Find search input field
      const searchInputSelectors = [
        "input#txb_KeyWord",
        "input[placeholder='請輸入道具關鍵字']",
        "input[type='text'][id='txb_KeyWord']"
      ];
      
      let searchInput = null;
      for (const selector of searchInputSelectors) {
        try {
          const element = document.querySelector(selector) as HTMLInputElement;
          if (element && element.offsetParent !== null) {
            searchInput = element;
            console.log(`✅ Found search input: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Search input selector ${selector} failed:`, e);
          continue;
        }
      }
      
      if (!searchInput) {
        console.log('❌ Search input not found');
        addAssistantMessage("❌ 找不到搜索輸入框");
        return false;
      }
      
      // Clear and fill search input
      console.log(`🔧 Setting search term: ${searchTerm}`);
      searchInput.value = '';
      searchInput.value = searchTerm;
      
      // Trigger input events
      const inputEvent = new Event('input', { bubbles: true });
      searchInput.dispatchEvent(inputEvent);
      
      const changeEvent = new Event('change', { bubbles: true });
      searchInput.dispatchEvent(changeEvent);
      
      console.log(`✅ Search term set: ${searchTerm}`);
      
      // Find and click search button
      const searchButtonSelectors = [
        "a#a_searchBtn",
        "a[href='history']",
        "a:contains('查詢')"
      ];
      
      let searchButton = null;
      for (const selector of searchButtonSelectors) {
        try {
          const element = document.querySelector(selector) as HTMLElement;
          if (element && element.offsetParent !== null) {
            searchButton = element;
            console.log(`✅ Found search button: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`Search button selector ${selector} failed:`, e);
          continue;
        }
      }
      
      if (!searchButton) {
        console.log('❌ Search button not found');
        addAssistantMessage("❌ 找不到搜索按鈕");
        return false;
      }
      
      // Click search button
      console.log('🔧 Clicking search button...');
      searchButton.click();
      
      // Trigger click event
      const clickEvent = new Event('click', { bubbles: true });
      searchButton.dispatchEvent(clickEvent);
      
      console.log('✅ Search executed');
      addAssistantMessage(`🔍 已搜索: ${searchTerm}`);
      
      return true;
      
    } catch (error) {
      console.error('Error executing search:', error);
      addAssistantMessage("❌ 搜索時發生錯誤");
      return false;
    }
  }, [addAssistantMessage]);

  // Highlight clickable elements toggle
  const toggleHighlightClickables = useCallback(async () => {
    try {
      if (isHighlighting) {
        // Remove highlights
        console.log('Removing highlights...');
        await removeHighlights();
        setIsHighlighting(false);
        console.log('Highlights removed');
      } else {
        // Add highlights
        console.log('Adding highlights...');
        const result = await getClickableElementsFromDomTree(true, -1, 0, false);
        console.log('Highlight result:', result);
        setIsHighlighting(true);
        console.log('Clickable elements highlighted');
      }
    } catch (error) {
      console.error('Error toggling highlights:', error);
    }
  }, [isHighlighting]);



  // Search items management
  const [searchItems, setSearchItems] = useState<string[]>(['征伐隊戒指'])
  const [newSearchItem, setNewSearchItem] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<string[]>([])
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

  // Execute all searches sequentially
  const executeAllSearches = useCallback(async () => {
    if (searchItems.length === 0) return;
    
    setIsSearching(true);
    setCurrentSearchIndex(0);
    setSearchResults([]);
    
    // Add initial message
    addAssistantMessage(`🔍 Starting search for ${searchItems.length} items...`);
    
    for (let i = 0; i < searchItems.length; i++) {
      const item = searchItems[i];
      setCurrentSearchIndex(i);
      
      // Add search start message
      addAssistantMessage(`🔍 Searching for: ${item} (${i + 1}/${searchItems.length})`);
      
      try {
        // Execute the search
        const success = await handleSearch(item);
        
        if (success) {
          addAssistantMessage(`✅ Search completed for: ${item}`);
          setSearchResults(prev => [...prev, item]);
        } else {
          addAssistantMessage(`❌ Search failed for: ${item}`);
        }
      } catch (error) {
        addAssistantMessage(`❌ Error searching for: ${item}`);
      }
      
      // Wait between searches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Add completion message
    addAssistantMessage(`🎉 All searches completed! Found ${searchResults.length} results.`);
    
    setIsSearching(false);
  }, [searchItems, handleSearch, searchResults, addAssistantMessage]);

  const highlightButton: ActionButton = {
    id: 'highlight',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    label: 'Highlight',
    onClick: toggleHighlightClickables,
    title: isHighlighting ? 'Remove clickable highlights' : 'Highlight clickable elements',
    className: isHighlighting ? 'active' : '',
  }

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
                    onClick={() => setShowSearchModal(true)}
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
                    onClick={executeAllSearches}
                    disabled={searchItems.length === 0 || isSearching}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: isSearching ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: isSearching ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    {isSearching ? `Searching... (${currentSearchIndex + 1}/${searchItems.length})` : 'Run Searches'}
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
                onClick={() => setShowSearchModal(false)}
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
                onClick={() => setShowSearchModal(false)}
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