import { TestBed } from '@angular/core/testing';
import { FileDownloadService } from './file-download.service';

describe('FileDownloadService', () => {
  const createObjectURL = vi.fn(() => 'blob:backup');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom implements neither: the browser does.
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('downloads the content with the given file name and releases it afterwards', () => {
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this);
    });
    const content = new Blob(['{}'], { type: 'application/json' });

    TestBed.inject(FileDownloadService).save(content, 'backup.json');

    expect(createObjectURL).toHaveBeenCalledWith(content);
    expect(clicks.map((link) => [link.href, link.download])).toEqual([
      ['blob:backup', 'backup.json'],
    ]);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup');
  });
});
