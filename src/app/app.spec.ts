import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { provideTranslocoForTests } from './core/testing/transloco-testing';

describe('App shell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideTranslocoForTests()],
    });
  });

  async function render(url: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the app name in the header', async () => {
    const element = await render('/schedule');
    expect(element.querySelector('h1')?.textContent).toContain('J-Training');
  });

  it('renders the four main destinations in the bottom navigation', async () => {
    const element = await render('/schedule');
    const labels = [...element.querySelectorAll('nav a')].map((link) => link.textContent?.trim());
    expect(labels).toEqual(['Scheda', 'Storico', 'Analisi', 'Impostazioni']);
  });

  it('marks the current destination for assistive technologies', async () => {
    const element = await render('/history');
    const current = element.querySelector('nav a[aria-current="page"]');
    expect(current?.textContent).toContain('Storico');
  });

  it('redirects unknown URLs to the plan', async () => {
    const element = await render('/does-not-exist');
    expect(TestBed.inject(Router).url).toBe('/schedule');
    expect(element.querySelector('main')?.textContent).toContain('Nessuna scheda attiva');
  });
});
