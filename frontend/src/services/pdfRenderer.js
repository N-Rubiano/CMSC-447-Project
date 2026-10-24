import * as pdfjsLib from 'pdfjs-dist';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

/**
 * Render an uploaded PDF page onto a canvas with 4K ultra-high resolution
 */
export async function renderPdfToCanvas(pdfUrl, pageIndex, canvas, customScale = null) {
  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const pageNumber = Math.min(pageIndex + 1, pdf.numPages);
    const page = await pdf.getPage(pageNumber);

    const baseViewport = page.getViewport({ scale: 1.0 });

    // Target 4K resolution (at least 3600-4200px wide for crisp vector CAD zooming)
    let scale = customScale;
    if (!scale) {
      scale = Math.max(2.5, Math.min(5.0, 3840 / (baseViewport.width || 1200)));
    }

    const viewport = page.getViewport({ scale });
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const renderContext = {
      canvasContext: ctx,
      viewport
    };

    await page.render(renderContext).promise;
    return {
      width: baseViewport.width,
      height: baseViewport.height,
      pixelWidth: viewport.width,
      pixelHeight: viewport.height,
      success: true
    };
  } catch (err) {
    console.warn('PDF.js render fallback to CAD vector generator:', err);
    return { success: false, error: err };
  }
}

/**
 * High-definition Architectural CAD Floor Plan Generator (White / Yellow / Brown / Black / Red Theme)
 */
