import { useEffect, useRef } from 'react';

/**
 * A component that renders an image and programmatically removes the white background
 * using the Canvas API, producing a truly transparent result for non-transparent source assets.
 */
const SmartTransparentImage = ({ src, alt, width, className = '', tolerance = 40 }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const img = new window.Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { alpha: true });
            if (!ctx) return;

            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;

            // Clear to transparent first (important!)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Remove near-white pixels completely
                const minChannel = Math.min(r, g, b);
                // The main logo color is periwinkle (minChannel ~ 132). 
                // Any pixel with minChannel > 180 is likely background/anti-aliasing of the background.
                if (minChannel > (255 - tolerance)) {
                    data[i + 3] = 0; // Make fully transparent
                }
            }

            ctx.putImageData(imageData, 0, 0);
        };
        // Trigger load (set src after attaching onload)
        img.src = src;
    }, [src, tolerance]);

    return (
        <canvas
            ref={canvasRef}
            aria-label={alt}
            className={className}
            style={{
                width: `${width}px`,
                height: 'auto',
                display: 'block',
                background: 'transparent',
            }}
        />
    );
};

export default SmartTransparentImage;
