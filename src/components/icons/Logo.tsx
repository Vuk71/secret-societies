
import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-label="Secret Societies Logo"
      {...props}
    >
      <path d="M85,35 A5,5 0 0,0 75,35 L75,25 A25,25 0 0,0 50,0 A25,25 0 0,0 25,25 L25,35 A5,5 0 0,0 15,35 A5,5 0 0,0 15,45 L20,45 L20,80 A10,10 0 0,0 30,90 L70,90 A10,10 0 0,0 80,80 L80,45 L85,45 A5,5 0 0,0 85,35 M50,10 A15,15 0 0,1 65,25 L65,35 L35,35 L35,25 A15,15 0 0,1 50,10 M70,80 L30,80 L30,45 L70,45 L70,80 Z" />
      <circle cx="35" cy="62.5" r="5" />
      <circle cx="50" cy="62.5" r="5" />
      <circle cx="65" cy="62.5" r="5" />
    </svg>
  );
}
