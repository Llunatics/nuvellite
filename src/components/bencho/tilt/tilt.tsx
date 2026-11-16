'use client';

import React, { useRef, useState, useEffect } from 'react';
import './tokens.css';
import './tilt.css';

const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const springParams = (stiffness: number) => ({
  k: 0.08 + (stiffness / 100) * 0.16,
  d: 0.62 + (stiffness / 100) * 0.2,
});

function useBenchoSpring(target: number, stiffness = 50, disabled = false) {
  const [val, setVal] = useState(target);
  const currentRef = useRef(target);
  const velRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (disabled) {
      currentRef.current = target;
      velRef.current = 0;
      setVal(target);
      return;
    }

    const { k, d } = springParams(stiffness);
    let prevTime = 0;

    const tick = (now: number) => {
      const dt = prevTime ? clamp((now - prevTime) / 16.67, 0, 2.5) : 1;
      prevTime = now;

      velRef.current += (target - currentRef.current) * k * dt;
      velRef.current *= Math.pow(d, dt);
      currentRef.current += velRef.current * dt;

      if (Math.abs(target - currentRef.current) < 0.002 && Math.abs(velRef.current) < 0.002) {
        currentRef.current = target;
        velRef.current = 0;
        setVal(target);
        rafRef.current = 0;
        return;
      }

      setVal(currentRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [target, stiffness, disabled]);

  return val;
}

export interface TiltProps {
  /** Tilt angle in degrees: 0–20 (default 10) */
  tilt?: number;
  /** Shade percentage: 0–100 (default 60) */
  shade?: number;
  /** Corner radius in px: 0–40 (default 20) */
  corner?: number;
  className?: string;
  cardClassName?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Bencho Tilt block: single accent interaction on catalog cover cards.
 * Sinks under the pointer: rx = -sy * max, ry = sx * max.
 * Rotation, dent/rim gradients, and shadow all read off one normalized
 * -1..1 pointer pair through one spring.
 * Hover-only (@media (hover: hover)); touches and reduced motion stay still.
 */
export function Tilt({
  tilt = 10,
  shade = 60,
  corner = 20,
  className = '',
  cardClassName = '',
  children,
  style,
}: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hoverQuery = window.matchMedia('(hover: hover)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setCanHover(hoverQuery.matches);
    setReducedMotion(motionQuery.matches);

    const onMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    const onHoverChange = (e: MediaQueryListEvent) => setCanHover(e.matches);

    motionQuery.addEventListener('change', onMotionChange);
    hoverQuery.addEventListener('change', onHoverChange);
    return () => {
      motionQuery.removeEventListener('change', onMotionChange);
      hoverQuery.removeEventListener('change', onHoverChange);
    };
  }, []);

  const disabled = !canHover || reducedMotion;

  const sx = useBenchoSpring(hovered && !disabled ? pos.x : 0, 50, disabled);
  const sy = useBenchoSpring(hovered && !disabled ? pos.y : 0, 50, disabled);
  const sw = useBenchoSpring(hovered && !disabled ? 1 : 0, 50, disabled);

  const maxTilt = clamp(tilt, 0, 20);
  const rx = -sy * maxTilt;
  const ry = sx * maxTilt;

  const ox = ((sx + 1) / 2) * 100;
  const oy = ((sy + 1) / 2) * 100;
  const shadeFactor = clamp(shade, 0, 100) / 100;
  const dentOpacity = shadeFactor * 0.55 * sw;
  const rimOpacity = shadeFactor * 0.34 * sw;

  const transformStyle = disabled
    ? undefined
    : `translateZ(${-14 * sw}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;

  const shadowStyle = disabled
    ? undefined
    : `0 ${lerp(20, 9, sw).toFixed(1)}px ${lerp(44, 24, sw).toFixed(1)}px -8px rgba(15, 23, 42, ${lerp(0.22, 0.15, sw).toFixed(3)})`;

  return (
    <div
      ref={ref}
      className={`tlt ${className}`}
      style={{
        perspective: 800,
        ...style,
      }}
      onPointerMove={(e) => {
        if (disabled) return;
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setPos({
          x: clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
          y: clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
        });
        setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
      }}
      onPointerCancel={() => {
        setHovered(false);
      }}
    >
      <div
        className={`tlt-card ${cardClassName}`}
        style={{
          borderRadius: corner ? `${corner}px` : undefined,
          transform: transformStyle,
          boxShadow: shadowStyle,
        }}
      >
        {children}
        {!disabled && sw > 0.01 && (
          <span
            className="tlt-sheen"
            aria-hidden="true"
            style={{
              backgroundImage: `radial-gradient(42% 34% at ${ox.toFixed(1)}% ${oy.toFixed(1)}%, rgba(9, 14, 28, ${dentOpacity.toFixed(3)}) 0%, rgba(9, 14, 28, 0) 100%), radial-gradient(52% 42% at ${(100 - ox).toFixed(1)}% ${(100 - oy).toFixed(1)}%, rgba(255, 255, 255, ${rimOpacity.toFixed(3)}) 0%, rgba(255, 255, 255, 0) 100%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
