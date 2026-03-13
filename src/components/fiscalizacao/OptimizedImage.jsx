import { useState, useEffect } from 'react';
 

export default function OptimizedImage({ src, alt, className, ...props }) {
    const [imgSrc, setImgSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!src) {
            setImgSrc(null);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const image = new Image();
        const handleLoad = () => {
            setImgSrc(src);
            setIsLoading(false);
        };
        const handleError = () => {
            setImgSrc(src);
            setIsLoading(false);
        };
        image.addEventListener('load', handleLoad);
        image.addEventListener('error', handleError);
        image.src = src;
        return () => {
            image.removeEventListener('load', handleLoad);
            image.removeEventListener('error', handleError);
        };
    }, [src]);

    if (isLoading || !imgSrc) {
        return (
            <div className={`bg-gray-200 animate-pulse ${className}`} {...props} />
        );
    }

    return (
        <img 
            src={imgSrc} 
            alt={alt} 
            className={className}
            loading="lazy"
            {...props}
        />
    );
}
