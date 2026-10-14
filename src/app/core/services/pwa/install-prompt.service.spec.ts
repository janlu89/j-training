import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StoragePersistenceService } from '../storage-persistence.service';
import { BeforeInstallPromptEvent, InstallPromptService } from './install-prompt.service';

interface FakeWindow {
  navigator: { userAgent: string; maxTouchPoints: number; standalone?: boolean };
  matchMedia: (query: string) => { matches: boolean };
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  dispatch: (type: string, event?: Event) => void;
}

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/130.0 Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Safari/604.1';

describe('InstallPromptService', () => {
  const ensurePersisted = vi.fn().mockResolvedValue(true);

  function setUp({ userAgent = ANDROID, standalone = false } = {}) {
    const listeners = new Map<string, (event: Event) => void>();
    const window: FakeWindow = {
      navigator: { userAgent, maxTouchPoints: 5 },
      matchMedia: (query) => ({ matches: standalone && query === '(display-mode: standalone)' }),
      addEventListener: (type, listener) => listeners.set(type, listener),
      dispatch: (type, event = new Event(type)) => listeners.get(type)?.(event),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: window } },
        { provide: StoragePersistenceService, useValue: { ensurePersisted } },
      ],
    });
    const service = TestBed.inject(InstallPromptService);
    service.listen();
    return { service, window };
  }

  function promptEvent(outcome: 'accepted' | 'dismissed'): BeforeInstallPromptEvent {
    return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome }),
    });
  }

  beforeEach(() => ensurePersisted.mockClear());

  it('offers the browser prompt instead of its banner, and installs on request', async () => {
    const { service, window } = setUp();
    expect(service.state()).toBe('manual');

    const event = promptEvent('accepted');
    window.dispatch('beforeinstallprompt', event);
    expect(event.defaultPrevented).toBe(true);
    expect(service.state()).toBe('available');

    await service.install();
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(service.state()).toBe('installed');
  });

  it('keeps offering nothing after the user dismissed the prompt', async () => {
    const { service, window } = setUp();
    window.dispatch('beforeinstallprompt', promptEvent('dismissed'));

    await service.install();

    expect(service.state()).toBe('manual');
  });

  it('asks again for persistent storage once installed', () => {
    const { service, window } = setUp();

    window.dispatch('appinstalled');

    expect(service.state()).toBe('installed');
    expect(ensurePersisted).toHaveBeenCalledOnce();
  });

  it('knows when it runs as the installed app', () => {
    expect(setUp({ standalone: true }).service.state()).toBe('standalone');
  });

  it('explains the home screen on iPhone, where Safari has no prompt', () => {
    expect(setUp({ userAgent: IPHONE }).service.state()).toBe('ios');
  });
});
