// MailSlotUpload — integrated into PunchList Pro

/**
 * MailSlotUpload: a file upload you post through a letterbox.
 * susanoo.ui
 *
 * Drag files over the door and the letterbox flap lifts to meet them. Drop,
 * and each file becomes an envelope, its name typed on the front, that slides
 * through the slot in turn; the flap clacks shut after the last one. Inside,
 * they land in the mail tray, a progress bar runs while your upload function
 * works, and a rubber stamp comes down on each: RECEIVED, or RETURN TO SENDER
 * with a Retry button. Files that break your rules bounce off the flap.
 *
 * Nobody has to drag. The letterbox is a real button that opens the file
 * picker, every row says its status in words, and a live region reports what
 * arrived. With reduced motion the flap and the envelopes hold still, rows
 * fade in and the stamps appear without the slam.
 *
 * This component is presentational. It owns no storage: you pass onUpload
 * and it calls it once per file, a few at a time, with a progress callback
 * and an AbortSignal that the row's Cancel button fires.
 *
 * ---------------------------------------------------------------------------
 * PROPS
 *
 *   onUpload(file, { onProgress, signal })
 *                      required. Upload one file and resolve when it's
 *                      stored (whatever you resolve with is kept as the
 *                      file's result). Call onProgress(0..1) as it goes; skip
 *                      it and the bar runs indeterminate. Throw (or reject)
 *                      to stamp it RETURN TO SENDER with a Retry button; the
 *                      error's message is shown on the row.
 *   accept             file types, as for <input accept>: 'image/*,.pdf'.
 *   maxSize            the largest file, in bytes. Bigger files bounce off.
 *   maxFiles           the most files the tray holds at once.
 *   multiple           several files per drop or pick. Default true.
 *   concurrency        uploads running at once. Default 3.
 *   onChange(files)    the tray's contents, each time a file is added,
 *                      removed or changes status (not on every progress
 *                      tick): [{ id, file, name, size, type, status,
 *                      progress, error, result }], where status is 'queued'
 *                      | 'uploading' | 'done' | 'error' | 'canceled'.
 *   disabled           dims the door and refuses files.
 *   labels             replace any built-in string, e.g. to translate it.
 *                      See LABELS below for every key.
 *
 *   ref                optional. { open(), addFiles(files) }: open the file
 *                      picker, or post a FileList or File[] from your own
 *                      code (a paste handler, a "try a sample" button).
 *
 * ---------------------------------------------------------------------------
 * USAGE
 *
 *   import MailSlotUpload from './MailSlotUpload';
 *   import './tokens.css';
 *   import './MailSlotUpload.css';
 *
 *   <MailSlotUpload
 *     accept="image/*,.pdf"
 *     maxSize={10 * 1024 * 1024}
 *     onUpload={(file, { onProgress, signal }) =>
 *       uploadWithProgress('/api/upload', file, { onProgress, signal })
 *     }
 *     onChange={(files) => setAttachments(files.filter((f) => f.status === 'done'))}
 *   />
 *
 * Requires: react >= 18, framer-motion >= 11 (or the `motion` package).
 * Styles are fully scoped under .mail-slot-root; nothing leaks out.
 */

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  animate,
  useAnimate,
  useMotionValue,
} from 'framer-motion';

/* useLayoutEffect warns during server rendering; everything it's used for
   here only happens in the browser anyway. */
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/* A media query as live state. It starts false so the server and the browser
   render the same markup, is read before the first paint, and follows the
   setting if it changes. Reduced motion needs a live value because the trip
   through the slot is skipped, not just sped up; touch changes the hint. */
