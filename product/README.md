# Mail Slot Upload

A file upload you post through a letterbox.

Drag files over the door and the letterbox flap lifts to meet them. Drop, and
each file becomes an envelope with its name typed on the front that slides
through the slot in turn; the flap clacks shut after the last one. Inside,
they land in the mail tray, a progress bar runs while your upload function
works, and a rubber stamp comes down on each: RECEIVED, or RETURN TO SENDER
with a Retry button. Files that break your rules bounce off the flap with a
note saying why.

Built with React and Framer Motion. It works with any backend: you hand it a
function that uploads one file, and it runs the queue, the progress, Cancel
and Retry around it.

---

## What's in the box

```
src/
  MailSlotUpload.jsx   the component
  MailSlotUpload.css   all styles, scoped under .mail-slot-root
  tokens.css           the design tokens the CSS reads
  fonts/               Geist + Geist Mono, self-hosted (no Google Fonts calls)
demo/
  index.html           a runnable demo
  main.jsx             wired to a fake upload that reports progress
```

## Run the demo

```bash
npm install
npm run dev
```

## Install into your project

Copy `src/` into your project (keep `fonts/` next to `tokens.css`), then:

```bash
npm install framer-motion
```

```jsx
import MailSlotUpload from './MailSlotUpload';
import './tokens.css';
import './MailSlotUpload.css';

export default function Attachments() {
  return (
    <MailSlotUpload
      accept="image/*,.pdf"
      maxSize={10 * 1024 * 1024}
      maxFiles={10}
      onUpload={(file, { onProgress, signal }) =>
        uploadWithProgress('/api/upload', file, { onProgress, signal })
      }
      onChange={(files) => console.log(files.filter((f) => f.status === 'done'))}
    />
  );
}
```

The component fills its parent's width up to 600px (`--ms-max-width`) and
centres itself. The door and its hardware scale down with it.

## Writing `onUpload`

`onUpload(file, { onProgress, signal })` is called once per file, at most
`concurrency` at a time (3 by default), oldest first. It gets:

- `file`: the `File` that was dropped or picked.
- `onProgress(fraction)`: call it with a number from 0 to 1 as bytes go out.
  If you never call it, the bar runs as an indeterminate stripe.
- `signal`: an `AbortSignal` that fires when the user presses Cancel or
  removes the row, or the component unmounts. Pass it to your request.

Resolve when the file is stored. Whatever you resolve with (a URL, an id, the
server's JSON) is kept as that file's `result` and reaches `onChange`. Throw or
reject to stamp the row RETURN TO SENDER: the error's `message` is shown on
the row, with a Retry button that calls `onUpload` again.

`fetch` can't report upload progress, so use `XMLHttpRequest` for the bytes:

```js
function uploadWithProgress(url, file, { onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status < 300
      ? resolve(xhr.response)
      : reject(new Error(xhr.response?.error || `Upload failed (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error('Network error. Check your connection.'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', () => xhr.abort());

    const body = new FormData();
    body.append('file', file);
    xhr.send(body);
  });
}
```

### Straight to S3, R2 or GCS

Ask your server for a presigned URL, then `PUT` the file to it. Here
`putWithProgress` is a copy of the helper above that opens with `'PUT'` and
sends `file` itself instead of the `FormData`:

```js
onUpload={async (file, { onProgress, signal }) => {
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, type: file.type }),
    signal,
  });
  const { url, key } = await res.json();
  await putWithProgress(url, file, { onProgress, signal });
  return { key };
}}
```

Keep your storage keys on the server. The component only ever calls the
function you give it.

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `onUpload` | `(file, { onProgress, signal }) => Promise` | none | Required. See above |
| `accept` | `string` | any file | As for `<input accept>`: `'image/*,.pdf'`. Checked on drop too |
| `maxSize` | `number` | none | Largest file, in bytes. Bigger ones bounce off |
| `maxFiles` | `number` | none | Most files the tray holds at once |
| `multiple` | `boolean` | `true` | Several files per drop or pick. With `false`, extras in a drop bounce off |
| `concurrency` | `number` | `3` | Uploads running at once |
| `onChange` | `(files) => void` | none | The tray's contents, on every add, remove and status change |
| `disabled` | `boolean` | `false` | Dims the door and refuses files |
| `labels` | `object` | English | Replace any built-in string. See below |

`onChange` receives `[{ id, file, name, size, type, status, progress, error, result }]`,
where `status` is `'queued'`, `'uploading'`, `'done'`, `'error'` or
`'canceled'`. It isn't called on every progress tick. To keep only what
arrived: `files.filter((f) => f.status === 'done').map((f) => f.result)`.

### Opening the picker or posting files from your code

Pass a `ref` and you get two methods:

```jsx
const mail = useRef(null);

<MailSlotUpload ref={mail} onUpload={upload} />

