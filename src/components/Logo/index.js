import SmartTransparentImage from '@/components/SmartTransparentImage/index';
import Link from 'next/link';

const Logo = ({ variant = 'full', className = '', href = '/account', forceLight = false }) => {
    const isFull = variant === 'full';
    const alt = 'Vysify Logo';

    const width = 40;

    const content = (
        <div className={`flex items-center gap-2.5 ${className}`}>
            <div className="relative logo-container transition-all duration-300">
                <SmartTransparentImage
                    src="/images/logo-symbol.png"
                    alt={alt}
                    width={width}
                    className="logo-canvas"
                    tolerance={100}
                />
            </div>
            {isFull && (
                <span className={`text-[26px] font-black tracking-tighter ${forceLight ? 'text-white' : 'text-[#4A4B75]'} logo-text`}>
                    Vysify
                </span>
            )}
            <style jsx>{`
                .logo-canvas {
                    filter: saturate(1.2);
                }
                
                :global(aside) .logo-text {
                    color: white !important;
                }
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
