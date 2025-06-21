import React from 'react'

interface OverlayData {
    id: string
    element: HTMLElement
    rect: {
        top: number
        left: number
        width: number
        height: number
    }
}

interface ClickableOverlaysProps {
    overlays: OverlayData[]
}

const ClickableOverlays: React.FC<ClickableOverlaysProps> = ({ overlays }) => {
    if (!overlays.length) return null

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 10000
        }}>
            {overlays.map(({ id, rect }) => (
                <div
                    key={id}
                    style={{
                        position: 'absolute',
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        border: '2px solid #ff4444',
                        backgroundColor: 'rgba(255, 68, 68, 0.1)',
                        pointerEvents: 'none',
                        boxSizing: 'border-box'
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            top: '-20px',
                            left: '0',
                            backgroundColor: '#ff4444',
                            color: 'white',
                            padding: '2px 6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderRadius: '3px',
                            fontFamily: 'monospace'
                        }}
                    >
                        {id}
                    </span>
                </div>
            ))}
        </div>
    )
}

export default ClickableOverlays