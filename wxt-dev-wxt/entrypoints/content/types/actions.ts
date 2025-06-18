// Action types

export interface CustomAction {
    id: string;
    label: string;
    handler: () => void;
    icon?: string;
} 