export function drawCadArchitecturalPlan(canvas, sheet, project) {
  const ctx = canvas.getContext('2d');
  ctx.save();
  const baseW = 1200;
  const baseH = 800;
  const scale = canvas.width / baseW;
  if (scale && scale !== 1) {
    ctx.scale(scale, scale);
  }
  const w = baseW;
  const h = baseH;

  // Background - Crisp White architectural drafting paper
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural grid (warm gray/brown tint)
  ctx.strokeStyle = '#F0EBE1';
  ctx.lineWidth = 0.75;
  const gridStep = 40;
  for (let x = 0; x < w; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Outer Border & Sheet Margins (Bold Black & Double Line)
  const margin = 30;
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);

  // Inner Drafting Margin (Warm Brown)
  ctx.strokeStyle = '#5C3A21';
  ctx.lineWidth = 1;
  ctx.strokeRect(margin + 6, margin + 6, w - margin * 2 - 12, h - margin * 2 - 12);

  // Column Grid Lines & Grid Bubbles
  const colGridX = [140, 320, 520, 720, 920, 1120];
  const colLabelsX = ['A', 'B', 'C', 'D', 'E', 'F'];
  const colGridY = [120, 280, 460, 640];
  const colLabelsY = ['1', '2', '3', '4'];

  ctx.strokeStyle = '#A8A29E';
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 4, 2, 4]);

  // Vertical Grid Lines
  colGridX.forEach((gx, i) => {
    ctx.beginPath();
    ctx.moveTo(gx, margin + 20);
    ctx.lineTo(gx, h - margin - 120);
    ctx.stroke();

    // Grid Bubble Top
    ctx.setLineDash([]);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#5C3A21';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gx, margin + 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#18181B';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(colLabelsX[i], gx, margin + 18);
    ctx.setLineDash([8, 4, 2, 4]);
  });

  // Horizontal Grid Lines
  colGridY.forEach((gy, i) => {
    ctx.beginPath();
    ctx.moveTo(margin + 20, gy);
    ctx.lineTo(w - margin - 20, gy);
    ctx.stroke();

    // Grid Bubble Left
    ctx.setLineDash([]);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#5C3A21';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(margin + 18, gy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#18181B';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(colLabelsY[i], margin + 18, gy);
    ctx.setLineDash([8, 4, 2, 4]);
  });

  ctx.setLineDash([]); // Reset line dash

  // Structural Columns (Concrete / Steel - Charcoal Black & Brown Hatches)
  colGridX.forEach(gx => {
    colGridY.forEach(gy => {
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = 2;
      ctx.fillRect(gx - 10, gy - 10, 20, 20);
      ctx.strokeRect(gx - 10, gy - 10, 20, 20);

      // Column cross hatch
      ctx.strokeStyle = '#EAB308';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - 10, gy - 10);
      ctx.lineTo(gx + 10, gy + 10);
      ctx.moveTo(gx + 10, gy - 10);
      ctx.lineTo(gx - 10, gy + 10);
      ctx.stroke();
    });
  });

  // Structural Exterior / Shear Walls (Bold Black Heavy Lineweight)
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 4.5;
  ctx.fillStyle = '#FAFAF9';

  // Main Building Perimeter
  ctx.beginPath();
  ctx.rect(140, 120, 980, 520);
  ctx.stroke();

  // Central Core (Elevators & Stairwells)
  ctx.lineWidth = 3;
  ctx.strokeRect(420, 240, 320, 260);

  // Elevator Shafts
  ctx.fillStyle = '#F5F5F4';
  ctx.strokeStyle = '#44403C';
  ctx.lineWidth = 2;
  [440, 510, 580].forEach(ex => {
    ctx.fillRect(ex, 260, 55, 65);
    ctx.strokeRect(ex, 260, 55, 65);
    // Elevator "X" symbol
    ctx.beginPath();
    ctx.moveTo(ex, 260);
    ctx.lineTo(ex + 55, 325);
    ctx.moveTo(ex + 55, 260);
    ctx.lineTo(ex, 325);
    ctx.stroke();
  });

  // Stairwell 1
  ctx.fillRect(440, 350, 125, 130);
  ctx.strokeRect(440, 350, 125, 130);
  for (let sy = 360; sy < 470; sy += 12) {
    ctx.beginPath();
    ctx.moveTo(440, sy);
    ctx.lineTo(565, sy);
    ctx.stroke();
  }

  // Electrical Room & Switchgear (Grid Line B-C) - Warm Yellow Tone
  ctx.strokeRect(140, 240, 220, 220);
  ctx.fillStyle = 'rgba(234, 179, 8, 0.12)';
  ctx.fillRect(140, 240, 220, 220);

  // J-boxes and switchgear panels (Yellow & Black)
  ctx.strokeStyle = '#D97706';
  ctx.fillStyle = '#FEF3C7';
  ctx.lineWidth = 1.5;
  [160, 210, 260].forEach(px => {
    ctx.fillRect(px, 250, 35, 15);
    ctx.strokeRect(px, 250, 35, 15);
    ctx.fillRect(px, 435, 35, 15);
    ctx.strokeRect(px, 435, 35, 15);
  });

  // Main Mechanical / HVAC Room (Grid Line D-E) - Warm Timber / Sand Tone
  ctx.strokeRect(780, 240, 340, 220);
  ctx.fillStyle = 'rgba(92, 58, 33, 0.08)';
  ctx.fillRect(780, 240, 340, 220);

  // HVAC Main Trunk Duct (Warm Brown & Gold)
  ctx.strokeStyle = '#5C3A21';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, 190);
  ctx.lineTo(1120, 190);
  ctx.moveTo(140, 210);
  ctx.lineTo(1120, 210);
  ctx.stroke();

  // Diffusers (Circles with X)
  [220, 360, 680, 880, 1020].forEach(dx => {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(dx, 200, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx - 6, 200);
    ctx.lineTo(dx + 6, 200);
    ctx.moveTo(dx, 194);
    ctx.lineTo(dx, 206);
    ctx.stroke();
  });

  // Interior Partitions & Suites (Crisp Charcoal)
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 2;

  // West Retail Suite 101 - Warm Timber Floor Hatch
  ctx.fillStyle = 'rgba(245, 245, 244, 0.6)';
  ctx.fillRect(140, 460, 280, 180);
  ctx.strokeRect(140, 460, 280, 180);

  // East Conference Suite 102
  ctx.fillStyle = 'rgba(254, 243, 199, 0.3)';
  ctx.fillRect(740, 460, 380, 180);
  ctx.strokeRect(740, 460, 380, 180);

  // Doors with Swing Arcs (Brown & Dashed Arc)
  const drawDoor = (x, y, size, angle) => {
    ctx.strokeStyle = '#5C3A21';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();
    // Arc
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawDoor(280, 460, 32, 0);
  drawDoor(420, 360, 32, 0);
  drawDoor(740, 460, 32, 0);
  drawDoor(360, 240, 32, 0);

  // Room Name Tags & Dimensions (Yellow / Brown / Black / Red accents)
  const roomTags = [
    { name: 'MAIN ELEC ROOM 104', sub: '200A 480V 3PH', x: 250, y: 350, bg: '#FEF3C7', border: '#D97706', text: '#92400E' },
    { name: 'CENTRAL CORE / ELEVATORS', sub: '3x PASSENGER CARS', x: 580, y: 300, bg: '#F5F5F4', border: '#5C3A21', text: '#1C1917' },
    { name: 'MAIN LOBBY & RECEPTION', sub: 'LEVEL 1 — 3,850 SQ FT', x: 580, y: 560, bg: '#FDFBF7', border: '#5C3A21', text: '#5C3A21' },
    { name: 'PRIMARY MECH / AHU-1', sub: '12,500 CFM VAV SYSTEM', x: 950, y: 350, bg: '#FEF9C3', border: '#CA8A04', text: '#854D0E' },
    { name: 'RETAIL TENANT SUITE 101', sub: 'SHELL CONDITION', x: 280, y: 550, bg: '#F5F5F4', border: '#78716C', text: '#18181B' },
    { name: 'EXECUTIVE CONF SUITE 102', sub: 'ACOUSTIC STC 52', x: 930, y: 550, bg: '#FEF2F2', border: '#DC2626', text: '#991B1B' }
  ];

  roomTags.forEach(tag => {
    ctx.fillStyle = tag.bg;
    ctx.strokeStyle = tag.border;
    ctx.lineWidth = 1.2;
    ctx.fillRect(tag.x - 90, tag.y - 18, 180, 36);
    ctx.strokeRect(tag.x - 90, tag.y - 18, 180, 36);

    ctx.fillStyle = tag.text;
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag.name, tag.x, tag.y - 5);

    ctx.fillStyle = '#78716C';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillText(tag.sub, tag.x, tag.y + 9);
  });

  // Architectural Dimension Strings (Top & Right)
  ctx.strokeStyle = '#5C3A21';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#44403C';
  ctx.font = '9px JetBrains Mono, monospace';

  // Dimension top: 140 -> 420 -> 740 -> 1120
  ctx.beginPath();
  ctx.moveTo(140, 80);
  ctx.lineTo(1120, 80);
  ctx.stroke();

  [140, 420, 740, 1120].forEach(dx => {
    ctx.beginPath();
    ctx.moveTo(dx - 5, 75);
    ctx.lineTo(dx + 5, 85);
    ctx.stroke();
  });
  ctx.fillText('28\'-0"', 280, 70);
  ctx.fillText('32\'-0"', 580, 70);
  ctx.fillText('38\'-0"', 930, 70);

  // Professional CAD Title Block (Bottom Right Corner - Brown Header & Yellow Sheet Box)
  const tbW = 340;
  const tbH = 110;
  const tbX = w - margin - tbW - 6;
  const tbY = h - margin - tbH - 6;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = 2;
  ctx.fillRect(tbX, tbY, tbW, tbH);
  ctx.strokeRect(tbX, tbY, tbW, tbH);

  // Header band (Warm Brown)
  ctx.fillStyle = '#5C3A21';
  ctx.fillRect(tbX, tbY, tbW, 36);

  // Title Block Grid Lines
  ctx.strokeStyle = '#DCD5C8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tbX, tbY + 72);
  ctx.lineTo(tbX + tbW, tbY + 72);
  ctx.moveTo(tbX + 220, tbY + 36);
  ctx.lineTo(tbX + 220, tbY + tbH);
  ctx.stroke();

  // Project Info
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillText((project?.name || 'CONSTRUCTION DRAWINGS').toUpperCase(), tbX + 12, tbY + 16);

  ctx.fillStyle = '#FEF3C7';
  ctx.font = '8.5px JetBrains Mono, monospace';
  ctx.fillText(`CODE: ${project?.code || 'PRJ'} | ${project?.address || 'Site Location'}`, tbX + 12, tbY + 28);

  // Sheet Title
  ctx.fillStyle = '#18181B';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillText(sheet.name || 'Floor Plan Layout', tbX + 12, tbY + 54);

  // Discipline & Scale
  ctx.fillStyle = '#78716C';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.fillText(`DISCIPLINE: ${(sheet.discipline || 'ARCH').toUpperCase()}`, tbX + 12, tbY + 88);
  ctx.fillText(`SCALE: ${sheet.scale_ratio || '1/4" = 1\'-0"'}`, tbX + 12, tbY + 100);

  // Sheet Number Box (Large Yellow CAD identifier with brown border)
  ctx.fillStyle = '#FEF3C7';
  ctx.fillRect(tbX + 221, tbY + 37, tbW - 222, tbH - 38);

  ctx.fillStyle = '#D97706';
  ctx.font = 'bold 22px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(sheet.sheet_number || 'A-101', tbX + 280, tbY + 68);

  ctx.fillStyle = '#5C3A21';
  ctx.font = 'bold 9px JetBrains Mono, monospace';
  ctx.fillText(sheet.version || 'REV 3 (IFC)', tbX + 280, tbY + 94);
  ctx.restore();
}