function useMedia(query) {
  const [match, setMatch] = useState(false);
  useIsoLayoutEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatch(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return match;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const LABELS = {
  slot: 'Choose files to upload',
  hint: 'Drop files through the slot, or',
  choose: 'choose files',
  hintTouch: 'Tap the letterbox to choose files',
  release: 'Let go to post them through',
  flap: 'LETTERS',
  tray: 'Mail tray',
  empty: 'Nothing in the tray yet',
  count: (done, total) => `${done} of ${total} received`,
  // A row's status, in words
  queued: 'Waiting',
  uploading: 'Uploading',
  received: 'Received',
  failed: 'Returned',
  canceled: 'Cancelled',
  uploadError: 'The upload failed.',
  // The rubber stamps
  stamp: 'RECEIVED',
  returnStamp: ['RETURN TO', 'SENDER'],
  date: (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(),
  // Buttons (each row's also names its file for screen readers)
  cancel: 'Cancel',
  retry: 'Retry',
  remove: 'Remove',
  dismiss: 'Dismiss',
  // The rules line under the hint. Built from accept, maxSize and maxFiles;
  // pass rules: 'your own text' to replace it, or '' to hide it.
  rules: undefined,
  upTo: (size) => `up to ${size} each`,
  atMost: (n) => `${n} files max`,
  // Why a file bounced off the flap
  wrongType: 'not an accepted file type',
  tooBig: (size) => `larger than ${size}`,
  tooMany: (n) => `the tray holds ${plural(n, 'file', 'files')}`,
  oneAtATime: 'one file at a time',
  bounced: (name, reason) => `${name} wasn't posted: ${reason}.`,
  // For screen readers, through the live region
  settled: (received, returned) =>
    returned
      ? `${plural(received, 'file', 'files')} received, ${returned} returned.`
      : `${plural(received, 'file', 'files')} received.`,
  canceledFile: (name) => `Upload of ${name} cancelled.`,
  removedFile: (name) => `${name} removed.`,
};

/* ------------------------------------------------------------------------ */
/* Files                                                                     */
/* ------------------------------------------------------------------------ */

function formatBytes(n) {
  if (!Number.isFinite(n) || n < 1024) return `${Math.max(0, n | 0)} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v >= 10 ? Math.round(v) : Number(v.toFixed(1))} ${units[i]}`;
}

const acceptTokens = (accept) =>
  (accept || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

/* The same test the browser's picker applies to <input accept>, so a dropped
   file obeys the same rules as a picked one. */
function matchesAccept(file, accept) {
  const tokens = acceptTokens(accept);
  if (!tokens.length) return true;
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  return tokens.some((t) => {
    if (t.startsWith('.')) return name.endsWith(t);
    if (t.endsWith('/*')) return type.startsWith(t.slice(0, -1));
    return type === t;
  });
}

const FAMILY = { image: 'Images', video: 'Videos', audio: 'Audio', text: 'Text files' };

/* 'image/*,.pdf,application/zip' reads as "Images, PDF or ZIP". */
function describeAccept(accept) {
  const names = [];
  for (const t of acceptTokens(accept)) {
    let name;
    if (t.startsWith('.')) name = t.slice(1).toUpperCase();
    else if (t.endsWith('/*')) name = FAMILY[t.slice(0, -2)] || t;
    else name = (t.split('/')[1] || t).replace(/^x-/, '').split(/[.+-]/).pop().toUpperCase();
    if (!names.includes(name)) names.push(name);
  }
  if (names.length < 2) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

const EXT_KIND = {
  pdf: 'doc', doc: 'doc', docx: 'doc', txt: 'doc', md: 'doc', rtf: 'doc', odt: 'doc', pages: 'doc',
  ppt: 'doc', pptx: 'doc', key: 'doc',
  xls: 'sheet', xlsx: 'sheet', csv: 'sheet', tsv: 'sheet', ods: 'sheet', numbers: 'sheet',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive', tgz: 'archive',
  js: 'code', jsx: 'code', ts: 'code', tsx: 'code', json: 'code', html: 'code', css: 'code',
  py: 'code', rb: 'code', go: 'code', rs: 'code', java: 'code', sh: 'code', yml: 'code', yaml: 'code',
};

/* Which glyph goes on the envelope's postage stamp. */
function fileKind(file) {
  const type = (file.type || '').toLowerCase();
  for (const k of ['image', 'video', 'audio']) if (type.startsWith(`${k}/`)) return k;
  const ext = (file.name || '').toLowerCase().split('.').pop();
  return EXT_KIND[ext] || (type.startsWith('text/') ? 'doc' : 'file');
}

const isAbort = (err) => err?.name === 'AbortError';
let nextId = 0;
const uid = () => `f${++nextId}`;

/* A stable 0..1 per file (FNV-1a of its id), so each stamp lands at its own
   angle and keeps it across re-renders. */
function wobble(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

const publicItem = ({ id, file, name, size, type, status, progress, error, result }) =>
  ({ id, file, name, size, type, status, progress, error, result });

/* ------------------------------------------------------------------------ */
/* Artwork                                                                   */
/* ------------------------------------------------------------------------ */

const GLYPHS = {
  image: (<><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="m4 17.6 4.8-4.6 3.7 3.4 2.6-2.4 4.9 4.3" /></>),
  video: (<><rect x="3" y="6" width="12.5" height="12" rx="2" /><path d="m15.5 10.2 5-3v9.6l-5-3z" /></>),
  audio: (<><path d="M9 17.4V6.2l10-2.2v11.2" /><circle cx="6.8" cy="17.6" r="2.3" /><circle cx="16.8" cy="15.4" r="2.3" /></>),
  doc: (<><path d="M7 3.5h6.8L18.5 8v12.5H7z" /><path d="M13.5 3.5V8h5M9.8 12.5h5.8M9.8 16h4" /></>),
  sheet: (<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9.5h16M4 14.8h16M10 9.5V20" /></>),
  archive: (<><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M12 3.5v1.8M12 7.1v1.8M12 10.7v1.8" /><rect x="10.3" y="14" width="3.4" height="3.6" rx=".8" /></>),
  code: (<path d="m9 7.5-4.5 4.5L9 16.5m6-9 4.5 4.5-4.5 4.5" />),
  file: (<><path d="M7 3.5h6.8L18.5 8v12.5H7z" /><path d="M13.5 3.5V8h5" /></>),
};

function Glyph({ kind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {GLYPHS[kind] || GLYPHS.file}
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/* An envelope with a return arrow, beside the notes about bounced files. */
function ReturnedIcon() {
  return (
    <svg className="ms-notes-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M13 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5" />
      <path d="m3.5 6.5 8.5 6 8.5-6M19 15l-3 3 3 3M16 18h5" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" />
    </svg>
  );
}

/* The front of an envelope: a return address, postage with the file's type
   on it, a postmark, and the file's name and size typed where the address
   goes. Sized in em, so it scales with the letterbox. */
function Envelope({ name, size, kind }) {
  return (
    <div className="ms-env-paper">
      <span className="ms-env-from" />
      <svg className="ms-env-postmark" viewBox="0 0 64 30" aria-hidden="true" focusable="false">
        <circle cx="15" cy="15" r="11.5" />
        <circle cx="15" cy="15" r="7.5" strokeDasharray="1.4 2.2" />
        <path d="M30 8.5c4.2-2.6 7.8 2.6 12 0s7.8 2.6 12 0 7.8 2.6 10 1.2M30 15c4.2-2.6 7.8 2.6 12 0s7.8 2.6 12 0 7.8 2.6 10 1.2M30 21.5c4.2-2.6 7.8 2.6 12 0s7.8 2.6 12 0 7.8 2.6 10 1.2" />
      </svg>
      <span className="ms-env-postage"><Glyph kind={kind} /></span>
      <span className="ms-env-to">
        <span className="ms-env-name">{name}</span>
        <span className="ms-env-size">{size}</span>
      </span>
    </div>
  );
}

/* Rubber-stamp ink: speckled where the rubber missed, a little lighter where
   it was pressed unevenly, with slightly rough edges. Each stamp has its own
   seed, so no two impressions look the same. */
function InkFilter({ id, seed }) {
  return (
    <filter id={id} x="-6%" y="-10%" width="112%" height="120%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" seed={seed} result="grain" />
      <feDisplacementMap in="SourceGraphic" in2="grain" scale="1" xChannelSelector="R" yChannelSelector="G" result="rough" />
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -10 6.9" result="speckle" />
      <feComposite in="rough" in2="speckle" operator="in" result="inked" />
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="1" seed={seed + 11} result="press" />
      <feColorMatrix in="press" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.8 1.3" result="pressure" />
      <feComposite in="inked" in2="pressure" operator="in" />
    </filter>
  );
}

/* A manicule, the pointing hand on a RETURN TO SENDER stamp: a silhouette
   with the knuckle lines cut out of it by a mask, so it reads at stamp size
   and inks like everything else. */
function Manicule({ id, ...props }) {
  return (
    <g {...props}>
      <mask id={id} maskUnits="userSpaceOnUse" x="-2" y="-2" width="44" height="32">
        <g fill="#fff">
          <rect x="0.4" y="2.6" width="21" height="5.6" rx="2.8" />
          <ellipse cx="24" cy="3.6" rx="6.4" ry="2.9" />
          <rect x="17" y="2.6" width="13.8" height="22.3" rx="5" />
          <rect x="11" y="8.2" width="10" height="4.6" rx="2.3" />
          <rect x="12.6" y="12.8" width="9" height="4.4" rx="2.2" />
          <rect x="14.4" y="17.2" width="8" height="4.2" rx="2.1" />
          <rect x="32.2" y="0" width="5.2" height="26" rx="1.2" />
        </g>
        <path d="M11.6 8.3H21M13.2 12.8H21.4M15 17.2h6.6M20 7.9c1.9-.5 3.5-1.5 4.5-2.9"
              fill="none" stroke="#000" strokeWidth="1.15" strokeLinecap="round" />
      </mask>
      <rect x="-2" y="-2" width="44" height="32" className="ms-ink-hand" mask={`url(#${id})`} />
    </g>
  );
}

function Impression({ kind, labels, date, seed }) {
  const id = `ms-ink-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (kind === 'received') {
    const word = labels.stamp;
    return (
      <svg className="ms-ink" viewBox="0 0 160 60" aria-hidden="true" focusable="false">
        <defs><InkFilter id={id} seed={seed} /></defs>
        <g filter={`url(#${id})`}>
          <rect x="2" y="2" width="156" height="56" rx="7" className="ms-ink-line" strokeWidth="3.2" />
          <rect x="7.5" y="7.5" width="145" height="45" rx="3.5" className="ms-ink-line" strokeWidth="1.2" />
          <text x="80" y="33" textAnchor="middle" className="ms-ink-word"
                {...(word.length > 8 ? { textLength: 128, lengthAdjust: 'spacingAndGlyphs' } : {})}>
            {word}
          </text>
          {date && <text x="80" y="46" textAnchor="middle" className="ms-ink-date">{date}</text>}
        </g>
      </svg>
    );
  }
  const [a, b] = labels.returnStamp;
  return (
    <svg className="ms-ink" viewBox="0 0 176 62" aria-hidden="true" focusable="false">
      <defs><InkFilter id={id} seed={seed} /></defs>
      <g filter={`url(#${id})`}>
        <rect x="2" y="2" width="172" height="58" rx="4" className="ms-ink-line" strokeWidth="3" />
        <Manicule id={`${id}-hand`} transform="translate(11 18)" />
        <text x="112" y="28" textAnchor="middle" className="ms-ink-word ms-ink-word-sm"
              {...(a.length > 9 ? { textLength: 108, lengthAdjust: 'spacingAndGlyphs' } : {})}>{a}</text>
        <text x="112" y="48" textAnchor="middle" className="ms-ink-word ms-ink-word-sm"
              {...(b.length > 9 ? { textLength: 108, lengthAdjust: 'spacingAndGlyphs' } : {})}>{b}</text>
      </g>
    </svg>
  );
}

/* ---- The stamp ------------------------------------------------------------
   Seen from above: the stamp comes down out of the air (big, because it's
   close to you), hits the paper, lifts away, and leaves its impression. The
   impression appears on the frame the rubber touches, and the row gives a
   small thump. With reduced motion only the impression fades in. */
const PRESS = 0.4;           // share of the stroke spent coming down
const STROKE = 0.56;         // seconds, down and back up

function Stamp({ kind, labels, date, seed, angle, shift, delay, still, onPress }) {
  const ref = useRef(null);
  const [wait] = useState(delay);
  const at = still ? 0 : wait + STROKE * PRESS;
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.setAttribute('data-inked', '');
      onPressRef.current?.();
    }, at * 1000);
    return () => clearTimeout(t);
  }, [at]);

  return (
    <motion.span
      ref={ref}
      className={`ms-stamp ms-stamp-${kind}`}
      data-kind={kind}
      style={{ rotate: angle, x: -shift }}
      exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.2 } }}
      aria-hidden="true"
    >
      <motion.span
        className="ms-impression"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={still ? { duration: 0.3 } : { duration: 0.05, delay: at }}
      >
        <Impression kind={kind} labels={labels} date={date} seed={seed} />
      </motion.span>
      {!still && (
        <motion.span
          className="ms-tool"
          initial={{ opacity: 0, scale: 1.9, y: -14 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [1.9, 1, 1, 1.42], y: [-14, 0, 0, -10] }}
          transition={{ duration: STROKE, times: [0, PRESS, PRESS + 0.16, 1], ease: ['easeIn', 'linear', 'easeOut'], delay: wait }}
        />
      )}
    </motion.span>
  );
}

/* ------------------------------------------------------------------------ */
/* Envelopes in the air                                                      */
/* ------------------------------------------------------------------------ */

/* ---- One envelope's trip -------------------------------------
   It pops out of the drag into the waiting stack, waits its
   turn, flies to just above the slot and squares up, then tips
   into the slot and slides down through it. The slot's bottom
   lip clips it (the wrapper's clip-path switches on as it goes
   in), so it disappears into the door. A refused file makes the
   same approach, knocks on the shut flap, bounces back and
   drops away. */
const APPROACH = 0.34;              // seconds, stack to slot
const INSERT = 0.28;                // seconds, through the slot
const FLY = [0.3, 0.7, 0.3, 1];     // fast out, gentle arrival
const SINK = [0.55, 0, 0.85, 0.35]; // slow to start, then gone

function Flight({ f, onInsert, onThrough, onBump, onGone }) {
  const { g } = f;
  const x = useMotionValue(f.x0 - g.envW / 2);
  const y = useMotionValue(f.y0 - g.envH / 2);
  const rotate = useMotionValue(f.rot);
  const scale = useMotionValue(0.62);
  const opacity = useMotionValue(0);
  const tilt = useMotionValue(0);
  const [phase, setPhase] = useState('wait');
  const on = useRef({});
  on.current = { onInsert, onThrough, onBump, onGone };

  useEffect(() => {
    const anims = [];
    let dead = false;
    const run = (mv, to, options) => {
      const a = animate(mv, to, options);
      anims.push(a);
      return a;
    };
    const tx = g.cx - g.envW / 2;   // centred on the slot
    const ty = g.top - g.envH + 1;  // bottom edge on the flap

    (async () => {
      run(opacity, 1, { duration: 0.14 });
      run(scale, 1, { type: 'spring', stiffness: 520, damping: 28 });

      // Wait in the stack, then fly to the slot and square up.
      const go = { duration: APPROACH, ease: FLY, delay: f.delay / 1000 };
      await Promise.all([
        run(x, tx, go),
        run(y, ty, go),
        run(rotate, 0, go),
      ]);
      if (dead) return;

      if (!f.refused) {
        // Tip in and slide down past the lip.
        setPhase('insert');
        on.current.onInsert(f);
        run(tilt, -26, { duration: INSERT, ease: 'easeIn' });
        await run(y, g.lip + 2, { duration: INSERT, ease: SINK });
        if (dead) return;
        setPhase('through');
        on.current.onThrough(f);
        on.current.onGone(f);
        return;
      }

      // Refused: knock on the flap, bounce back, drop away.
      setPhase('bump');
      await run(y, ty + 6, { duration: 0.09, ease: 'easeIn' });
      if (dead) return;
      on.current.onBump(f);
      await run(y, ty - 30, { duration: 0.2, ease: 'easeOut' });
      if (dead) return;
      setPhase('fall');
      const side = f.rot >= 0 ? 1 : -1;
      const fall = { duration: 0.62, ease: [0.5, 0, 1, 0.7] };
      run(rotate, side * 22, { duration: 0.62, ease: 'easeIn' });
      run(x, tx + side * 46, { duration: 0.62, ease: 'easeOut' });
      run(opacity, 0, { duration: 0.24, delay: 0.38 });
      await run(y, g.doorH + g.envH * 0.4, fall);
      if (dead) return;
      on.current.onGone(f);
    })();

    return () => {
      dead = true;
      anims.forEach((a) => a.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clip = phase === 'insert' || phase === 'through';
  return (
    <div
      className="ms-flight"
      style={{
        zIndex: f.z,
        perspectiveOrigin: `${g.cx}px ${g.lip}px`,
        clipPath: clip ? `polygon(-100vw -100vh, 200vw -100vh, 200vw ${g.lip}px, -100vw ${g.lip}px)` : undefined,
      }}
    >
      <motion.div
        className="ms-env"
        data-phase={phase}
        style={{ x, y, rotate, scale, opacity, rotateX: tilt, width: g.envW, height: g.envH, fontSize: g.envW / 19 }}
      >
        <Envelope name={f.name} size={f.size} kind={f.kind} />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* The tray                                                                  */
/* ------------------------------------------------------------------------ */

function Row({ item, labels, still, onCancel, onRetry, onRemove }) {
  const [scope, animateRow] = useAnimate();
  const born = useRef(0);
  if (!born.current && typeof performance !== 'undefined') born.current = performance.now();

  const busy = item.status === 'queued' || item.status === 'uploading';
  const pct = item.progress == null ? null : Math.round(item.progress * 100);
  const status =
    item.status === 'uploading' ? (pct == null ? labels.uploading : `${labels.uploading} ${pct}%`)
    : item.status === 'done' ? labels.received
    : item.status === 'error' ? labels.failed
    : item.status === 'canceled' ? labels.canceled
    : labels.queued;

  /* A stamp waits for its row to finish landing in the tray, and lands at
     its own angle and a little off centre, like one done by hand. */
  const age = typeof performance !== 'undefined' ? performance.now() - born.current : 1000;
  const stampDelay = still ? 0 : Math.max(0, 0.42 - age / 1000);
  const w = wobble(item.id);
  const nudge = wobble(`${item.id}:x`);

  /* The button you were on can disappear (Cancel becomes Retry, the upload
     finishes). Keep focus in the row rather than dropping it on the page. */
  const hadFocus = useRef(false);
  hadFocus.current = typeof document !== 'undefined' && !!scope.current?.contains(document.activeElement);
  useIsoLayoutEffect(() => {
    const el = scope.current;
    if (hadFocus.current && el && !el.contains(document.activeElement)) el.querySelector('button')?.focus();
  }, [item.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const thump = () => {
    if (!still && scope.current) animateRow(scope.current, { scale: [1, 0.982, 1], y: [0, 1.5, 0] }, { duration: 0.24, ease: 'easeOut' });
  };

  return (
    <motion.li
      layout="position"
      className="ms-item"
      data-row={item.id}
      initial={{ opacity: 0, y: -34, rotate: -1.4 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 440, damping: 32 }}
    >
      <div className="ms-row" ref={scope} data-status={item.status}>
        <span className="ms-postage" aria-hidden="true"><Glyph kind={item.kind} /></span>

        <div className="ms-row-body">
          <p className="ms-row-name" title={item.name}>{item.name}</p>
          <p className="ms-row-meta">
            <span>{formatBytes(item.size)}</span>
            <span className="ms-row-status">{status}</span>
          </p>
          {busy && (
            <div
              className="ms-bar"
              role="progressbar"
              aria-label={item.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={item.status === 'queued' ? 0 : pct ?? undefined}
              aria-valuetext={status}
            >
              {item.status === 'uploading' && pct == null ? (
                <span className="ms-bar-fill ms-bar-indeterminate" />
              ) : (
                <motion.span
                  className="ms-bar-fill"
                  initial={false}
                  animate={{ scaleX: item.progress || 0 }}
                  transition={{ type: 'spring', stiffness: 170, damping: 28 }}
                />
              )}
            </div>
          )}
          <AnimatePresence>
            {item.status === 'done' && (
              <Stamp
                key="received"
                kind="received"
                labels={labels}
                date={item.doneAt ? labels.date(new Date(item.doneAt)) : ''}
                seed={1 + Math.round(w * 90)}
                angle={-2.5 - w * 9}
                shift={nudge * 12}
                delay={stampDelay}
                still={still}
                onPress={thump}
              />
            )}
            {item.status === 'error' && (
              <Stamp
                key="return"
                kind="return"
                labels={labels}
                seed={2 + Math.round(w * 90)}
                angle={2 + w * 5}
                shift={nudge * 8}
                delay={stampDelay}
                still={still}
                onPress={thump}
              />
            )}
          </AnimatePresence>
        </div>

        <div className="ms-row-actions">
          {busy && (
            <button type="button" className="ms-btn" onClick={() => onCancel(item.id)}
                    aria-label={`${labels.cancel} ${item.name}`}>
              {labels.cancel}
            </button>
          )}
          {(item.status === 'error' || item.status === 'canceled') && (
            <button type="button" className="ms-btn ms-btn-retry" onClick={() => onRetry(item.id)}
                    aria-label={`${labels.retry} ${item.name}`}>
              <RetryIcon />
              <span>{labels.retry}</span>
            </button>
          )}
          {!busy && (
            <button type="button" className="ms-icon-btn" onClick={() => onRemove(item.id)}
                    aria-label={`${labels.remove} ${item.name}`} title={labels.remove}>
              <XIcon />
            </button>
          )}
        </div>

        {/* Under the name, across the full width, so the stamp never covers it. */}
        {item.status === 'error' && item.error && <p className="ms-row-error">{item.error}</p>}
      </div>
    </motion.li>
  );
}

/* ------------------------------------------------------------------------ */
/* Component                                                                 */
/* ------------------------------------------------------------------------ */

/* Where the flap goes for each state, and how it gets there. 'shut' is the
   clack after posting: fast, with one small bounce. 'rest' is the gentler
   fall back when a drag leaves. Angles are rotateX about the hinge along the
   flap's top edge; negative swings the bottom edge into the door. */
const FLAP = {
  rest: [0, { type: 'spring', stiffness: 420, damping: 19 }],
  peek: [-9, { type: 'spring', stiffness: 380, damping: 22 }],
  ajar: [-24, { type: 'spring', stiffness: 300, damping: 15 }],
  open: [-78, { type: 'spring', stiffness: 360, damping: 22 }],
  shut: [0, { type: 'spring', stiffness: 1100, damping: 34 }],
  rattle: [[0, -12, 4, -2, 0], { duration: 0.36, ease: 'easeOut' }],
};

const FLY_MAX = 6;           // envelopes animated per drop; the rest just land

const MailSlotUpload = forwardRef(function MailSlotUpload({
  onUpload,
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  concurrency = 3,
  onChange,
  disabled = false,
  labels: labelOverrides,
}, ref) {
  const labels = { ...LABELS, ...labelOverrides };
  const still = useMedia('(prefers-reduced-motion: reduce)');
  const touch = useMedia('(hover: none) and (pointer: coarse)');
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const hintId = `${baseId}-hint`;
  const rulesId = `${baseId}-rules`;
  const trayId = `${baseId}-tray`;

  /* The latest props, for callbacks that outlive the render they came from
     (uploads, flights, timers). */
  const live = useRef({});
  live.current = { onUpload, accept, maxSize, maxFiles, multiple, concurrency, onChange, disabled, labels, still };

  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const doorRef = useRef(null);
  const plateRef = useRef(null);
  const openingRef = useRef(null);
  const inputRef = useRef(null);

  const [k, setK] = useState(1);
  const kRef = useRef(1);
  const [narrow, setNarrow] = useState(false);
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  const [revision, setRevision] = useState(0);
  const [flights, setFlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [over, setOver] = useState(false);
  const [flap, setFlap] = useState('rest');
  const [announcement, setAnnouncement] = useState('');

  /* ---- The list ---------------------------------------------------------
     itemsRef is the source of truth, so async work always sees the current
     list; commit() hands a copy to React. Status changes render at once and
     reach onChange; progress ticks are batched to one render per frame. */
  const frame = useRef(0);
  function commit(structural) {
    if (structural) {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      setItems(itemsRef.current);
      setRevision((r) => r + 1);
    } else if (!frame.current) {
      frame.current = requestAnimationFrame(() => { frame.current = 0; setItems(itemsRef.current); });
    }
  }
  function patch(id, fields, structural = true) {
    itemsRef.current = itemsRef.current.map((it) => (it.id === id ? { ...it, ...fields } : it));
    commit(structural);
  }

  const flip = useRef(false);
  function announce(text) {
    // A trailing no-break space on every other message, so the same news
    // twice in a row is still read out.
    flip.current = !flip.current;
    setAnnouncement(`${text}${flip.current ? '' : ' '}`);
  }

  /* When the last upload settles, say how the batch went. */
  const tally = useRef({ done: 0, error: 0 });
  function reportIfIdle() {
    const busy = itemsRef.current.some((it) => it.status === 'queued' || it.status === 'uploading');
    const t = tally.current;
    if (busy || !(t.done || t.error)) return;
    announce(live.current.labels.settled(t.done, t.error));
    tally.current = { done: 0, error: 0 };
  }

  /* ---- Uploads ----------------------------------------------------------
     A small queue: oldest first, never more than `concurrency` at once. Each
     upload gets its own AbortController; Cancel, Remove and unmounting abort
     it, and a late answer from an aborted upload is ignored. */
  const controllers = useRef(new Map());

  function pump() {
    const limit = Math.max(1, Math.floor(live.current.concurrency) || 1);
    let free = limit - itemsRef.current.filter((it) => it.status === 'uploading').length;
    for (const it of itemsRef.current) {
      if (free <= 0) break;
      if (it.status === 'queued') { start(it); free -= 1; }
    }
  }

  function start(item) {
    const ctrl = new AbortController();
    controllers.current.set(item.id, ctrl);
    patch(item.id, { status: 'uploading', progress: null, error: null });

    const onProgress = (fraction) => {
      const v = Number(fraction);
      if (ctrl.signal.aborted || !Number.isFinite(v)) return;
      patch(item.id, { progress: Math.max(0, Math.min(1, v)) }, false);
    };
    let job;
    try {
      job = Promise.resolve(live.current.onUpload(item.file, { onProgress, signal: ctrl.signal }));
    } catch (err) {
      job = Promise.reject(err);
    }
    job.then(
      (result) => settle(item.id, ctrl, { status: 'done', progress: 1, result, doneAt: Date.now() }),
      (err) => settle(item.id, ctrl, isAbort(err)
        ? { status: 'canceled', progress: null }
        : { status: 'error', error: err?.message || live.current.labels.uploadError }),
    );
  }

  function settle(id, ctrl, fields) {
    if (controllers.current.get(id) !== ctrl) return;      // cancelled, removed or retried meanwhile
    controllers.current.delete(id);
    patch(id, fields);
    if (fields.status === 'done') tally.current.done += 1;
    if (fields.status === 'error') tally.current.error += 1;
    pump();
    reportIfIdle();
  }

  function cancel(id) {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it || (it.status !== 'queued' && it.status !== 'uploading')) return;
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    patch(id, { status: 'canceled', progress: null });
    announce(live.current.labels.canceledFile(it.name));
    pump();
  }

  function retry(id) {
    patch(id, { status: 'queued', progress: null, error: null, result: undefined, doneAt: null });
    pump();
  }

  /* Removing a row moves focus to its neighbour below, or above, or back to
     the letterbox, so keyboard users never land on the page's body. */
  const focusNext = useRef(null);
  function remove(id) {
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it) return;
    const shown = itemsRef.current.filter((x) => x.landed).reverse();
    const i = shown.findIndex((x) => x.id === id);
    focusNext.current = shown[i + 1]?.id || shown[i - 1]?.id || 'slot';
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    itemsRef.current = itemsRef.current.filter((x) => x.id !== id);
    commit(true);
    announce(live.current.labels.removedFile(it.name));
    pump();
  }

  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    const row = target !== 'slot' && rootRef.current?.querySelector(`[data-row="${target}"] button`);
    (row || plateRef.current)?.focus();
  }, [items]);

  useEffect(() => {
    if (revision) live.current.onChange?.(itemsRef.current.map(publicItem));
  }, [revision]);

  /* ---- The flap ---------------------------------------------------------
     One motion value, driven imperatively: whoever needs the flap (a drag,
     the pointer, an envelope) asks for a state and it springs there. While
     envelopes are in the air they own it. */
  const flapAngle = useMotionValue(0);
  const flapState = useRef('rest');
  const flapAnim = useRef(null);
  const flapTimer = useRef(0);
  const inFlight = useRef(0);
  const overRef = useRef(false);
  const hoverRef = useRef(false);

  function setFlapTo(state) {
    if (state === flapState.current && state !== 'rattle') return;
    flapState.current = state;
    setFlap(state);
    flapAnim.current?.stop();
    clearTimeout(flapTimer.current);
    if (live.current.still) { flapAngle.set(0); return; }
    const [to, transition] = FLAP[state];
    flapAnim.current = animate(flapAngle, to, transition);
    if (state === 'shut' || state === 'rattle') {
      flapTimer.current = setTimeout(restFlap, 420);   // then back to whatever the pointer is doing
    }
  }

  function restFlap() {
    if (inFlight.current > 0) return;
    setFlapTo(overRef.current ? 'ajar' : hoverRef.current ? 'peek' : 'rest');
  }

  /* ---- Posting ----------------------------------------------------------
     Every file is checked at the door. The ones that pass are queued for
     upload straight away and become envelopes: they wait in a fanned stack
     where they were dropped, then take turns through the slot. The flap
     swings open for the first and clacks shut after the last, and each row
     appears in the tray only once its envelope has fallen through. Refused
     files queue up behind them and bounce off the shut flap. */
  const slotFree = useRef(0);

  function post(fileList, point) {
    const { disabled: off, accept: acc, maxSize: max, maxFiles: cap, multiple: many, labels: L, still: calm } = live.current;
    const files = Array.from(fileList || []);
    if (off || !files.length) return;

    let room = cap > 0 ? cap - itemsRef.current.length : Infinity;
    const accepted = [];
    const refused = [];
    files.forEach((file, i) => {
      const reason =
        !many && i > 0 ? L.oneAtATime
        : !matchesAccept(file, acc) ? L.wrongType
        : max > 0 && file.size > max ? L.tooBig(formatBytes(max))
        : room <= 0 ? L.tooMany(cap)
        : null;
      if (reason) refused.push({ id: uid(), file, reason });
      else { accepted.push(file); room -= 1; }
    });

    const fresh = accepted.map((file) => ({
      id: uid(), file, name: file.name, size: file.size, type: file.type, kind: fileKind(file),
      status: 'queued', progress: null, error: null, result: undefined, landed: calm,
    }));
    setNotes([]);
    if (fresh.length) {
      itemsRef.current = [...itemsRef.current, ...fresh];
      commit(true);
      pump();
    }

    const g = !calm && measure();
    if (!g) {                            // reduced motion: no trip through the slot
      if (fresh.length && !calm) land(fresh.map((it) => it.id));
      refuse(refused);
      return;
    }

    const now = performance.now();
    const base = Math.max(0, slotFree.current - now) + 120;
    const fly = fresh.slice(0, FLY_MAX);
    const gap = fly.length + refused.length > 3 ? 300 : 400;
    const trip = (APPROACH + INSERT) * 1000;
    const from = point ? clampToDoor(point, g) : { x: g.cx, y: g.doorH - g.envH / 2 - 10 * kRef.current };

    const plan = fly.map((it, i) => ({
      id: `fl-${it.id}`, itemId: it.id, name: it.name, size: formatBytes(it.size), kind: it.kind,
      delay: base + i * gap,
      also: i === fly.length - 1 ? fresh.slice(FLY_MAX).map((x) => x.id) : [],
    }));
    const after = fly.length ? base + (fly.length - 1) * gap + trip + 380 : base;
    refused.forEach((r, j) => plan.push({
      id: `fl-${r.id}`, refused: r, name: r.file.name, size: formatBytes(r.file.size), kind: fileKind(r.file),
      delay: after + j * gap,
    }));
    if (!plan.length) return;
    slotFree.current = now + plan[plan.length - 1].delay + trip;

    // The stack: the first in line on top, the rest fanned out behind it.
    const TILT = [-6, 5, -3, 7, -5, 3, -7, 4];
    plan.forEach((f, i) => {
      Object.assign(f, { g, x0: from.x + i * 4 * kRef.current, y0: from.y - i * 3 * kRef.current, rot: TILT[i % TILT.length], z: plan.length - i });
    });
    inFlight.current += fly.length;
    setFlights((fs) => [...fs, ...plan]);
  }

  function land(ids) {
    itemsRef.current = itemsRef.current.map((it) => (ids.includes(it.id) ? { ...it, landed: true } : it));
    commit(false);
  }

  function refuse(list) {
    if (!list.length) return;
    const L = live.current.labels;
    setNotes((ns) => [...ns, ...list.map((r) => ({ id: r.id, text: L.bounced(r.file.name, r.reason) }))]);
    announce(list.map((r) => L.bounced(r.file.name, r.reason)).join(' '));
  }

  /* Where the slot is, in the stage's own pixels: offsets rather than
     getBoundingClientRect, so a CSS zoom or transform on an ancestor doesn't
     throw the envelopes off. */
  function measure() {
    const stage = stageRef.current;
    const opening = openingRef.current;
    const door = doorRef.current;
    if (!stage || !opening || !door) return null;
    let x = 0;
    let y = 0;
    let el = opening;
    while (el && el !== stage) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    if (el !== stage) return null;
    const w = opening.offsetWidth;
    const envW = Math.min(w * 0.76, 190 * kRef.current);
    return { cx: x + w / 2, top: y, lip: y + opening.offsetHeight, envW, envH: envW * 0.58, doorW: door.offsetWidth, doorH: door.offsetHeight };
  }

  function toStage(e) {
    const stage = stageRef.current;
    if (!stage || !Number.isFinite(e.clientX)) return null;
    const r = stage.getBoundingClientRect();
    const s = r.width / stage.offsetWidth || 1;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  }

  function clampToDoor(p, g) {
    const mx = g.envW / 2 + 6;
    const my = g.envH / 2 + 6;
    return {
      x: Math.min(Math.max(p.x, mx), g.doorW - mx),
      y: Math.min(Math.max(p.y, my), g.doorH - my),
    };
  }

  /* An envelope's milestones. The flap opens for the first one in, shuts
     once the last is through, and rattles when a refused one knocks. */
  const onInsert = () => setFlapTo('open');
  const onThrough = (f) => {
    land([f.itemId, ...f.also]);
    inFlight.current = Math.max(0, inFlight.current - 1);
    if (inFlight.current === 0) setFlapTo('shut');
  };
  const onBump = () => { if (flapState.current !== 'open') setFlapTo('rattle'); };
  const onGone = (f) => {
    setFlights((fs) => fs.filter((x) => x.id !== f.id));
    if (f.refused) refuse([f.refused]);
  };

  /* ---- Dragging files over ----------------------------------------------
     dragenter and dragleave fire for every child the pointer crosses, so a
     depth count decides when the files have really arrived or left. Only
     drags that carry files count; dragging text or a link does nothing. */
  const depth = useRef(0);
  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  function setOverState(v) {
    overRef.current = v;
    setOver(v);
    restFlap();
  }

  function onDragEnter(e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (live.current.disabled) return;
    depth.current += 1;
    if (!overRef.current) setOverState(true);
  }
  function onDragOver(e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = live.current.disabled ? 'none' : 'copy';
    if (!overRef.current && !live.current.disabled) { depth.current = Math.max(1, depth.current); setOverState(true); }
  }
  function onDragLeave(e) {
    if (!hasFiles(e)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0 && overRef.current) setOverState(false);
  }
  function onDrop(e) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth.current = 0;
    post(e.dataTransfer.files, toStage(e));
    // After post(), so the flap stays up until the first envelope pushes it.
    overRef.current = false;
    setOver(false);
    restFlap();
  }

  function openPicker() {
    if (!live.current.disabled) inputRef.current?.click();
  }
  function onPicked(e) {
    post(e.target.files, null);
    e.target.value = '';                 // so picking the same file again still fires
  }

  function onPlateEnter(e) {
    if (e.pointerType !== 'mouse') return;
    hoverRef.current = true;
    restFlap();
  }
  function onPlateLeave(e) {
    if (e.pointerType !== 'mouse') return;
    hoverRef.current = false;
    restFlap();
  }

  useImperativeHandle(ref, () => ({ open: openPicker, addFiles: (files) => post(files, null) }));

  /* ---- Size -------------------------------------------------------------
     The door and its hardware scale with the component's width through
     --ms-k: full size from 600px, down to 0.62 on a phone. Under 480px the
     rows go compact (smaller stamps, an icon-only Retry). Measured on the
     component rather than the viewport, so it also works in a sidebar. */
  useIsoLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const apply = () => {
      const next = Math.round(Math.min(1, Math.max(0.62, el.clientWidth / 600)) * 1000) / 1000;
      if (next !== kRef.current) { kRef.current = next; setK(next); }
      setNarrow(el.clientWidth < 480);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Leave nothing running behind. */
  useEffect(() => () => {
    controllers.current.forEach((c) => c.abort());
    controllers.current.clear();
    cancelAnimationFrame(frame.current);
    clearTimeout(flapTimer.current);
    flapAnim.current?.stop();
  }, []);

  /* ---- Render ----------------------------------------------------------- */
  const shown = items.filter((it) => it.landed).reverse();     // newest post on top
  const received = shown.filter((it) => it.status === 'done').length;
  const typeText = describeAccept(accept);
  const rules = labels.rules !== undefined
    ? labels.rules
    : [typeText, maxSize > 0 && labels.upTo(formatBytes(maxSize)), maxFiles > 0 && labels.atMost(maxFiles)]
      .filter(Boolean).join(' · ');

  const rootClass = [
    'mail-slot-root',
    over && 'is-over',
    narrow && 'is-narrow',
    disabled && 'is-disabled',
    still && 'is-still',
  ].filter(Boolean).join(' ');

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={rootRef}
        className={rootClass}
        data-flap={flap}
        style={{ '--ms-k': k }}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="ms-input"
          accept={accept}
          multiple={multiple}
          onChange={onPicked}
          tabIndex={-1}
          aria-hidden="true"
          hidden
        />

        <div className="ms-stage" ref={stageRef}>
          {/* The door. Clicking anywhere on it opens the picker too, but the
              letterbox is the control: a real button, labelled, focusable. */}
          <div className="ms-door" ref={doorRef} onClick={openPicker}>
            <span className="ms-panel ms-panel-top" aria-hidden="true" />
            <span className="ms-panel ms-panel-bottom" aria-hidden="true" />
            <button
              ref={plateRef}
              type="button"
              className="ms-plate"
              aria-label={labels.slot}
              aria-describedby={rules ? `${hintId} ${rulesId}` : hintId}
              disabled={disabled}
              onClick={(e) => { e.stopPropagation(); openPicker(); }}
              onPointerEnter={onPlateEnter}
              onPointerLeave={onPlateLeave}
            >
              <span className="ms-screw" aria-hidden="true" />
              <span className="ms-screw" aria-hidden="true" />
              <span className="ms-opening" ref={openingRef} aria-hidden="true">
                <span className="ms-light" />
                <motion.span className="ms-flap" style={{ rotateX: flapAngle }}>
                  <span className="ms-flap-word">{labels.flap}</span>
                </motion.span>
              </span>
            </button>
          </div>

          <div className="ms-flights" aria-hidden="true">
            {flights.map((f) => (
              <Flight key={f.id} f={f} onInsert={onInsert} onThrough={onThrough} onBump={onBump} onGone={onGone} />
            ))}
          </div>
        </div>

        <div className="ms-caption">
          <p className="ms-hint" id={hintId}>
            {over ? labels.release : touch ? labels.hintTouch : (
              <>
                {labels.hint}{' '}
                <span className="ms-choose" onClick={openPicker}>{labels.choose}</span>
              </>
            )}
          </p>
          {rules && <p className="ms-rules" id={rulesId}>{rules}</p>}
        </div>

        <AnimatePresence initial={false}>
          {notes.length > 0 && (
            <motion.div
              key="notes"
              className="ms-notes-wrap"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
            >
              <div className="ms-notes">
                <ReturnedIcon />
                <ul>
                  {notes.map((n) => <li key={n.id}>{n.text}</li>)}
                </ul>
                <button
                  type="button"
                  className="ms-notes-dismiss"
                  onClick={() => { setNotes([]); plateRef.current?.focus(); }}
                >
                  {labels.dismiss}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="ms-tray" aria-labelledby={trayId}>
          <div className="ms-tray-head">
            <p className="ms-tray-title" id={trayId}>{labels.tray}</p>
            {shown.length > 0 && <p className="ms-tray-count">{labels.count(received, shown.length)}</p>}
          </div>
          <ul className="ms-list">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  labels={labels}
                  still={still}
                  onCancel={cancel}
                  onRetry={retry}
                  onRemove={remove}
                />
              ))}
            </AnimatePresence>
          </ul>
          {shown.length === 0 && <p className="ms-empty">{labels.empty}</p>}
        </section>

        <p className="ms-sr" role="status">{announcement}</p>
      </div>
    </MotionConfig>
  );
});

export default MailSlotUpload;
