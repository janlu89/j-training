import { DOCUMENT, Injectable, inject } from '@angular/core';

/** Long enough for the browser to start reading the file, short enough not to hold it in memory. */
const REVOKE_DELAY_MS = 10_000;

/** Saves a file generated in the page to the device (the browser's downloads). */
@Injectable({ providedIn: 'root' })
export class FileDownloadService {
  private readonly document = inject(DOCUMENT);

  save(content: Blob, fileName: string): void {
    const url = URL.createObjectURL(content);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.hidden = true;
    this.document.body.append(link);
    link.click();
    link.remove();
    // Revoking at once can cancel the download on some mobile browsers.
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}
