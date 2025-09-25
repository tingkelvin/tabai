import React, { useState, useRef, useEffect, useCallback } from 'react'
// Components import
import TerminalIcon from './TerminalIcon'
import TerminalHeader from './TerminalHeader'
import ResizeHandle from './ResizeHandle'
import Notifications from './Notifications'

// Types import
import type { ContentAppProps } from '../types/components'
import { WIDGET_CONFIG, RESIZE_TYPES, MESSAGE_TYPES } from '../utils/constant'
import { useDragAndResize } from '../hooks/useDragAndResize'
import { useChat } from '../hooks/useChat'
import { usePage } from '../hooks/usePage'
import { useAppState } from '../hooks/useAppState'
import { PlusIcon,  RemoveIcon} from './Icons'

const ContentApp: React.FC<ContentAppProps> = ({ customChatHook, title = '' }) => {
  const widgetRef = useRef<HTMLDivElement>(null)
  const { state, updateState } = useAppState();
  const { chatMessages, isThinking, useSearch, useAgent, task, actionsExecuted } = state;

  // Search state management to prevent race conditions
  const currentSearchRef = useRef<{
    searchTerm: string;
    notes: [string, string, string];
    searchItemIndex?: number;
    cancelled: boolean;
    timeoutId?: NodeJS.Timeout;
  } | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to cancel current search
  const cancelCurrentSearch = useCallback(() => {
    if (currentSearchRef.current) {
      currentSearchRef.current.cancelled = true;
      
      // Clear any pending timeouts (legacy cleanup)
      if (currentSearchRef.current.timeoutId) {
        clearTimeout(currentSearchRef.current.timeoutId);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      // Note: Don't set currentSearchRef.current = null here
      // Let the search function handle cleanup when it detects cancellation
    }
  }, []);

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
    isDragging,
    isResizing,
    currentSize,
    iconPosition
  } = useDragAndResize(widgetRef, {
    widgetSize,
    onSizeChange: setWidgetSize
  })

  const { updateAndGetPageState } = usePage();

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
      // Configure Store Type (販售)
      const storeTypeDropdown = document.querySelector("div#div_storetype") as HTMLElement;
      if (storeTypeDropdown) {
        storeTypeDropdown.setAttribute('_val', '0');
        storeTypeDropdown.textContent = '販售';
        storeTypeDropdown.setAttribute('data-value', '0');
        storeTypeDropdown.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Configure Server Selection (西格倫)
      const serverDropdown = document.querySelector("div#div_svr") as HTMLElement;
      if (serverDropdown) {
        serverDropdown.setAttribute('_val', '529');
        serverDropdown.textContent = '西格倫';
        serverDropdown.setAttribute('data-value', '529');
        serverDropdown.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      addAssistantMessage("🔧 已配置搜索設定為販售和西格倫伺服器");
      
    } catch (error) {
      addAssistantMessage("❌ 配置搜索設定時發生錯誤");
    }
  }, [addAssistantMessage]);


  // Check and click login button function
  const checkAndClickLoginButton = useCallback(async () => {
    try {
      // Use the working selector
      const buttonElement = document.querySelector("a[href='history'][id='a_searchBtn']") as HTMLElement;
      
      if (!buttonElement) {
        return { buttonFound: false, buttonText: '' };
      }
      
      const buttonText = buttonElement.textContent?.trim() || '';
      
      // Click the button
      buttonElement.click();
      
      return { buttonFound: true, buttonText };
      
    } catch (error) {
      return { buttonFound: false, buttonText: '' };
    }
  }, []);

  // Simple monitoring function
  const checkLoginStatus = useCallback(async () => {
    const { pageState } = await updateAndGetPageState();
    
    if (pageState.domSnapshot?.selectorMap) {
      for (const [highlightIndex, element] of pageState.domSnapshot.selectorMap.entries()) {
        const elementText = element.getAllTextTillNextClickableElement?.() || '';
        
        // If user needs to login, check and click login button
        if (elementText.includes('請先登入')) {
          try {
            const { buttonFound, buttonText } = await checkAndClickLoginButton();
            if (buttonFound) {
              addAssistantMessage(`🔐 檢測到登入提示，已自動點擊登入按鈕: "${buttonText}"`);
            } 
          } catch (error) {
            // Error clicking login button
          }
          return; // Exit after clicking
        }
        
        // If user is logged in (logout button found), start search
        if (elementText.includes('登出')) {
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
  }, [updateAndGetPageState, addAssistantMessage, configSearchAfterLogin, isAutoSearching, checkAndClickLoginButton]);

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    const interval = setInterval(checkLoginStatus, 1000);
    setMonitoringInterval(interval);
  }, [isMonitoring, checkLoginStatus, addAssistantMessage]);

  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
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
  const handleSearch = useCallback(async (searchTerm: string = "征伐隊戒指", notes: [string, string, string] = ['', '', ''], searchItemIndex?: number) => {
    try {
      const timestamp = new Date();
      setLastSearchTime(timestamp);
      
      // Cancel any existing search
      cancelCurrentSearch();
      
      // Set up new search state
      currentSearchRef.current = {
        searchTerm,
        notes,
        searchItemIndex,
        cancelled: false
      };
      
      // Log the search attempt
      const logMessage = `🔍 Searching for: "${searchTerm}" at ${timestamp.toLocaleTimeString()}`;
      setSearchLogs(prev => [...prev, logMessage]);
      
      // Find search input field
      const searchInput = document.querySelector("input#txb_KeyWord") as HTMLInputElement;
      if (!searchInput) {
        const errorLog = `❌ Search input not found at ${timestamp.toLocaleTimeString()}`;
        setSearchLogs(prev => [...prev, errorLog]);
        addAssistantMessage("❌ 找不到搜索輸入框");
        currentSearchRef.current = null;
        return false;
      }
      
      // Set search term
      searchInput.value = searchTerm;
      
      // Trigger input events
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Find and click search button
      const searchButton = document.querySelector("a#a_searchBtn") as HTMLElement;
      if (!searchButton) {
        const errorLog = `❌ Search button not found at ${timestamp.toLocaleTimeString()}`;
        setSearchLogs(prev => [...prev, errorLog]);
        addAssistantMessage("❌ 找不到搜索按鈕");
        return false;
      }
      
      // Click search button
      searchButton.click();
      
      const successLog = `✅ Search executed successfully for "${searchTerm}" at ${timestamp.toLocaleTimeString()}`;
      setSearchLogs(prev => [...prev, successLog]);
      addAssistantMessage(`🔍 已搜索: ${searchTerm}`);
      
      // Wait for results to load, then parse them with pagination
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if search was cancelled during the wait
      if (!currentSearchRef.current || currentSearchRef.current.cancelled) {
        return false;
      }
      
      // Use the passed notes directly
      
      // Construct the full search term with notes if available
      let fullSearchTerm = searchTerm;
      if (notes.some(note => note.trim())) {
        const activeNotes = notes.filter(note => note.trim()).join(' ');
        fullSearchTerm = `${searchTerm} ${activeNotes}`.trim();
      }
      
      // Execute pagination and wait for completion
      const searchResult = await searchWithPagination(fullSearchTerm, notes, searchItemIndex);
      
      return searchResult;
      
    } catch (error) {
      const errorLog = `❌ Search error: ${error} at ${new Date().toLocaleTimeString()}`;
      setSearchLogs(prev => [...prev, errorLog]);
      addAssistantMessage("❌ 搜索時發生錯誤");
      return false;
    }
  }, [addAssistantMessage]);

  // Parse search results function
  const parseSearchResults = useCallback(async (searchTerm: string = "征伐隊戒指", notes: [string, string, string] = ['', '', ''], searchItemIndex?: number) => {
    try {
      const timestamp = new Date();
      
      // Log the parsing attempt
      const logMessage = `🔍 Parsing search results for "${searchTerm}" at ${timestamp.toLocaleTimeString()}`;
      setSearchLogs(prev => [...prev, logMessage]);
      
      // Find result table using the working selector
      const resultTable = document.querySelector("table tbody#_tbody") as HTMLElement;
      
      if (!resultTable) {
        const errorLog = `❌ Result table not found at ${timestamp.toLocaleTimeString()}`;
        setSearchLogs(prev => [...prev, errorLog]);
        addAssistantMessage("❌ 找不到搜索結果表格");
        return false;
      }
      
      // Parse table rows
      try {
        const rows = resultTable.querySelectorAll("tr");
        
        if (rows.length === 0) {
          const warningLog = `⚠️ No result rows found at ${timestamp.toLocaleTimeString()}`;
          setSearchLogs(prev => [...prev, warningLog]);
          addAssistantMessage("⚠️ 沒有找到任何搜索結果");
          return false;
        }
        
        // Parse each row, find first matching item
        let firstItemFound = false;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          try {
            // Extract fields
            const shopNameCell = row.querySelector("td.shopName") as HTMLElement;
            const itemNameCell = row.querySelector("td.itemName") as HTMLElement;
            const slotCell = row.querySelector("td.slot") as HTMLElement;
            const priceCell = row.querySelector("td.price") as HTMLElement;
            const quantityCell = row.querySelector("td.quantity") as HTMLElement;
            const buySellCell = row.querySelector("td.buySell") as HTMLElement;
            
            if (!shopNameCell || !itemNameCell || !slotCell || !priceCell || !quantityCell || !buySellCell) {
              continue;
            }
            
            // Get text content
            const shopName = shopNameCell.textContent?.trim() || '';
            const itemName = itemNameCell.textContent?.trim() || '';
            const slot = slotCell.textContent?.trim() || '';
            const price = priceCell.textContent?.trim() || '';
            const quantity = quantityCell.textContent?.trim() || '';
            const buySell = buySellCell.textContent?.trim() || '';
            
            // Get SSI attribute (shop identifier)
            const ssi = shopNameCell.getAttribute('ssi') || 'N/A';
            
            // Check if matches search term with 字條 logic
            let matchFound = false;
            
            // Split the full search term into parts
            const searchParts = searchTerm.split(' ').filter(part => part.trim());
            const baseName = searchParts[0]; // Get base name (e.g., "征伐隊戒指")
            const additionalTerms = searchParts.slice(1); // Get additional terms (e.g., ["STR+1"])
   
            // First check if the item name contains the base name
            const hasBaseName = itemName.includes(baseName);
            
            if (hasBaseName) {
              if (additionalTerms.length > 0) {
                // If we have additional terms (like "STR+1"), check if ALL terms are present
                const hasAllTerms = additionalTerms.every(term => itemName.includes(term));
                matchFound = hasAllTerms;
              } else {
                matchFound = true;
              }
            }
            
            if (matchFound) {
              const resultTimestamp = new Date().toLocaleString();
              
              // Add to search results for specific item
              const newResult = {
                itemName,
                price,
                shopName,
                slot,
                quantity,
                buySell,
                ssi,
                timestamp: resultTimestamp
              };
              
              // Update the specific search item's results
              if (searchItemIndex !== undefined) {
                setSearchItems(prev => prev.map((item, index) => 
                  index === searchItemIndex 
                    ? { 
                        ...item, 
                        results: [newResult], // Replace with new result
                        lastSearchTime: timestamp
                      }
                    : item
                ));
              }
              
              // Log success
              const successLog = `✅ Found matching item: "${itemName}" at ${resultTimestamp}`;
              setSearchLogs(prev => [...prev, successLog]);
              addAssistantMessage(`🎯 找到匹配項目: "${itemName}" - ${price}`);
              
              firstItemFound = true;
              break;
            }
            
          } catch (rowError) {
            continue;
          }
        }
        
        if (!firstItemFound) {
          const noMatchLog = `⚠️ No matching items found for "${searchTerm}" at ${timestamp.toLocaleTimeString()}`;
          setSearchLogs(prev => [...prev, noMatchLog]);
          addAssistantMessage(`⚠️ 未找到匹配 "${searchTerm}" 的商店項目`);
        }
        
        return firstItemFound;
        
      } catch (parseError) {
        const errorLog = `❌ Table parsing error: ${parseError} at ${timestamp.toLocaleTimeString()}`;
        setSearchLogs(prev => [...prev, errorLog]);
        addAssistantMessage("❌ 解析表格時發生錯誤");
        return false;
      }
      
    } catch (error) {
      const errorLog = `❌ Search result parsing error: ${error} at ${new Date().toLocaleTimeString()}`;
      setSearchLogs(prev => [...prev, errorLog]);
      addAssistantMessage("❌ 解析搜索結果時發生錯誤");
      return false;
    }
  }, [addAssistantMessage]);

  // Search with pagination function
  const searchWithPagination = useCallback(async (searchTerm: string, notes: [string, string, string], searchItemIndex?: number) => {
    let currentPage = 1;
    let firstItemFound = false;
    const maxPages = 10; // Limit to prevent infinite loops
    
    while (currentPage <= maxPages && !firstItemFound) {
      // Check if search was cancelled
      if (!currentSearchRef.current || currentSearchRef.current.cancelled) {
        return false;
      }
      
      // Parse current page results
      const itemFound = await parseSearchResults(searchTerm, notes, searchItemIndex);
      
      if (itemFound) {
        firstItemFound = true;
        break;
      }
      
      // If no item found, try to go to next page
      try {
        // Check if search was cancelled before pagination
        if (!currentSearchRef.current || currentSearchRef.current.cancelled) {
          return false;
        }
        
        // Find pagination element
        const pagination = document.querySelector("ul.pagination") as HTMLElement;
        if (!pagination) {
          break;
        }
        
        // Find next page links
        const nextPageLinks = pagination.querySelectorAll("li a");
        let nextPageFound = false;
        
        for (const link of nextPageLinks) {
          const onclick = link.getAttribute('onclick') || '';
          if (onclick.includes(`goPage(${currentPage + 1})`)) {
            (link as HTMLElement).click();
            currentPage++;
            nextPageFound = true;
            
            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            break;
          }
        }
        
        if (!nextPageFound) {
          break;
        }
        
      } catch (error) {
        break;
      }
    }
    
    if (!firstItemFound) {
      const noMatchLog = `⚠️ No matching items found for "${searchTerm}" across ${currentPage - 1} pages at ${new Date().toLocaleTimeString()}`;
      addAssistantMessage(`⚠️ 在 ${currentPage - 1} 頁中未找到匹配 "${searchTerm}" 的項目`);
    }
    
    // Clear search state when done
    if (currentSearchRef.current && !currentSearchRef.current.cancelled) {
      currentSearchRef.current = null;
    }
    
    return firstItemFound;
  }, [parseSearchResults, addAssistantMessage]);

  // Search items management - now with notes structure and results
  const [searchItems, setSearchItems] = useState<Array<{
    name: string
    notes: [string, string, string]
    results: Array<{
      itemName: string
      price: string
      shopName: string
      slot: string
      quantity: string
      buySell: string
      ssi: string
      timestamp: string
    }>
    lastSearchTime: Date | null
  }>>([

    { 
      name: '征伐隊戒指', 
      notes: ['STR+2', '', ''], 
      results: [],
      lastSearchTime: null
    },
    { 
      name: '征伐隊戒指', 
      notes: ['', '', ''], 
      results: [],
      lastSearchTime: null
    }
  ])
  const [newSearchItem, setNewSearchItem] = useState({
    name: '',
    notes: ['', '', ''] as [string, string, string]
  })
  
  // Logging state
  const [searchLogs, setSearchLogs] = useState<string[]>([])
  const [lastSearchTime, setLastSearchTime] = useState<Date | null>(null)
  
  // Search results are now stored within each search item
  

  // Search item management functions
  const addSearchItem = useCallback(() => {
    if (newSearchItem.name.trim()) {
      // Check for exact duplicate (same name AND same notes)
      const trimmedNotes = newSearchItem.notes.map(note => note.trim()) as [string, string, string];
      const isExactDuplicate = searchItems.some(item => 
        item.name === newSearchItem.name.trim() && 
        JSON.stringify(item.notes) === JSON.stringify(trimmedNotes)
      );
      
      if (!isExactDuplicate) {
        const newItem = {
          name: newSearchItem.name.trim(),
          notes: trimmedNotes,
          results: [],
          lastSearchTime: null
        };
        
        setSearchItems(prev => [...prev, newItem]);
        setNewSearchItem({
          name: '',
          notes: ['', '', ''] as [string, string, string]
        });
        
        // Log the addition
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `✅ Added search item: "${newItem.name}" with notes [${newItem.notes.join(', ')}] at ${timestamp}`;
        setSearchLogs(prev => [...prev, logMessage]);
      }
    }
  }, [newSearchItem, searchItems]);

  const removeSearchItem = useCallback((index: number) => {
    const removedItem = searchItems[index];
    setSearchItems(prev => prev.filter((_, i) => i !== index));
    
    // Log the removal
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `❌ Removed search item: "${removedItem.name}" at ${timestamp}`;
    setSearchLogs(prev => [...prev, logMessage]);
  }, [searchItems]);

  const clearAllSearchItems = useCallback(() => {
    const itemCount = searchItems.length;
    setSearchItems([]);
    
    // Log the clearing
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `🧹 Cleared all ${itemCount} search items at ${timestamp}`;
    setSearchLogs(prev => [...prev, logMessage]);
  }, [searchItems]);


  // Update notes for a specific item
  const updateItemNote = useCallback((index: number, noteIndex: number, value: string) => {
    const newItems = [...searchItems];
    newItems[index] = {
      ...newItems[index],
      notes: newItems[index].notes.map((note, i) => i === noteIndex ? value : note) as [string, string, string]
    };
    setSearchItems(newItems);
  }, [searchItems]);

  // Update notes for the new item being added
  const updateNewItemNote = useCallback((noteIndex: number, value: string) => {
    setNewSearchItem(prev => ({
      ...prev,
      notes: prev.notes.map((note, i) => i === noteIndex ? value : note) as [string, string, string]
    }));
  }, []);

  // Auto-search function that runs every 1 minute
  const startAutoSearch = useCallback(() => {
    if (isAutoSearching) return;
    
    setIsAutoSearching(true);
    
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `🔄 Auto-search started at ${timestamp}`;
    setSearchLogs(prev => [...prev, logMessage]);
    addAssistantMessage("🔄 開始自動搜索，每分鐘執行一次");
    
    // Execute search immediately on start
    const executeSearch = async () => {
      if (searchItems.length > 0) {
        const autoSearchLog = `🔄 Auto-search cycle started at ${new Date().toLocaleTimeString()}`;
        setSearchLogs(prev => [...prev, autoSearchLog]);
        addAssistantMessage("🔄 執行自動搜索...");
        
        for (let i = 0; i < searchItems.length; i++) {
          const item = searchItems[i];
          try {
            await handleSearch(item.name, item.notes, i);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between searches
          } catch (error) {
            const errorLog = `❌ Auto-search error for "${item.name}": ${error} at ${new Date().toLocaleTimeString()}`;
            setSearchLogs(prev => [...prev, errorLog]);
          }
        }
      }
    };
    
    // Run immediately
    executeSearch();
    
    // Then set up the interval for subsequent runs
    const interval = setInterval(executeSearch, 60000); // 1 minute = 60000ms
    
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
    
    addAssistantMessage("🚀 開始工作流程：自動搜索");
    
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
                <div style={{
                  display: 'flex',
                flexDirection: 'column', 
                height: '100%',
                overflow: 'hidden'
              }}>

                {/* Main Content Area */}
        <div style={{
                  flex: 1, 
          display: 'flex',
                  overflow: 'hidden'
        }}>
                  {/* Search Items Section */}
           <div style={{
                     width: '100%', 
                     display: 'flex',
                     flexDirection: 'column',
                     overflow: 'hidden'
                   }}>
            <div style={{
                      padding: '12px',
                      backgroundColor: '#e9ecef',
                      borderBottom: '1px solid #e0e0e0',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      🔍 Search Items ({searchItems.length})
                    </div>
                    
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '8px'
                    }}>
                      {searchItems.length === 0 ? (
                        <div style={{
                          textAlign: 'center',
                          color: '#666',
                          padding: '20px',
                          fontSize: '14px'
                        }}>
                          No search items configured
                        </div>
                      ) : (
                        <>
                          {searchItems.map((item, index) => (
                            <div key={index} style={{ marginBottom: '8px' }}>
                              {/* Item Configuration Row */}
                              <div style={{
                      display: 'flex',
                      alignItems: 'center',
                                padding: '6px',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '12px',
                                gap: '4px'
                              }}>
                                {/* Name field */}
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => {
                                    const newItems = [...searchItems];
                                    newItems[index] = { ...newItems[index], name: e.target.value };
                                    setSearchItems(newItems);
                                  }}
                                  placeholder="名稱"
                                  style={{
                                    width: '80px',
                                    padding: '4px 6px',
                                    border: '1px solid #ddd',
                                    borderRadius: '3px',
                                    fontSize: '12px',
                                    backgroundColor: '#fff'
                                  }}
                                />
                                
                                {/* Notes fields */}
                                {item.notes.map((note, noteIndex) => (
                                  <input
                                    key={noteIndex}
                                    type="text"
                                    value={note}
                                    onChange={(e) => updateItemNote(index, noteIndex, e.target.value)}
                                    placeholder={`字條${noteIndex + 1}`}
                                    style={{
                                      width: '60px',
                                      padding: '4px 6px',
                                      border: '1px solid #ddd',
                                      borderRadius: '3px',
                                      fontSize: '12px',
                                      backgroundColor: '#fff'
                                    }}
                                  />
                                ))}

                                {/* Remove button */}
                  <button
                                  onClick={() => removeSearchItem(index)}
                    style={{
                                    padding: '4px 6px',
                                    backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#c82333';
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#dc3545';
                                    e.currentTarget.style.transform = 'scale(1)';
                                  }}
                                  title="Remove item"
                                >
                                  <RemoveIcon />
                  </button>
                </div>
                              
                              {/* Search Results for this item */}
                              {item.results.length > 0 && (
                                <div style={{
                                  marginTop: '4px',
                                  marginLeft: '20px',
                                  padding: '8px',
                                  backgroundColor: '#e8f5e8',
                                  border: '1px solid #28a745',
                                  borderRadius: '4px',
                                  fontSize: '11px'
                                }}>
                                  <div style={{
                                    fontWeight: 'bold',
                                    marginBottom: '4px',
                                    color: '#155724'
                                  }}>
                                    🎯 Latest Result ({item.lastSearchTime?.toLocaleTimeString()})
              </div>
                                  {item.results.slice(0, 1).map((result: any, resultIndex: number) => (
                                    <div key={resultIndex} style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr',
                                      gap: '4px',
                                      fontSize: '10px'
                                    }}>
                                      <div><strong>Item:</strong> {result.itemName}</div>
                                      <div><strong>Price:</strong> {result.price}</div>
                                      <div><strong>Shop:</strong> {result.shopName}</div>
                                      <div><strong>Qty:</strong> {result.quantity}</div>
            </div>
                                  ))}
          </div>
        )}
      </div>
                          ))}

                          {/* Add new item box */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
                            padding: '6px',
                            marginBottom: '4px',
                            backgroundColor: '#f8f9fa',
                            border: '1px dashed #ccc',
                            borderRadius: '4px',
                            fontSize: '12px',
                            gap: '4px',
                            opacity: 0.7
                          }}>
                <input
                  type="text"
                              value={newSearchItem.name}
                              onChange={(e) => setNewSearchItem(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="名稱"
                              onKeyPress={(e) => e.key === 'Enter' && addSearchItem()}
                style={{
                                width: '80px',
                                padding: '4px 6px',
                                border: '1px solid #ddd',
                                borderRadius: '3px',
                                fontSize: '12px',
                                backgroundColor: '#fff'
                              }}
                            />
                            {newSearchItem.notes.map((note, noteIndex) => (
                <input
                                key={noteIndex}
                  type="text"
                                value={note}
                                onChange={(e) => updateNewItemNote(noteIndex, e.target.value)}
                                placeholder={`字條${noteIndex + 1}`}
                  onKeyPress={(e) => e.key === 'Enter' && addSearchItem()}
                  style={{
                                  width: '60px',
                                  padding: '4px 6px',
                                  border: '1px solid #ddd',
                                  borderRadius: '3px',
                                  fontSize: '12px',
                                  backgroundColor: '#fff'
                                }}
                              />
                            ))}
                <button
                  onClick={addSearchItem}
                              disabled={!newSearchItem.name.trim()}
                  style={{
                                padding: '4px 6px',
                                backgroundColor: newSearchItem.name.trim() ? '#28a745' : '#ccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                                cursor: newSearchItem.name.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                opacity: newSearchItem.name.trim() ? 1 : 0.6
                              }}
                              onMouseEnter={(e) => {
                                if (newSearchItem.name.trim()) {
                                  e.currentTarget.style.backgroundColor = '#218838';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (newSearchItem.name.trim()) {
                                  e.currentTarget.style.backgroundColor = '#28a745';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }
                              }}
                              title="Add new item"
                            >
                              <PlusIcon />
                </button>
                          </div>
                        </>
                      )}
              </div>
            </div>

              </div>

                {/* Action Buttons */}
                <div style={{
                  padding: '12px',
                  borderTop: '1px solid #e0e0e0',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px'
                }}>
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
                  
              <button
                    onClick={() => {
                      if (searchItems.length === 0) return;
                      const firstItem = searchItems[0];
                      handleSearch(firstItem.name, firstItem.notes, 0);
                    }}
                    disabled={searchItems.length === 0}
                style={{
                      padding: '10px 20px',
                      backgroundColor: '#17a2b8',
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    Test Search
                  </button>
                  
                  <button
                    onClick={() => {
                      if (searchItems.length === 0) return;
                      const firstItem = searchItems[0];
                      parseSearchResults(firstItem.name, firstItem.notes, 0);
                    }}
                    disabled={searchItems.length === 0}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6f42c1',
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10,9 9,9 8,9" />
                    </svg>
                    Parse Results
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

    </>
  )
}

export default ContentApp