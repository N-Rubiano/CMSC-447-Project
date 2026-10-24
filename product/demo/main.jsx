import { createRoot } from 'react-dom/client';
import MailSlotUpload from '../src/MailSlotUpload.jsx';
import '../src/tokens.css';
import '../src/MailSlotUpload.css';

// A fake upload that reports progress and can be cancelled. Swap onUpload
// for your real one: XMLHttpRequest with upload.onprogress, a presigned S3
// PUT, UploadThing, Supabase Storage (see the README).
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); });
});

let uploads = 0;

async function fakeUpload(file, { onProgress, signal }) {
  const n = ++uploads;
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    await sleep(40 + Math.random() * 60, signal);
    onProgress(i / steps);
    // Every fourth upload fails half way, so you can see Retry.
    if (n % 4 === 0 && i === steps / 2) throw new Error("The server didn't answer. Try again.");
  }
  return { url: `https://files.yourapp.com/${encodeURIComponent(file.name)}` };
}

createRoot(document.getElementById('root')).render(
  <MailSlotUpload
    maxSize={25 * 1024 * 1024}
    maxFiles={8}
    onUpload={fakeUpload}
    onChange={(files) => console.log(files.map((f) => `${f.name}: ${f.status}`))}
  />
);
