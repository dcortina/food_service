import { Component, computed, effect, input, signal } from '@angular/core';

type BrandMarkSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-brand-mark',
  template: `
    @if (logoUrl() && !logoFailed()) {
      <img
        [src]="logoUrl()!"
        [alt]="name()"
        class="h-full w-full object-contain"
        (error)="logoFailed.set(true)"
      />
    } @else {
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        class="h-full w-full"
      >
        <path
          d="M12 24c0-8.5 9-14 20-14s20 5.5 20 14H12Z"
          fill="#f59e0b"
        />
        <path d="M12 24h40v4H12z" fill="#fbbf24" />
        <path
          d="M13 30c3 3 6 3 9 0s6-3 9 0 6 3 9 0 6-3 9 0c1.5 1.5 3 1 4-.5V35c-2 3-5 3-8 .5s-6-2.5-9 0-6 2.5-9 0-6-2.5-9 0-5 2.5-8 0v-5.5c1 1.5 2.5 2 4 .5Z"
          fill="#22c55e"
        />
        <rect x="14" y="37" width="36" height="8" rx="4" fill="#7c2d12" />
        <path
          d="M12 45h40v3c0 5-4.5 8-10 8H22c-5.5 0-10-3-10-8v-3Z"
          fill="#f59e0b"
        />
        <g fill="#fff7ed">
          <ellipse
            cx="24"
            cy="18"
            rx="2.2"
            ry="1.3"
            transform="rotate(-20 24 18)"
          />
          <ellipse
            cx="32"
            cy="15"
            rx="2.2"
            ry="1.3"
            transform="rotate(10 32 15)"
          />
          <ellipse
            cx="40"
            cy="18"
            rx="2.2"
            ry="1.3"
            transform="rotate(25 40 18)"
          />
        </g>
      </svg>
    }
  `,
  host: {
    '[class]': 'hostClasses()',
    '[attr.aria-label]': 'name()',
  },
})
export class BrandMark {
  readonly name = input('CaféQR');
  readonly logoUrl = input<string | null>(null);
  readonly size = input<BrandMarkSize>('md');
  readonly logoFailed = signal(false);

  constructor() {
    effect(() => {
      this.logoUrl();
      this.logoFailed.set(false);
    });
  }

  readonly hostClasses = computed(() => {
    const base =
      'inline-grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white ring-1 ring-stone-900/10 ';
    const sizes: Record<BrandMarkSize, string> = {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-14 w-14',
      xl: 'h-20 w-20',
    };

    return base + sizes[this.size()];
  });
}
