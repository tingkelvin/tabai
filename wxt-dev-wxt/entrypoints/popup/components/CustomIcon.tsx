import React from 'react';

interface CustomIconProps {
    className?: string;
}

export const CustomIcon: React.FC<CustomIconProps> = ({ className = "w-6 h-6" }) => (
    <img
        src="icons/48x48.svg"
        alt="Custom Icon"
        className={className}
    />
); 