mail.current.open();              // opens the file picker
mail.current.addFiles(fileList);  // posts a FileList or File[]
```

`addFiles` goes through the same checks and the same trip through the slot.
It's how you'd wire a paste handler:

```js
useEffect(() => {
  const onPaste = (e) => {
    if (e.clipboardData.files.length) mail.current?.addFiles(e.clipboardData.files);
  };
  window.addEventListener('paste', onPaste);
  return () => window.removeEventListener('paste', onPaste);
}, []);
```

### Labels

Every word the component shows or announces is in `labels`, so you can
translate it or change the tone. Strings replace strings; the ones that take
numbers or names are functions. A few, in French:

```jsx
<MailSlotUpload
  labels={{
    slot: 'Choisir des fichiers à envoyer',
    hint: 'Glissez vos fichiers dans la fente, ou',
    choose: 'choisissez-les',
    flap: 'LETTRES',
    tray: 'Courrier',
    stamp: 'REÇU',
    returnStamp: ['RETOUR À', "L'EXPÉDITEUR"],
    count: (done, total) => `${done} sur ${total} reçus`,
  }}
  onUpload={upload}
/>
```

The full list, with the English defaults, is `LABELS` near the top of
`MailSlotUpload.jsx`: the hint and rules line under the door, the status
words (`queued`, `uploading`, `received`, `failed`, `canceled`), the buttons,
the reasons a file bounces (`wrongType`, `tooBig`, `tooMany`, `oneAtATime`),
the stamp date format (`date`) and the screen reader announcements. The rules
line ("Images or PDF · up to 10 MB each") is built from `accept`, `maxSize`
and `maxFiles`; pass `rules: 'your own text'` to replace it or `rules: ''` to
hide it.

## Theming

Every colour, finish and size reads a CSS custom property from `tokens.css`,
so you can retheme it without touching the component. The door, the
letterbox and the paper each have their own:

```css
.mail-slot-root {
  --ms-door-hi: #e9e7ee;          /* the painted door, top to bottom */
  --ms-door-lo: #dbd8e2;
  --ms-metal-hi: #fdfdfe;         /* the letterbox's nickel */
  --ms-metal-lo: #a39eaf;
  --ms-glow-rgb: 255, 255, 255;   /* light in the slot while dragging, as r, g, b */
  --ms-paper: #fbfbfd;            /* envelopes and rows */
  --ms-ink-rgb: 22, 18, 31;       /* RECEIVED */
  --ms-return-ink-rgb: 22, 18, 31;/* RETURN TO SENDER */
}
```

For a classic red RETURN TO SENDER, set `--ms-return-ink-rgb: 196, 43, 35`.
For a brass letterbox, warm the `--ms-metal-*` values; for a painted door in
your brand colour, change `--ms-door-hi` and `--ms-door-lo`.

Tokens are scoped to `.mail-slot-root`, so they never clash with your app's
own custom properties. It's light by default. Put `data-theme="dark"` on any
ancestor, usually `<html>`, for the black door.

The component brings its own scoped reset and sets no global styles.

### Fonts

Geist and Geist Mono ship in `src/fonts/` and load from your own origin, so the
component makes no third-party requests. To use a different typeface, change
`--font-sans` and `--font-mono` in `tokens.css` and delete the `@font-face`
blocks and the `fonts/` folder.

## Accessibility

- The letterbox is a real button, labelled "Choose files to upload" and
  described by the hint and the rules line. Enter or Space opens the file
  picker, which applies `accept` too. Dragging is never the only way in.
- Every row says its status in words ("Uploading 45%", "Received",
  "Returned" plus the error). The stamps, envelopes and door are decorative
  and hidden from assistive tech.
- Progress bars are `role="progressbar"` with `aria-valuenow`, labelled with
  the file's name.
- A live region announces the outcome of each batch ("3 files received.",
  "2 files received, 1 returned."), bounced files and why, cancellations and
  removals.
- Cancel, Retry and Remove are labelled buttons that name their file. When a
  row's button changes under you (Cancel becomes Retry), focus stays in the
  row; when a row is removed, focus moves to its neighbour or back to the
  letterbox.
- With `prefers-reduced-motion`, the flap holds still, envelopes don't fly,
  rows fade in and stamps appear without the slam.

## On phones

The door scales down with the component. On touch screens the hint reads
"Tap the letterbox to choose files" (there's no drag and drop from a phone's
files), and the envelopes still post through the slot after you pick. Under
480px of width the rows go compact: smaller stamps and an icon-only Retry.

## Good to know

- A drop that misses the component makes the browser open the file. If your
  page has no other drop zones, stop that with
  `window.addEventListener('dragover', (e) => e.preventDefault())` and the
  same for `'drop'`.
- File types are checked by extension and MIME type, like the picker does.
  That's a courtesy for the user, not security: check files on your server.
- Up to six envelopes fly per drop; the rest land in the tray with the last
  one, so a drop of 200 files doesn't take a minute to animate.

## Browser support

Chrome, Edge, Firefox and Safari 15.4+.

## Requirements

- React 18 or 19
- `framer-motion` 11+ (or the `motion` package, which has the same API)

---

## License

Commercial use is permitted. Redistribution is not. See [LICENSE.md](./LICENSE.md).

Support: email billing@susanoo.ai with your order email. We'll help with setup,
bug fixes and small changes. See the terms at ui.susanoo.ai/terms.
