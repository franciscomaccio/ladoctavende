import React from 'react';

/**
 * Parses a string and converts any URLs into clickable <a> tags.
 * @param text The text to process
 * @returns An array of React nodes (strings and <a> elements)
 */
export function linkify(text: string | null | undefined) {
    if (!text) return null;

    // Regex to find URLs (http, https)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Split text by URLs and map parts
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a 
                    key={i} 
                    href={part} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                        color: 'var(--primary)', 
                        textDecoration: 'underline', 
                        wordBreak: 'break-all' 
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent parent click events
                >
                    {part}
                </a>
            );
        }
        return part;
    });
}
