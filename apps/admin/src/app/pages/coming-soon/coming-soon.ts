import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-2xl py-6">
      <div
        class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-12"
      >
        <div
          class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"
        >
          <svg
            class="h-7 w-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 6v6l4 2" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <h1 class="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          {{ title() }}
        </h1>
        <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          Este módulo está en construcción. La base de navegación, sesión y
          consumo de API ya está lista para conectarlo.
        </p>
        <a
          routerLink="/dashboard"
          class="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Volver al dashboard
        </a>
      </div>
    </div>
  `,
})
export class ComingSoonPage {
  readonly title = input<string>('Módulo');
}
