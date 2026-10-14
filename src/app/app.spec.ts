import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';
import { routes } from './app.routes';
import { useTestDatabase } from './core/testing/test-database';
import { provideTranslocoForTests } from './core/testing/transloco-testing';

describe('App shell', () => {
  useTestDatabase();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideTranslocoForTests(),
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    });
  });

  async function render(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the app name in the header', async () => {
    const element = await render('/workout');
    expect(element.querySelector('h1')?.textContent).toContain('J-Training');
  });

  it('renders the four main destinations in the bottom navigation', async () => {
    const element = await render('/workout');
    const labels = [...element.querySelectorAll('nav a')].map((link) => link.textContent?.trim());
    expect(labels).toEqual(['Allenamento', 'Schede', 'Storico', 'Analisi']);
  });

  it('marks the current destination for assistive technologies', async () => {
    const element = await render('/history');
    const current = element.querySelector('nav a[aria-current="page"]');
    expect(current?.textContent).toContain('Storico');
  });

  it('links to the settings from the header', async () => {
    const element = await render('/settings');
    const settings = element.querySelector('header a[aria-label="Impostazioni"]');
    expect(settings?.getAttribute('href')).toBe('/settings');
    expect(settings?.getAttribute('aria-current')).toBe('page');
  });

  it('redirects unknown URLs to the workout page', async () => {
    const element = await render('/does-not-exist');
    expect(TestBed.inject(Router).url).toBe('/workout');
    // The page reads a Dexie live query, which Angular does not track as a pending task.
    await vi.waitFor(() =>
      expect(element.querySelector('main')?.textContent).toContain('Nessuna scheda attiva'),
    );
  });
});
