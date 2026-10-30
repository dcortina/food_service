import { Component } from '@angular/core';

@Component({
  selector: 'app-burger-hero',
  template: `
    <svg
      viewBox="0 0 420 300"
      fill="none"
      aria-hidden="true"
      class="h-auto w-full"
    >
      <ellipse cx="210" cy="274" rx="148" ry="18" fill="#000" fill-opacity=".28" />

      <path
        d="M72 142c0-64 62-100 138-100s138 36 138 100H72Z"
        fill="#f59e0b"
      />
      <path d="M72 142h276v14H72z" fill="#fbbf24" />

      <path
        d="M78 170c14 15 28 15 42 0s28-15 42 0 28 15 42 0 28-15 42 0 28 15 42 0 28-15 42 0c7 7 14 5 20-2v24c-10 14-24 14-38 2s-28-12-42 0-28 12-42 0-28-12-42 0-28 12-42 0-26-12-38 0v-24c6 7 13 9 20 2Z"
        fill="#22c55e"
      />

      <path
        d="M78 160h264c10 0 18 8 18 18s-8 18-18 18H78c-10 0-18-8-18-18s8-18 18-18Z"
        fill="#ef4444"
      />

      <rect x="84" y="198" width="252" height="34" rx="17" fill="#7c2d12" />
      <rect x="92" y="204" width="236" height="8" rx="4" fill="#92400e" />

      <path
        d="M72 232h276v14c0 28-24 44-56 44H128c-32 0-56-16-56-44v-14Z"
        fill="#f59e0b"
      />
      <path d="M72 232h276v10H72z" fill="#fbbf24" />

      <g fill="#fff7ed">
        <ellipse
          cx="144"
          cy="106"
          rx="12"
          ry="7"
          transform="rotate(-18 144 106)"
        />
        <ellipse
          cx="204"
          cy="88"
          rx="12"
          ry="7"
          transform="rotate(8 204 88)"
        />
        <ellipse
          cx="266"
          cy="104"
          rx="12"
          ry="7"
          transform="rotate(22 266 104)"
        />
        <ellipse
          cx="174"
          cy="128"
          rx="10"
          ry="6"
          transform="rotate(-5 174 128)"
        />
        <ellipse
          cx="238"
          cy="128"
          rx="10"
          ry="6"
          transform="rotate(14 238 128)"
        />
      </g>

      <g stroke="#fff7ed" stroke-width="4" stroke-linecap="round" opacity=".7">
        <path d="M150 52c-8-12-8-22 0-34" />
        <path d="M204 44c-8-12-8-22 0-34" />
        <path d="M258 52c-8-12-8-22 0-34" />
      </g>
    </svg>
  `,
  host: { class: 'block' },
})
export class BurgerHero {}
