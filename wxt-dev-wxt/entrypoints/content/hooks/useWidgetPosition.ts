// hooks/useWidgetPosition.ts - Fixed
import { useState, useCallback, useRef } from 'react';
import { WIDGET_CONFIG } from '../utils/constant';

interface Position {
    left: number;
    top: number;
}

interface WidgetState {
    iconPosition: Position;
    widgetPosition: Position;
    isMinimized: boolean;
    isDragging: boolean;
}

export const useWidgetPosition = (initialIconPos: Position, initialWidgetPos: Position) => {
    const [state, setState] = useState<WidgetState>({
        iconPosition: initialIconPos,
        widgetPosition: initialWidgetPos,
        isMinimized: true,
        isDragging: false
    });
    
    const hasDraggedRef = useRef(false);
    
    const updatePosition = useCallback((newPos: Partial<Position>) => {
        setState(prev => ({
            ...prev,
            [prev.isMinimized ? 'iconPosition' : 'widgetPosition']: {
                ...prev[prev.isMinimized ? 'iconPosition' : 'widgetPosition'],
                ...newPos
            }
        }));
    }, []);
    
    const getCurrentPosition = useCallback(() => {
        return state.isMinimized ? state.iconPosition : state.widgetPosition;
    }, [state.isMinimized, state.iconPosition, state.widgetPosition]);
    
    const getCurrentSize = useCallback(() => {
        return state.isMinimized 
            ? { width: WIDGET_CONFIG.ICON_SIZE, height: WIDGET_CONFIG.ICON_SIZE }
            : { width: WIDGET_CONFIG.DEFAULT_WIDTH, height: WIDGET_CONFIG.DEFAULT_HEIGHT };
    }, [state.isMinimized]);
    
    const toggle = useCallback((widgetSize: { width: number; height: number }) => {
        if (hasDraggedRef.current) {
            hasDraggedRef.current = false;
            return;
        }
        
        setState(prev => {
            if (prev.isMinimized) {
                // Calculate widget position based on icon position
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
                const isOnRightSide = prev.iconPosition.left > screenWidth / 2;
                const isOnBottomHalf = prev.iconPosition.top > screenHeight / 2;
                
                const widgetLeft = isOnRightSide 
                    ? prev.iconPosition.left - widgetSize.width + WIDGET_CONFIG.ICON_SIZE
                    : prev.iconPosition.left;
                    
                const widgetTop = isOnBottomHalf
                    ? prev.iconPosition.top - widgetSize.height + WIDGET_CONFIG.ICON_SIZE
                    : prev.iconPosition.top;
                
                // Constrain to screen
                const constrainedLeft = Math.max(0, Math.min(widgetLeft, screenWidth - widgetSize.width));
                const constrainedTop = Math.max(0, Math.min(widgetTop, screenHeight - widgetSize.height));
                
                return {
                    ...prev,
                    isMinimized: false,
                    widgetPosition: { left: constrainedLeft, top: constrainedTop }
                };
            }
            
            return { ...prev, isMinimized: true };
        });
    }, []);
    
    const setDragging = useCallback((dragging: boolean) => {
        setState(prev => ({ ...prev, isDragging: dragging }));
    }, []);
    
    return {
        ...state,
        updatePosition,
        getCurrentPosition,
        getCurrentSize,
        toggle,
        setDragging,
        hasDraggedRef // Export the ref instead of the object
    };
};