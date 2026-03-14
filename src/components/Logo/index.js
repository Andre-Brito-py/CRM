import SmartTransparentImage from '@/components/SmartTransparentImage/index';
import Link from 'next/link';

const Logo = ({ variant = 'full', className = '', href = '/', forceLight = false }) => {
    const isFull = variant === 'full';
    const src = isFull ? '/images/logo-full.png' : '/images/logo-symbol.png';
    const alt = 'Closify Logo';

    const width = isFull ? 160 : 40;

    const content = (
        <div className={`flex items-center ${className}`}>
            <div className="relative logo-container transition-all duration-300">
                <SmartTransparentImage
                    src={src}
                    alt={alt}
                    width={width}
                    className="logo-canvas"
                    tolerance={40}
                />
            </div>
            <style jsx>{`
                .logo-canvas {
                    filter: brightness(0.1); /* Near-black for light backgrounds */
                }
                
                :global(aside) .logo-canvas {
                    filter: brightness(0) invert(1) !important; /* Crisp white for dark sidebar */
                }

                ${forceLight ? `
                    .logo-canvas {
                        filter: brightness(0) invert(1) !important;
                    }
                ` : ''}
            `}</style>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="inline-block transition-transform hover:scale-[1.02]">
                {content}
            </Link>
        );
    }

    return content;
};

export default Logo;
