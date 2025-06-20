import { MESSAGE_TYPES } from "../utils/constant";

export interface ChatMessage {
    id: string;
    type: keyof typeof MESSAGE_TYPES;
    content: string;
    timestamp: Date;
}