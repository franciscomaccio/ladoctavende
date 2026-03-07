import { useEffect, useRef } from 'react';

export function useHorizontalScroll() {
    const elRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = elRef.current;
        if (el) {
            const onWheel = (e: WheelEvent) => {
                if (e.deltaY === 0) return;

                // Si llegamos al final/principio y la ventana también intentaría scrollear, 
                // prevenir el default ayuda, pero a veces interfiere. 
                // Lo básico es sumar deltaY a scrollLeft.

                const isScrollable = el.scrollWidth > el.clientWidth;

                if (isScrollable) {
                    e.preventDefault();
                    el.scrollLeft += e.deltaY;
                }
            };

            el.addEventListener('wheel', onWheel, { passive: false });
            return () => el.removeEventListener('wheel', onWheel);
        }
    }, []);

    return elRef;
}
