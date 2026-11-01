export function initExportSystem(stage, THREE) {
  const exportPanel   = document.getElementById('export-panel');
  const exportMask    = document.getElementById('export-mask');
  const exportFrame   = document.getElementById('export-frame');
  const frameToolbar  = document.getElementById('export-frame-toolbar');
  const resizeHandle  = document.getElementById('export-resize-handle');
  const annotLayer    = document.getElementById('annotation-layer');
  const annotList     = document.getElementById('annotation-list');
  const presetSelect  = document.getElementById('export-preset');
  const bgSelect      = document.getElementById('export-bg');
  const colorPicker   = document.getElementById('annotation-color');
  const btnAddText    = document.getElementById('btn-add-text');
  const btnAddArrow   = document.getElementById('btn-add-arrow');
  const btnDoExport   = document.getElementById('btn-do-export');
  const uiOverlay     = document.getElementById('ui-overlay');
  const propertiesPanel = document.getElementById('properties-panel');
  let exportActive = false;
  let propertiesPanelWasHidden = false;
  const ratioPresets = {
    '16:9': [16, 9],
    '9:16': [9, 16],
    '1:1': [1, 1],
  };
  const frameRect = { x: 0, y: 0, width: 0, height: 0 };
  let frameDrag = null;
  let frameResize = null;

  // Track all annotation objects
  const annotations = []; // { id, type, el, data }
  let selectedAnnotId = null;
  let annoCounter = 0;

  // ── Frame sizing ────────────────────────────────────────────────────────────
  function getAspectRatio() {
    const [ratioW, ratioH] = ratioPresets[presetSelect.value] || ratioPresets['16:9'];
    return ratioW / ratioH;
  }

  function getCanvasRect() {
    return stage.renderer.domElement.getBoundingClientRect();
  }

  function clampFrame() {
    const canvasRect = getCanvasRect();
    const aspect = getAspectRatio();
    const minWidth = Math.min(canvasRect.width, Math.max(220, aspect >= 1 ? 220 : 180 * aspect));
    const maxWidth = Math.min(canvasRect.width, canvasRect.height * aspect);

    frameRect.width = Math.min(Math.max(frameRect.width, minWidth), maxWidth);
    frameRect.height = frameRect.width / aspect;

    if (frameRect.height > canvasRect.height) {
      frameRect.height = canvasRect.height;
      frameRect.width = frameRect.height * aspect;
    }

    const maxX = canvasRect.right - frameRect.width;
    const maxY = canvasRect.bottom - frameRect.height;

    frameRect.x = Math.min(Math.max(frameRect.x, canvasRect.left), maxX);
    frameRect.y = Math.min(Math.max(frameRect.y, canvasRect.top), maxY);
  }

  function applyFrameRect() {
    exportFrame.style.left = `${Math.round(frameRect.x)}px`;
    exportFrame.style.top = `${Math.round(frameRect.y)}px`;
    exportFrame.style.width = `${Math.round(frameRect.width)}px`;
    exportFrame.style.height = `${Math.round(frameRect.height)}px`;
    exportFrame.style.transform = '';
  }

  function updateFrameSize(resetPosition = false) {
    if (!exportActive) return;
    const canvasRect = getCanvasRect();
    const aspect = getAspectRatio();
    const availableWidth = Math.max(320, Math.min(canvasRect.width - 48, window.innerWidth - 380));
    const availableHeight = Math.max(240, canvasRect.height - 120);
    const widthFromHeight = availableHeight * aspect;
    const heightFromWidth = availableWidth / aspect;
    const width = Math.round(Math.min(availableWidth, widthFromHeight));
    const height = Math.round(Math.min(availableHeight, heightFromWidth));
    const previousCenterX = frameRect.x + frameRect.width / 2;
    const previousCenterY = frameRect.y + frameRect.height / 2;

    frameRect.width = width;
    frameRect.height = height;

    if (resetPosition || (!frameRect.x && !frameRect.y)) {
      frameRect.x = canvasRect.left + Math.max(24, (Math.min(canvasRect.width, availableWidth) - width) / 2);
      frameRect.y = canvasRect.top + Math.max(24, (canvasRect.height - height) / 2);
    } else {
      frameRect.x = previousCenterX - width / 2;
      frameRect.y = previousCenterY - height / 2;
    }

    clampFrame();
    applyFrameRect();
  }

  document.getElementById('btn-export').addEventListener('click', () => {
    exportActive = true;
    exportPanel.classList.remove('hidden');
    exportMask.classList.remove('hidden');
    propertiesPanelWasHidden = propertiesPanel.classList.contains('hidden');
    uiOverlay.classList.add('hidden');
    propertiesPanel.classList.add('hidden');
    updateFrameSize(true);
    if (stage.controls) stage.controls.enabled = false;
  });

  const closeExport = () => {
    if (!exportActive) return;
    exportActive = false;
    exportPanel.classList.add('hidden');
    exportMask.classList.add('hidden');
    uiOverlay.classList.remove('hidden');
    if (!propertiesPanelWasHidden) propertiesPanel.classList.remove('hidden');
    frameDrag = null;
    frameResize = null;
    if (stage.controls) stage.controls.enabled = true;
  };

  document.getElementById('btn-close-export').addEventListener('click', closeExport);
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && exportActive) closeExport();
  });
  presetSelect.addEventListener('change', () => updateFrameSize(false));
  window.addEventListener('resize', () => updateFrameSize(false));

  frameToolbar.addEventListener('pointerdown', e => {
    if (!exportActive) return;
    frameDrag = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      frameX: frameRect.x,
      frameY: frameRect.y,
    };
    frameToolbar.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  resizeHandle.addEventListener('pointerdown', e => {
    if (!exportActive) return;
    frameResize = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: frameRect.width,
      height: frameRect.height,
      x: frameRect.x,
      y: frameRect.y,
    };
    resizeHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener('pointermove', e => {
    if (frameDrag && e.pointerId === frameDrag.pointerId) {
      frameRect.x = frameDrag.frameX + (e.clientX - frameDrag.startX);
      frameRect.y = frameDrag.frameY + (e.clientY - frameDrag.startY);
      clampFrame();
      applyFrameRect();
    }

    if (frameResize && e.pointerId === frameResize.pointerId) {
      const aspect = getAspectRatio();
      const widthFromX = frameResize.width + (e.clientX - frameResize.startX);
      const widthFromY = (frameResize.height + (e.clientY - frameResize.startY)) * aspect;
      frameRect.width = Math.abs(widthFromX - frameResize.width) >= Math.abs(widthFromY - frameResize.width) ? widthFromX : widthFromY;
      frameRect.height = frameRect.width / aspect;
      frameRect.x = frameResize.x;
      frameRect.y = frameResize.y;
      clampFrame();
      applyFrameRect();
    }
  });

  window.addEventListener('pointerup', e => {
    if (frameDrag && e.pointerId === frameDrag.pointerId) frameDrag = null;
    if (frameResize && e.pointerId === frameResize.pointerId) frameResize = null;
  });

  // ── Annotation helpers ──────────────────────────────────────────────────────
  function getFrameScale() {
    return 1;
  }

  function applyTransform(el, data) {
    el.style.left = data.x + 'px';
    el.style.top  = data.y + 'px';
    el.style.transform = `rotate(${data.rot}deg) scale(${data.sx}, ${data.sy})`;
    el.style.transformOrigin = 'top left';
  }

  function makeDraggable(el, data) {
    let down = false, sx, sy;
    el.addEventListener('pointerdown', e => {
      if (e.target.classList.contains('anno-resize-handle')) return;
      down = true; sx = e.clientX; sy = e.clientY;
      e.stopPropagation();
      selectAnnotation(data.id);
    });
    document.addEventListener('pointermove', e => {
      if (!down) return;
      const scale = getFrameScale();
      data.x += (e.clientX - sx) / scale;
      data.y += (e.clientY - sy) / scale;
      sx = e.clientX; sy = e.clientY;
      applyTransform(el, data);
      refreshTransformControls(data.id);
    });
    document.addEventListener('pointerup', () => { down = false; });
  }

  // ── Add Text ─────────────────────────────────────────────────────────────────
  function addText() {
    const color = colorPicker.value;
    const id = ++annoCounter;
    const data = { id, type: 'text', x: 120, y: 120, rot: 0, sx: 1, sy: 1, color, content: 'Label' };
    const el = document.createElement('div');
    el.className = 'annotation text-annotation';
    el.contentEditable = true;
    el.innerText = data.content;
    el.style.cssText = `position:absolute;left:${data.x}px;top:${data.y}px;color:${color};background:rgba(0,0,0,0.55);padding:4px 10px;border-radius:4px;font-size:16px;font-weight:600;cursor:move;user-select:none;white-space:nowrap;`;
    el.addEventListener('input', () => { data.content = el.innerText; refreshList(); });
    annotLayer.appendChild(el);
    makeDraggable(el, data);
    annotations.push({ id, type: 'text', el, data });
    refreshList();
    selectAnnotation(id);
  }

  // ── Add Arrow ─────────────────────────────────────────────────────────────────
  function addArrow() {
    const color = colorPicker.value;
    const id = ++annoCounter;
    const data = { id, type: 'arrow', x: 200, y: 200, rot: 0, sx: 1, sy: 1, color, length: 80 };
    const el = document.createElement('div');
    el.className = 'annotation arrow-annotation';
    el.style.cssText = `position:absolute;left:${data.x}px;top:${data.y}px;width:${data.length}px;height:24px;cursor:move;display:flex;align-items:center;`;
    el.innerHTML = `<svg width="100%" height="24" viewBox="0 0 ${data.length} 24" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="ah${id}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${color}"/></marker></defs>
      <line x1="4" y1="12" x2="${data.length - 10}" y2="12" stroke="${color}" stroke-width="3" marker-end="url(#ah${id})"/>
    </svg>`;
    annotLayer.appendChild(el);
    makeDraggable(el, data);
    annotations.push({ id, type: 'arrow', el, data });
    refreshList();
    selectAnnotation(id);
  }

  // ── Color sync ───────────────────────────────────────────────────────────────
  colorPicker.addEventListener('input', () => {
    const ann = annotations.find(a => a.id === selectedAnnotId);
    if (!ann) return;
    ann.data.color = colorPicker.value;
    if (ann.type === 'text') ann.el.style.color = colorPicker.value;
    if (ann.type === 'arrow') {
      const svg = ann.el.querySelector('svg');
      svg.querySelector('line').setAttribute('stroke', colorPicker.value);
      svg.querySelector('path').setAttribute('fill', colorPicker.value);
    }
  });

  // ── Selection & transform controls ───────────────────────────────────────────
  let transformEl = null;
  function selectAnnotation(id) {
    // Remove old highlight
    annotations.forEach(a => a.el.style.outline = 'none');
    selectedAnnotId = id;
    const ann = annotations.find(a => a.id === id);
    if (!ann) { hideTransformControls(); return; }
    ann.el.style.outline = `2px solid ${ann.data.color}`;
    colorPicker.value = ann.data.color;
    showTransformControls(ann);
  }

  function hideTransformControls() {
    if (transformEl) { transformEl.remove(); transformEl = null; }
  }

  function showTransformControls(ann) {
    hideTransformControls();
    transformEl = document.createElement('div');
    transformEl.id = 'anno-transform-panel';
    transformEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(20,20,20,0.92);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:12px 16px;display:flex;gap:16px;align-items:center;z-index:9999;font-size:11px;color:white;font-family:monospace;';
    transformEl.innerHTML = buildTransformHTML(ann.data);
    document.body.appendChild(transformEl);
    bindTransformControls(ann);
  }

  function buildTransformHTML(data) {
    return `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="color:#888;font-size:10px;margin-bottom:2px;">POSITION</div>
        <div style="display:flex;gap:8px;">
          <label>X <input data-key="x" type="number" step="1" value="${Math.round(data.x)}" style="${numStyle()}"></label>
          <label>Y <input data-key="y" type="number" step="1" value="${Math.round(data.y)}" style="${numStyle()}"></label>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="color:#888;font-size:10px;margin-bottom:2px;">ROTATE</div>
        <label><input data-key="rot" type="number" step="1" value="${Math.round(data.rot)}" style="${numStyle()}">°</label>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="color:#888;font-size:10px;margin-bottom:2px;">SCALE</div>
        <div style="display:flex;gap:8px;">
          <label>X <input data-key="sx" type="number" step="0.05" value="${data.sx.toFixed(2)}" style="${numStyle()}"></label>
          <label>Y <input data-key="sy" type="number" step="0.05" value="${data.sy.toFixed(2)}" style="${numStyle()}"></label>
        </div>
      </div>
      <button id="close-transform-panel" style="background:rgba(255,255,255,0.1);border:none;color:white;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:14px;">×</button>`;
  }

  function numStyle() {
    return 'width:52px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:white;border-radius:3px;padding:2px 4px;font-family:monospace;font-size:11px;';
  }

  function bindTransformControls(ann) {
    transformEl.querySelectorAll('input[data-key]').forEach(inp => {
      inp.addEventListener('input', () => {
        const key = inp.dataset.key;
        ann.data[key] = parseFloat(inp.value) || 0;
        applyTransform(ann.el, ann.data);
      });
    });
    transformEl.querySelector('#close-transform-panel').addEventListener('click', () => {
      selectedAnnotId = null; hideTransformControls();
      annotations.forEach(a => a.el.style.outline = 'none');
    });
  }

  function refreshTransformControls(id) {
    if (selectedAnnotId !== id || !transformEl) return;
    const ann = annotations.find(a => a.id === id);
    if (!ann) return;
    transformEl.innerHTML = buildTransformHTML(ann.data);
    bindTransformControls(ann);
  }

  // ── Annotation list ───────────────────────────────────────────────────────────
  function refreshList() {
    annotList.innerHTML = '';
    annotations.forEach(ann => {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;background:${selectedAnnotId === ann.id ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)'};font-size:11px;`;
      const dot = `<span style="width:8px;height:8px;border-radius:50%;background:${ann.data.color};flex-shrink:0;display:inline-block;"></span>`;
      const label = ann.type === 'text' ? `"${(ann.data.content || '').slice(0, 18)}"` : `↗ Arrow`;
      row.innerHTML = `${dot}<span style="flex:1">${label}</span><button class="remove-anno" data-id="${ann.id}" style="background:none;border:none;color:#ff6666;cursor:pointer;font-size:13px;padding:0 2px;">×</button>`;
      row.addEventListener('click', e => { if (!e.target.classList.contains('remove-anno')) selectAnnotation(ann.id); refreshList(); });
      row.querySelector('.remove-anno').addEventListener('click', e => { e.stopPropagation(); removeAnnotation(ann.id); });
      annotList.appendChild(row);
    });
  }

  function removeAnnotation(id) {
    const idx = annotations.findIndex(a => a.id === id);
    if (idx === -1) return;
    annotations[idx].el.remove();
    annotations.splice(idx, 1);
    if (selectedAnnotId === id) { selectedAnnotId = null; hideTransformControls(); }
    refreshList();
  }

  btnAddText.addEventListener('click', addText);
  btnAddArrow.addEventListener('click', addArrow);

  // ── Composition export ────────────────────────────────────────────────────────
  btnDoExport.addEventListener('click', () => {
    btnDoExport.innerText = 'Processing…'; btnDoExport.disabled = true;
    setTimeout(() => {
      const canvasRect = getCanvasRect();
      const frameBounds = exportFrame.getBoundingClientRect();
      const rendererSize = new THREE.Vector2();
      stage.renderer.getSize(rendererSize);
      const sourceScaleX = rendererSize.x / canvasRect.width;
      const sourceScaleY = rendererSize.y / canvasRect.height;
      const cropLeft = Math.max(0, frameBounds.left - canvasRect.left);
      const cropTop = Math.max(0, frameBounds.top - canvasRect.top);
      const cropRight = Math.min(canvasRect.width, frameBounds.right - canvasRect.left);
      const cropBottom = Math.min(canvasRect.height, frameBounds.bottom - canvasRect.top);
      const cropWidth = Math.max(1, cropRight - cropLeft);
      const cropHeight = Math.max(1, cropBottom - cropTop);
      const sourceX = Math.round(cropLeft * sourceScaleX);
      const sourceY = Math.round(cropTop * sourceScaleY);
      const sourceWidth = Math.max(1, Math.round(cropWidth * sourceScaleX));
      const sourceHeight = Math.max(1, Math.round(cropHeight * sourceScaleY));
      const bgVal = bgSelect.value;
      const oldBg = stage.scene.background;

      const includeGizmo = document.getElementById('export-gizmo').checked;
      const includeCoords = document.getElementById('export-coordinates').checked;
      const includeBg = document.getElementById('export-background').checked;
      const isTransp = !includeBg;

      const hiddenGizmoObjects = [];

      if (!includeGizmo) {
        stage.scene.traverse(obj => {
          if (!obj.userData) return;
          if (!obj.userData.exportHideWhenGizmoDisabled && !obj.userData.ikLimbKey) return;
          hiddenGizmoObjects.push({ obj, visible: obj.visible });
          obj.visible = false;
        });
      }

      // Handle Grid and Axes
      const gridHelper = stage.scene.children.find(c => c.type === 'GridHelper');
      const axesHelper = stage.scene.children.find(c => c.type === 'AxesHelper');
      const prevGridVis = gridHelper ? gridHelper.visible : false;
      const prevAxesVis = axesHelper ? axesHelper.visible : false;

      if (!includeCoords) {
        if (gridHelper) gridHelper.visible = false;
        if (axesHelper) axesHelper.visible = false;
      }

      // Handle Ground (Floor) for transparency
      const prevGroundVis = stage.ground ? stage.ground.visible : false;
      if (isTransp && stage.ground) {
        stage.ground.visible = false;
      }

      if (isTransp) stage.scene.background = null;
      else stage.scene.background = new THREE.Color(bgVal);

      stage.renderer.render(stage.scene, stage.camera);
      const imgData = stage.renderer.domElement.toDataURL(isTransp ? 'image/png' : 'image/jpeg', 1.0);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = sourceWidth; finalCanvas.height = sourceHeight;
      const ctx = finalCanvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
        ctx.save();
        ctx.scale(sourceWidth / frameBounds.width, sourceHeight / frameBounds.height);
        annotations.forEach(ann => {
          const d = ann.data;
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.rot * Math.PI / 180);
          ctx.scale(d.sx, d.sy);

          if (ann.type === 'text') {
            const text = d.content || '';
            ctx.font = 'bold 18px Inter, sans-serif';
            const metrics = ctx.measureText(text);
            const tw = metrics.width + 20, th = 28;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, tw, th);
            ctx.fillStyle = d.color;
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 10, th / 2);
          }
          if (ann.type === 'arrow') {
            const aw = d.length;
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(aw - 10, 12); ctx.stroke();
            ctx.fillStyle = d.color;
            ctx.beginPath();
            ctx.moveTo(aw, 12);
            ctx.lineTo(aw - 12, 6);
            ctx.lineTo(aw - 12, 18);
            ctx.closePath(); ctx.fill();
          }
          ctx.restore();
        });
        ctx.restore();

        const link = document.createElement('a');
        link.download = `pose-export.${isTransp ? 'png' : 'jpg'}`;
        link.href = finalCanvas.toDataURL(isTransp ? 'image/png' : 'image/jpeg');
        link.click();

        stage.scene.background = oldBg;

        if (!includeGizmo) {
          hiddenGizmoObjects.forEach(({ obj, visible }) => {
            obj.visible = visible;
          });
        }
        if (!includeCoords) {
          if (gridHelper) gridHelper.visible = prevGridVis;
          if (axesHelper) axesHelper.visible = prevAxesVis;
        }
        if (isTransp && stage.ground) {
          stage.ground.visible = prevGroundVis;
        }

        btnDoExport.innerText = 'Generate Image'; btnDoExport.disabled = false;
      };
      img.onerror = () => {
        stage.scene.background = oldBg;

        if (!includeGizmo) {
          hiddenGizmoObjects.forEach(({ obj, visible }) => {
            obj.visible = visible;
          });
        }
        if (!includeCoords) {
          if (gridHelper) gridHelper.visible = prevGridVis;
          if (axesHelper) axesHelper.visible = prevAxesVis;
        }
        if (isTransp && stage.ground) {
          stage.ground.visible = prevGroundVis;
        }

        btnDoExport.innerText = 'Generate Image'; btnDoExport.disabled = false;
      };
      img.src = imgData;
    }, 50);
  });
}
