// React component prop types

import type { CustomAction } from './actions';

export interface ContentAppProps {
    customActions?: CustomAction[];
    title?: string;
}

export interface TerminalIconProps {
    isTyping: boolean;
} 