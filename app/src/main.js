import * as THREE from 'three';
import { createStage, getStage } from 'mannequin-js/src/mannequin.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { initExportSystem } from './exportSystem.js';
import { initCutsceneStudio } from './studio.js';
import { initDirectEditor } from './direct-editor.js';
import { installPoseLibrary, poseFingerprint } from './pose-library.js';
import {renderObjectInfo} from './scene-object-info.js';
import { initViewPerformance } from './view-performance.js';
import { analyzeEditorState } from './scene-feedback.js';
import { SceneValidationError, JOINTS } from './scene-format.js';
import { createCharacter, configureBody, captureBoneLayout, lockBoneLayout, enforceBoneLengths, constrainBody, clampJoint, manipulationChain, solveConstrainedIK, snapshotBodyJoints } from './body-rig.js';

const BUILTIN_POSES = {
  Default: { posture: null, joints: {} }
};
const GROUND_Y = 0.25;
const IK_LIMBS = ['Head', 'Left_Arm', 'Right_Arm', 'Left_Leg', 'Right_Leg'];
const IK_CHAINS = {
  Head: ['torso', 'neck', 'head'],
  Left_Arm: ['l_arm', 'l_elbow', 'l_wrist'],
  Right_Arm: ['r_arm', 'r_elbow', 'r_wrist'],
  Left_Leg: ['l_leg', 'l_knee', 'l_ankle'],
  Right_Leg: ['r_leg', 'r_knee', 'r_ankle'],
};
const HANDLE_COLORS = {
  Head: 0xaa66ff, Left_Arm: 0x4499ff, Right_Arm: 0x44ccff,
  Left_Leg: 0xff8844, Right_Leg: 0xffcc44,
};

const poseConfig = {
  Root: { target: 'self', props: { bend:[-90,90], tilt:[-90,90], turn:[-180,180] } },
  Torso: { target: 'torso', props: { bend:[-90,90], tilt:[-45,45], turn:[-90,90] } },
  Neck: { target: 'neck', props: { nod:[-90,90], tilt:[-45,45], turn:[-90,90] } },
  Head: { target: 'head', props: { nod:[-90,90], tilt:[-45,45], turn:[-90,90] } },
  Left_Arm: { target: 'l_arm', props: { raise:[-180,180], straddle:[-180,180], turn:[-90,90] } },
  Left_Elbow: { target: 'l_elbow', props: { bend:[0,150] } },
  Left_Wrist: { target: 'l_wrist', props: { bend:[-90,90], turn:[-90,90], straddle:[-45,45] } },
  Left_Leg: { target: 'l_leg', props: { raise:[-90,135], straddle:[-90,90], turn:[-90,90] } },
  Left_Knee: { target: 'l_knee', props: { bend:[0,150] } },
  Left_Ankle: { target: 'l_ankle', props: { bend:[-45,45], turn:[-45,45] } },
  Right_Arm: { target: 'r_arm', props: { raise:[-180,180], straddle:[-180,180], turn:[-90,90] } },
  Right_Elbow: { target: 'r_elbow', props: { bend:[0,150] } },
  Right_Wrist: { target: 'r_wrist', props: { bend:[-90,90], turn:[-90,90], straddle:[-45,45] } },
  Right_Leg: { target: 'r_leg', props: { raise:[-90,135], straddle:[-90,90], turn:[-90,90] } },
  Right_Knee: { target: 'r_knee', props: { bend:[0,150] } },
  Right_Ankle: { target: 'r_ankle', props: { bend:[-45,45], turn:[-45,45] } },
};

// defaultPosture is built dynamically per-mannequin — see createFullMannequin()

// ─── State ────────────────────────────────────────────────────────────────────
let stage, activeMannequin = null, selectedPartGroup = null;
const mannequins = [];
const importedModels = []; // GLB imports (tracked separately)
let transformControl, transformProxy, connectionLine;
let gizmoJoint=null, gizmoChain=null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const ikEnabled = { Head:false, Left_Arm:false, Right_Arm:false, Left_Leg:false, Right_Leg:false };
const ikHandles = {};
let activeIKHandle = null, isDraggingIK = false;
const ikDragPlane = new THREE.Plane();
const ikDragPlaneNormal = new THREE.Vector3();
let selectedBodyPart = 'Root';
const historyStack = [];
let historyIndex = -1;
let studio = null;
let restoreGeneration = 0;
let restoringState = false;
let interactionMode='move',directEditor=null,directDragging=false,poseLibrary=null;
let viewPerformance=null;

function updateStageControlsEnabled() {
  if (!stage || !stage.controls) return;
  const isTransformDragging = !!(transformControl && transformControl.dragging);
  stage.controls.enabled = !isDraggingIK && !isTransformDragging && !directDragging;
}

// ─── History ──────────────────────────────────────────────────────────────────
function snapshotState() {
  const state = {
    mannequins: mannequins.map(m => {
      const joints = {};
      for (const [part, joint] of Object.entries(m)) {
        if (joint?.isObject3D && joint !== m.parent) {
          joints[part] = {
            position: joint.position.toArray(),
            rotation: joint.rotation.toArray(),
            scale: joint.scale.toArray()
          };
        }
      }
      return {
        name: m.name,
        studioId: m.userData.studioId,
        sceneNotes: m.userData.sceneNotes,
        bodyProfile: m.userData.bodyProfile,
        boneLayout: captureBoneLayout(m),
        position: m.position.toArray(),
        rotation: m.rotation.toArray(),
        scale: m.scale.toArray(),
        posture: m.posture,
        joints: joints
      };
    }),
    importedModels: importedModels.map(m => ({
      position: m.position.toArray(),
      rotation: m.rotation.toArray(),
      scale: m.scale.toArray(),
      name: m.name || m.userData._glbFileName,
      sceneNotes: m.userData.sceneNotes,
      glbBase64: m.userData._glbBase64 || null,
      primitive: m.userData.primitive || null,
    })),
    activeIndex: mannequins.indexOf(activeMannequin),
    activeImportIndex: importedModels.indexOf(activeMannequin),
    selectedBodyPart,
    camera: viewPerformance?.snapshotCamera() || { position: stage.camera.position.toArray(), rotation: stage.camera.rotation.toArray(), target: stage.controls.target.toArray(), fov: stage.camera.fov },
    studio: studio?.snapshot(),
  };
  return state;
}

function captureState() {
  viewPerformance?.invalidate();
  if (restoringState) return;
  mannequins.forEach(constrainBody);
  const state = snapshotState();
  const previous=historyIndex>=0?JSON.parse(historyStack[historyIndex]):null;
  const json = JSON.stringify(state);
  const comparable = value => JSON.stringify(value, (_key, v) => typeof v === 'number' ? Math.round(v * 1e8) / 1e8 : v);
  if (historyIndex >= 0 && comparable(JSON.parse(historyStack[historyIndex])) === comparable(state)) return;
  if (historyIndex < historyStack.length - 1) historyStack.splice(historyIndex + 1);
  historyStack.push(json);
  if (historyStack.length > 30) historyStack.shift();
  else historyIndex++;
  updateHistoryButtons();
  const actor=state.mannequins[state.activeIndex],prior=actor?.studioId?previous?.mannequins.find(m=>m.studioId===actor.studioId):previous?.mannequins[state.activeIndex];
  const poseOnly=m=>m&&poseFingerprint({rotations:Object.fromEntries(Object.entries(m.joints).map(([key,j])=>[key,j.rotation]))});
  if(actor&&poseOnly(actor)!==poseOnly(prior))poseLibrary?.recordCurrent();
}

function applyState(json) {
  if (!json) return;
  const state = JSON.parse(json);
  const checked = analyzeEditorState(state);
  if (!checked.valid) throw new SceneValidationError(checked.errors);
  restoringState = true;
  viewPerformance?.beforeRestore();
  try {
  const generation = ++restoreGeneration;
  mannequins.forEach(m => stage.scene.remove(m));
  mannequins.length = 0;
  importedModels.forEach(m => stage.scene.remove(m));
  importedModels.length = 0;
  detachGizmo();
  activeMannequin = null;
  clearHighlight();
  state.mannequins.forEach(d => {
    const m = createFullMannequin(d.bodyProfile || null);
    m.name = d.name || '';
    m.userData.studioId = d.studioId;
    m.userData.sceneNotes = d.sceneNotes;
    m.position.fromArray(d.position);
    m.rotation.fromArray(d.rotation);
    m.scale.fromArray(d.scale);
    try {
      if (d.posture) m.posture = d.posture;
      // Re-apply specific joint rotations and positions since posture might not cover everything
      if (d.joints) {
        for (const [part, data] of Object.entries(d.joints)) {
          if (m[part]) {
            if (data.position) m[part].position.fromArray(data.position);
            if (data.rotation) m[part].rotation.fromArray(data.rotation);
            if (data.scale) m[part].scale.fromArray(data.scale);
          }
        }
      }
    } catch(e) { console.error('Failed to restore posture', e); }
    lockBoneLayout(m); constrainBody(m);
    mannequins.push(m);
    stage.scene.add(m);
  });
  // Restore imported GLB models from base64 if they were loaded
  if (state.importedModels && state.importedModels.length > 0) {
    const loader = new GLTFLoader();
    state.importedModels.forEach(d => {
      if (d.primitive && studio) {
        const model = studio.createProp(d.primitive);
        model.name = d.name || d.primitive.name;
        model.userData.sceneNotes = d.sceneNotes;
        model.position.fromArray(d.position);
        model.rotation.fromArray(d.rotation);
        model.scale.fromArray(d.scale);
        stage.scene.add(model);
        importedModels.push(model);
        return;
      }
      if (!d.glbBase64) {
        // If no base64, we can't fully restore it, but we can create a placeholder or just skip
        return;
      }
      const arrayBuffer = base64ToArrayBuffer(d.glbBase64);
      loader.parse(arrayBuffer, '', (gltf) => {
        if (generation !== restoreGeneration) return;
        const model = gltf.scene;
        model.name = d.name || 'restored-glb';
        model.userData.sceneNotes = d.sceneNotes;
        model.position.fromArray(d.position);
        model.rotation.fromArray(d.rotation);
        model.scale.fromArray(d.scale);
        model.userData._glbBase64 = d.glbBase64;
        model.userData._glbFileName = d.name;
        stage.scene.add(model);
        importedModels.push(model);
        updateLayerWindow();
      }, (error) => {
        console.error('Failed to restore GLB on undo:', d.name, error);
      });
    });
  }
  if (state.camera) {
    stage.camera.position.fromArray(state.camera.position);
    stage.camera.rotation.fromArray(state.camera.rotation);
    stage.camera.fov = state.camera.fov || 35;
    if (state.camera.target) stage.controls.target.fromArray(state.camera.target);
    stage.camera.updateProjectionMatrix();
    stage.controls.update();
  }
  studio?.restore(state.studio);

  if (state.activeIndex !== -1 && mannequins[state.activeIndex]) {
    activeMannequin = mannequins[state.activeIndex];
    attachGizmo(activeMannequin);
  } else if (state.activeImportIndex !== -1 && importedModels[state.activeImportIndex]) {
    activeMannequin = importedModels[state.activeImportIndex];
    attachGizmo(activeMannequin);
  }
  
  if (state.selectedBodyPart) {
    selectedBodyPart = state.selectedBodyPart;
    const selectEl = document.getElementById('body-part-select');
    if (selectEl) selectEl.value = selectedBodyPart;
    const cfg = poseConfig[selectedBodyPart];
    if (cfg && cfg.target !== 'self' && activeMannequin && activeMannequin[cfg.target]) {
      setHighlight(activeMannequin[cfg.target]);
    } else {
      clearHighlight();
    }
  }
  updatePropertiesPanel();
  updateLayerWindow();
  } finally { restoringState = false;viewPerformance?.afterRestore(); }
}

function undo() { if (historyIndex > 0) applyState(historyStack[--historyIndex]); updateHistoryButtons(); }
function redo() { if (historyIndex < historyStack.length-1) applyState(historyStack[++historyIndex]); updateHistoryButtons(); }
function updateHistoryButtons() {
  document.getElementById('btn-undo').disabled = historyIndex <= 0;
  document.getElementById('btn-redo').disabled = historyIndex >= historyStack.length - 1;
}

// ─── Mannequin Factory ────────────────────────────────────────────────────────
function createFullMannequin(profile) {
  const m = createCharacter(profile);
  // Tag each joint with its poseConfig key
  Object.keys(poseConfig).forEach(key => {
    const target = poseConfig[key].target;
    const jointNode = target === 'self' ? m : m[target];
    if (jointNode) jointNode.userData._jointKey = key;
  });
  // Snapshot the anatomical defaults BEFORE any user edits
  Object.keys(poseConfig).forEach(key => {
    const cfg = poseConfig[key];
    const tgt = cfg.target === 'self' ? m : m[cfg.target];
    if (!tgt) return;
    // Position baseline
    tgt.userData.anatomicPos = tgt.position.clone();
    // Rotation baseline (the actual mannequin-js default pose values)
    const rotDefaults = {};
    for (const prop of Object.keys(cfg.props)) {
      rotDefaults[prop] = typeof tgt[prop] === 'number' ? tgt[prop] : 0;
    }
    tgt.userData.anatomicRot = rotDefaults;
  });
  // Propagate posePartKey down to every Mesh for click-selection
  m.traverse(obj => {
    if (!obj.isMesh) return;
    let tmp = obj;
    while (tmp) {
      if (tmp.userData._jointKey) {
        obj.userData.posePartKey = tmp.userData._jointKey;
        obj.userData.posePartNode = tmp;
        break;
      }
      tmp = tmp.parent;
    }
  });
  return m;
}

// ─── IK System ────────────────────────────────────────────────────────────────
function initIKHandles() {
  const geom = new THREE.SphereGeometry(0.22, 14, 14);
  IK_LIMBS.forEach(key => {
    const mat = new THREE.MeshPhongMaterial({
      color: HANDLE_COLORS[key], emissive: HANDLE_COLORS[key], emissiveIntensity: 0.3,
      transparent: true, opacity: 0.88,
    });
    const h = new THREE.Mesh(geom, mat.clone());
    h.userData.ikLimbKey = key;
    h.visible = false;
    stage.scene.add(h);
    ikHandles[key] = h;
  });
}

function getChainEnd(mannequin, limbKey) {
  const chain = IK_CHAINS[limbKey];
  const end = mannequin[chain[chain.length - 1]];
  const pos = new THREE.Vector3();
  if (end) end.getWorldPosition(pos);
  return pos;
}

function solveIKChain(mannequin,limbKey,target) {
  const result=solveConstrainedIK(mannequin,IK_CHAINS[limbKey],target);
  showIKResult(result);viewPerformance?.invalidate();return result;
}

function tickIKHandles() {
  if (!activeMannequin) {
    IK_LIMBS.forEach(k => ikHandles[k] && (ikHandles[k].visible = false));
    return;
  }
  IK_LIMBS.forEach(key => {
    const h = ikHandles[key];
    h.visible = !!activeMannequin.torso && ikEnabled[key];
    if (ikEnabled[key] && activeIKHandle !== h) h.position.copy(getChainEnd(activeMannequin, key));
  });
}

// ─── Gizmo Proxy ──────────────────────────────────────────────────────────────
const GIZMO_OFFSET = new THREE.Vector3(0, 0, -1); // 1 unit behind mannequin

function attachGizmo(mannequin) {
  if(interactionMode!=='advanced'){transformControl.detach();connectionLine.visible=false;updateLayerWindow();return;}
  const cfg=poseConfig[selectedBodyPart]||poseConfig.Root;
  gizmoJoint=mannequin.torso&&cfg.target!=='self'?cfg.target:null;
  gizmoChain=gizmoJoint?manipulationChain(gizmoJoint):null;
  if(gizmoJoint){
    const controlPoint=transformControl.getMode()==='translate'&&gizmoChain?mannequin[gizmoChain.at(-1)]:mannequin[gizmoJoint];
    controlPoint.getWorldPosition(transformProxy.position);
    mannequin[gizmoJoint].getWorldQuaternion(transformProxy.quaternion);
    transformProxy.scale.set(1,1,1);
  }else{
    transformProxy.position.copy(mannequin.position);
    if(mannequin.torso)transformProxy.position.add(GIZMO_OFFSET);
    transformProxy.quaternion.copy(mannequin.quaternion);transformProxy.scale.copy(mannequin.scale);
  }
  transformControl.setSpace(transformControl.getMode()==='rotate'&&gizmoJoint?'local':'world');
  transformControl.attach(transformProxy);connectionLine.visible=true;updateLayerWindow();
}

  function detachGizmo() { transformControl.detach(); connectionLine.visible = false; updateLayerWindow(); }

function syncProxy() {
  if (!activeMannequin || !connectionLine.visible) return;
  const pts = [transformProxy.position.clone(), activeMannequin.position.clone()];
  connectionLine.geometry.setFromPoints(pts);
  connectionLine.computeLineDistances();
}

function setHighlight(node) {
  clearHighlight();
  selectedPartGroup = node;
  const targetToHighlight = node.image ? node.image : node;
  targetToHighlight.traverse(nc => {
    if (nc.isMesh && nc.material) {
      if (Array.isArray(nc.material)) {
        if (!nc.userData.origEmissive) nc.userData.origEmissive = nc.material.map(m => m.emissive.clone());
        nc.material.forEach(m => m.emissive.setHex(0xbc4e4e));
      } else {
        if (!nc.userData.origEmissive) nc.userData.origEmissive = nc.material.emissive.clone();
        nc.material.emissive.setHex(0xbc4e4e);
      }
    }
  });
}

function clearHighlight() {
  if (selectedPartGroup) {
    const targetToClear = selectedPartGroup.image ? selectedPartGroup.image : selectedPartGroup;
    targetToClear.traverse(nc => {
      if (nc.isMesh && nc.userData.origEmissive) {
        if (Array.isArray(nc.material)) nc.material.forEach((m, i) => m.emissive.copy(nc.userData.origEmissive[i]));
        else nc.material.emissive.copy(nc.userData.origEmissive);
      }
    });
  }
  selectedPartGroup = null;
}

// ─── Layer Window ──────────────────────────────────────────────────────────────
function updateLayerWindow() {
  const container = document.getElementById('layer-content');
  if (!container) return;
  
  let html = '';
  
  const allObjects = [...mannequins, ...importedModels];
  if (allObjects.length === 0) {
    container.innerHTML = '<p class="placeholder-text" style="color:var(--text-secondary);">No objects in scene.</p>';
    return;
  }
  
  allObjects.forEach((obj) => {
    const isImported = importedModels.includes(obj);
    const idx = isImported ? importedModels.indexOf(obj) : mannequins.indexOf(obj);
    const typeLabel = isImported ? 'Imported GLB' : 'Mannequin';
    const isActive = (obj === activeMannequin);
    const displayName = (obj.name || `${typeLabel} ${idx + 1}`).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    
    html += `<div style="display:flex;align-items:center;gap:6px;padding:6px;background:${isActive ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.3)'};border:1px solid ${isActive ? 'var(--accent)' : 'var(--glass-border)'};border-radius:4px;cursor:pointer;" class="layer-item" data-idx="${idx}" data-imported="${isImported}">
      <span style="font-size:14px;color:var(--text-secondary);">${isImported ? '📦' : '🧍'}</span>
      <div style="flex:1;display:flex;flex-direction:column;">
        <input type="text" class="layer-name-input" data-idx="${idx}" data-imported="${isImported}" value="${displayName}" style="background:transparent;border:none;color:white;font-size:12px;font-weight:${isActive ? 'bold' : 'normal'};outline:none;width:100%;font-family:inherit;padding:0;">
      </div>
      <div style="display:flex;gap:2px;">
        <button class="btn-save-layer" data-idx="${idx}" data-imported="${isImported}" style="background:none;border:none;color:#66ccff;cursor:pointer;font-size:12px;padding:2px 4px;" title="Save Object">💾</button>
        <button class="btn-delete-layer" data-idx="${idx}" data-imported="${isImported}" style="background:none;border:none;color:#ff6666;cursor:pointer;font-size:12px;padding:2px 4px;" title="Delete">🗑</button>
      </div>
    </div>`;
  });
  
  container.innerHTML = html;
  
  // Bind events
  container.querySelectorAll('.layer-name-input').forEach(input => {
    input.addEventListener('click', e => {
      e.stopPropagation(); // Allow clicking into input without triggering item selection if already selected
    });
    input.addEventListener('change', e => {
      const isImported = e.target.dataset.imported === 'true';
      const idx = parseInt(e.target.dataset.idx);
      const obj = isImported ? importedModels[idx] : mannequins[idx];
      if (obj) {
        obj.name = e.target.value;
        if (isImported) obj.userData._glbFileName = e.target.value; // Sync to save data
        captureState();if(obj===activeMannequin)updatePropertiesPanel();
      }
    });
  });

  container.querySelectorAll('.layer-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.btn-delete-layer') || e.target.tagName === 'INPUT') return; // Ignore delete and input clicks
      
      const isImported = item.dataset.imported === 'true';
      const idx = parseInt(item.dataset.idx);
      
      const obj = isImported ? importedModels[idx] : mannequins[idx];
      if (obj) {
        activeMannequin = obj;
        attachGizmo(activeMannequin);
        selectedBodyPart = 'Root';
        updatePropertiesPanel();
        updateLayerWindow();
      }
    });
  });
  
  container.querySelectorAll('.btn-save-layer').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isImported = btn.dataset.imported === 'true';
      const idx = parseInt(btn.dataset.idx);
      const obj = isImported ? importedModels[idx] : mannequins[idx];
      if (obj) {
        let exportData;
        if (isImported) {
          exportData = {
            type: 'importedModel',
            position: obj.position.toArray(),
            rotation: obj.rotation.toArray(),
            scale: obj.scale.toArray(),
            name: obj.name || obj.userData._glbFileName,
            sceneNotes: obj.userData.sceneNotes,
            glbBase64: obj.userData._glbBase64 || null,
            primitive: obj.userData.primitive || null,
          };
        } else {
          const joints = snapshotBodyJoints(obj);
          exportData = {
            type: 'mannequin',
            studioId: obj.userData.studioId,
            sceneNotes: obj.userData.sceneNotes,
            bodyProfile: obj.userData.bodyProfile,
            boneLayout: captureBoneLayout(obj),
            position: obj.position.toArray(),
            rotation: obj.rotation.toArray(),
            scale: obj.scale.toArray(),
            posture: obj.posture,
            joints: joints,
            name: obj.name || 'Mannequin'
          };
        }
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const defaultName = (obj.name || (isImported ? 'imported-model' : 'mannequin')).replace(/\s+/g, '-').toLowerCase();
        a.download = `pose-object-${defaultName}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  });

  container.querySelectorAll('.btn-delete-layer').forEach(btn => {
    btn.addEventListener('click', e => {
      const isImported = btn.dataset.imported === 'true';
      const idx = parseInt(btn.dataset.idx);
      const obj = isImported ? importedModels[idx] : mannequins[idx];
      
      if (obj) {
        if (obj === activeMannequin) {
          activeMannequin = null;
          detachGizmo();
          clearHighlight();
        }
        
        stage.scene.remove(obj);
        if (isImported) importedModels.splice(idx, 1);
        else mannequins.splice(idx, 1);
        
        updatePropertiesPanel();
        updateLayerWindow();
        captureState();
      }
    });
  });
}
function deleteSelected() {
  if (!activeMannequin) return;
  const importIndex = importedModels.indexOf(activeMannequin);
  if (importIndex !== -1) {
    stage.scene.remove(activeMannequin);
    importedModels.splice(importIndex, 1);
    detachGizmo();
    activeMannequin = null;
    clearHighlight();
    updatePropertiesPanel();
    updateLayerWindow();
    captureState();
    console.log('Deleted imported model');
    return;
  }
  const mannequinIndex = mannequins.indexOf(activeMannequin);
  if (mannequinIndex !== -1) {
    stage.scene.remove(activeMannequin);
    mannequins.splice(mannequinIndex, 1);
    detachGizmo();
    activeMannequin = null;
    clearHighlight();
    updatePropertiesPanel();
    updateLayerWindow();
    captureState();
    console.log('Deleted mannequin');
  }
}

// ─── GLB Import ───────────────────────────────────────────────────────────────
function importGLB(file) {
  const loader = new GLTFLoader();
  // Read as ArrayBuffer for both loading AND base64 persistence
  const reader = new FileReader();
  reader.onload = (readerEvent) => {
    const arrayBuffer = readerEvent.target.result;
    const base64 = arrayBufferToBase64(arrayBuffer);
    loader.parse(arrayBuffer, '', (gltf) => {
      const model = gltf.scene;
      model.name = file.name || `glb-import-${Date.now()}`;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDim;
      model.scale.setScalar(scale);
      model.position.set(0, size.y * scale / 2 + GROUND_Y, 0);
      model.userData._glbBase64 = base64;
      model.userData._glbFileName = file.name || 'unknown.glb';
      stage.scene.add(model);
      importedModels.push(model);
      activeMannequin = model;
      attachGizmo(model);
      captureState();
      updatePropertiesPanel();
      console.log('GLB model imported:', model.name);
    }, (error) => {
      console.error('Error parsing GLB:', error);
      alert('Failed to load GLB file. Please check the file format.');
    });
  };
  reader.readAsArrayBuffer(file);
}

// Helper: ArrayBuffer → base64 string
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Helper: base64 string → ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function addMannequinFromData(data) {
  const m = createFullMannequin(data.bodyProfile || null);
  m.userData.studioId=data.studioId;m.userData.sceneNotes=data.sceneNotes;
  m.position.fromArray(data.position || [0, GROUND_Y, 0]);
  m.rotation.fromArray(data.rotation || [0, 0, 0, 'XYZ']);
  m.scale.fromArray(data.scale || [1, 1, 1]);
  m.name = data.name || 'Mannequin';
  try {
    if (data.posture) m.posture = data.posture;
    if (data.joints) {
      for (const [part, jdata] of Object.entries(data.joints)) {
        if (m[part]) {
          if (jdata.position) m[part].position.fromArray(jdata.position);
          if (jdata.rotation) m[part].rotation.fromArray(jdata.rotation);
          if (jdata.scale) m[part].scale.fromArray(jdata.scale);
        }
      }
    }
  } catch(err) {}
  lockBoneLayout(m); constrainBody(m);
  mannequins.push(m);
  stage.scene.add(m);
  activeMannequin = m;
  attachGizmo(m);
  captureState();
  updatePropertiesPanel();
  updateLayerWindow();
}

function addImportedModelFromData(data) {
  if (data.primitive && studio) {
    const model = studio.createProp(data.primitive);
    model.name = data.name || model.name;
    model.userData.sceneNotes=data.sceneNotes;
    model.position.fromArray(data.position);
    model.rotation.fromArray(data.rotation);
    model.scale.fromArray(data.scale);
    importedModels.push(model);
    stage.scene.add(model);
    activeMannequin = model;
    attachGizmo(model);
    captureState();
    updatePropertiesPanel();
    updateLayerWindow();
    return;
  }
  if (!data.glbBase64) return;
  const loader = new GLTFLoader();
  const arrayBuffer = base64ToArrayBuffer(data.glbBase64);
  loader.parse(arrayBuffer, '', (gltf) => {
    const model = gltf.scene;
    model.name = data.name || 'restored-glb';
    model.userData.sceneNotes=data.sceneNotes;
    model.position.fromArray(data.position);
    model.rotation.fromArray(data.rotation);
    model.scale.fromArray(data.scale);
    model.userData._glbBase64 = data.glbBase64;
    model.userData._glbFileName = data.name;
    stage.scene.add(model);
    importedModels.push(model);
    activeMannequin = model;
    attachGizmo(model);
    captureState();
    updatePropertiesPanel();
    updateLayerWindow();
  }, (error) => {
    console.error('Failed to restore individual GLB:', data.name, error);
  });
}

function addMannequinFromPickedFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target.result;
      let data = null;
      try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch {}
      // Single objects go through the same validation, report and rollback as Load.
      if (data && data.type !== 'mannequin' && data.type !== 'importedModel') {
        window.alert('Please pick a saved mannequin or imported-object JSON file.');
        return;
      }
      studio.importText(text, file.name, false);
    };
    reader.readAsText(file);
  };
  input.click();
}


// ─── Save/Load Project ────────────────────────────────────────────────────────
function saveProject() {
  if (studio) { studio.saveProject(snapshotState()); return; }
  const data = {
    mannequins: mannequins.map(m => ({
      position: m.position.toArray(),
      rotation: m.rotation.toArray(),
      scale: m.scale.toArray(),
      posture: m.posture,
    })),
    importedModels: importedModels.map(m => ({
      position: m.position.toArray(),
      rotation: m.rotation.toArray(),
      scale: m.scale.toArray(),
      name: m.name || m.userData._glbFileName,
      sceneNotes: m.userData.sceneNotes,
      glbBase64: m.userData._glbBase64 || null,
    })),
    camera: {
      position: stage.camera.position.toArray(),
      rotation: [stage.camera.rotation.x, stage.camera.rotation.y, stage.camera.rotation.z],
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pose-project.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function loadProject(file) {
  let text='';
  try {
    if(file.size>40_000_000)throw new Error('프로젝트 JSON은 40MB 이하로 넣어주세요.');
    text=await file.text();
    studio.importText(text,file.name,false);
  }catch(error){studio?.showImportError(error,text,file.name);}
  finally{document.getElementById('btn-load').value='';}
}

// ─── HUD Updates ──────────────────────────────────────────────────────────────
function updateHUDValues() {
  document.getElementById('cam-pos-x').value = stage.camera.position.x;
  document.getElementById('cam-pos-y').value = stage.camera.position.y;
  document.getElementById('cam-pos-z').value = stage.camera.position.z;
  document.getElementById('val-cam-pos-x').textContent = stage.camera.position.x.toFixed(1);
  document.getElementById('val-cam-pos-y').textContent = stage.camera.position.y.toFixed(1);
  document.getElementById('val-cam-pos-z').textContent = stage.camera.position.z.toFixed(1);
  document.getElementById('cam-rot-x').value = THREE.MathUtils.radToDeg(stage.camera.rotation.x);
  document.getElementById('cam-rot-y').value = THREE.MathUtils.radToDeg(stage.camera.rotation.y);
  document.getElementById('cam-rot-z').value = THREE.MathUtils.radToDeg(stage.camera.rotation.z);
  document.getElementById('val-cam-rot-x').textContent = THREE.MathUtils.radToDeg(stage.camera.rotation.x).toFixed(1) + '°';
  document.getElementById('val-cam-rot-y').textContent = THREE.MathUtils.radToDeg(stage.camera.rotation.y).toFixed(1) + '°';
  document.getElementById('val-cam-rot-z').textContent = THREE.MathUtils.radToDeg(stage.camera.rotation.z).toFixed(1) + '°';
}

function updateMannequinHUD() {
  const el = document.getElementById('mannequin-pos-values');
  if (!activeMannequin) { el.textContent = 'Select a mannequin...'; return; }
  const p = activeMannequin.position;
  el.textContent = `X: ${p.x.toFixed(2)}  Y: ${p.y.toFixed(2)}  Z: ${p.z.toFixed(2)}`;
}

// ─── Properties Panel ─────────────────────────────────────────────────────────
function sliderRow(id, label, min, max, step, value, def) {
  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
    <span style="width:70px;font-size:11px;color:var(--text-secondary);">${label}</span>
    <input type="range" id="rng-${id}" min="${min}" max="${max}" step="${step}" value="${value}" style="flex:1;">
    <input type="number" id="num-${id}" class="slider-num" min="${min}" max="${max}" step="${step}" value="${value.toFixed(2)}">
    <button class="btn-reset-slider" data-id="${id}" data-def="${def}" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:12px;padding:0 4px;" title="Reset to default">↺</button>
  </div>`;
}

function renderSliders() {
  if (!activeMannequin) return '';
  const cfg = poseConfig[selectedBodyPart];
  const tgt = cfg.target === 'self' ? activeMannequin : activeMannequin[cfg.target];
  if (!tgt) return '<p style="color:var(--text-secondary);">Joint not found.</p>';
  const aPos = tgt.userData.anatomicPos || new THREE.Vector3();
  const aRot = tgt.userData.anatomicRot || {};
  let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
  html += `<div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
    <button id="btn-reset-bodypart" class="btn" style="font-size:11px;padding:4px 8px;opacity:0.85;" title="Reset this body part to default">↺ Reset Part</button>
  </div>`;
  if (!activeMannequin.torso || cfg.target === 'self') {
  html += '<div style="font-size:9px;letter-spacing:.05em;color:var(--text-secondary);margin-top:2px;">OFFSET POSITION</div>';
  ['x', 'y', 'z'].forEach(ax => {
    const v = tgt.position[ax];
    const def = aPos[ax];
    html += sliderRow(`pos-${ax}`, `Pos ${ax.toUpperCase()}`, -20, 20, 0.05, v, def);
  });
  } else { html += '<p class="body-hint">관절 위치·길이 고정 · 회전 또는 IK로 조정</p>'; }
  html += '<div style="font-size:9px;letter-spacing:.05em;color:var(--text-secondary);margin-top:4px;">JOINT ROTATION</div>';
  for (const [prop, range] of Object.entries(cfg.props)) {
    const v = typeof tgt[prop] === 'number' ? tgt[prop] : 0;
    const def = typeof aRot[prop] === 'number' ? aRot[prop] : 0;
    html += sliderRow(`rot-${prop}`, prop, range[0], range[1], 0.5, v, def);
  }
  html += `<div style="margin-top:10px;border-top:1px solid var(--glass-border);padding-top:10px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-size:9px;letter-spacing:.05em;color:var(--text-secondary);">IK CONTROLS</div>
      <label style="display:flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;">
        <input type="checkbox" id="ik-master-toggle" ${window.ikToggleActive ? 'checked' : ''}>
        <span>Enable IK</span>
      </label>
    </div>
    <select id="ik-limb-select" style="width:100%;padding:4px;background:rgba(0,0,0,0.5);color:white;border:1px solid var(--glass-border);border-radius:4px;margin-bottom:6px;" ${!window.ikToggleActive ? 'disabled' : ''}>
      <option value="">-- Select IK Joint --</option>
      ${IK_LIMBS.map(k => `<option value="${k}" ${ikEnabled[k] ? 'selected' : ''}>${k.replace('_', ' ')}</option>`).join('')}
    </select>
  </div>`;
  html += `<div style="margin-top:10px;border-top:1px solid var(--glass-border);padding-top:10px;">
    <div style="font-size:9px;letter-spacing:.05em;color:var(--text-secondary);margin-bottom:6px;">CAMERA ANGLE PRESETS (Relative to Torso)</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
      <button class="btn mannequin-cam-preset" data-preset="front">Front</button>
      <button class="btn mannequin-cam-preset" data-preset="back">Back</button>
      <button class="btn mannequin-cam-preset" data-preset="left">Left</button>
      <button class="btn mannequin-cam-preset" data-preset="right">Right</button>
      <button class="btn mannequin-cam-preset" data-preset="top">Top</button>
      <button class="btn mannequin-cam-preset" data-preset="bottom">Bottom</button>
    </div>
  </div>`;
  
  return html + '</div>';
}

function setupSliderListeners() {
  const cfg = poseConfig[selectedBodyPart];
  const tgt = cfg.target === 'self' ? activeMannequin : activeMannequin[cfg.target];
  function bind(id, read, write) {
    const rng = document.getElementById(`rng-${id}`);
    const num = document.getElementById(`num-${id}`);
    if (!rng || !num) return;
    rng.addEventListener('input', () => {
      const v = THREE.MathUtils.clamp(parseFloat(rng.value), +rng.min, +rng.max);
      write(v);
      if(activeMannequin.torso)constrainBody(activeMannequin);
      num.value = v.toFixed(2);
    });
    num.addEventListener('input', () => {
      const entered = parseFloat(num.value);
      if (!Number.isFinite(entered)) return;
      const v = THREE.MathUtils.clamp(entered, +rng.min, +rng.max);
      write(v);num.value=String(v);
      if(activeMannequin.torso)constrainBody(activeMannequin);
      rng.value = Math.max(parseFloat(rng.min), Math.min(parseFloat(rng.max), v));
    });
    rng.addEventListener('change', captureState);
    num.addEventListener('change', captureState);
  }
  ['x', 'y', 'z'].forEach(ax => bind(`pos-${ax}`, () => tgt.position[ax], v => tgt.position[ax] = v));
  for (const prop of Object.keys(cfg.props)) bind(`rot-${prop}`, () => tgt[prop] || 0, v => tgt[prop] = v);

  // Per-slider reset buttons
  document.querySelectorAll('.btn-reset-slider').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const def = parseFloat(btn.dataset.def);
      if (id.startsWith('pos-')) {
        const ax = id.replace('pos-', '');
        tgt.position[ax] = def;
      } else if (id.startsWith('rot-')) {
        const prop = id.replace('rot-', '');
        tgt[prop] = def;
      }
      updatePropertiesPanel();
      if (activeMannequin) attachGizmo(activeMannequin);
      captureState();
    });
  });

  // Reset Part button
  const resetPartBtn = document.getElementById('btn-reset-bodypart');
  if (resetPartBtn) {
    resetPartBtn.addEventListener('click', () => {
      const aPos = tgt.userData.anatomicPos || new THREE.Vector3();
      const aRot = tgt.userData.anatomicRot || {};
      ['x', 'y', 'z'].forEach(ax => {
        tgt.position[ax] = aPos[ax];
      });
      for (const prop of Object.keys(cfg.props)) {
        const defVal = typeof aRot[prop] === 'number' ? aRot[prop] : 0;
        tgt[prop] = defVal;
      }
      updatePropertiesPanel();
      if (activeMannequin) attachGizmo(activeMannequin);
      updateMannequinHUD();
      captureState();
    });
  }

  const masterToggle = document.getElementById('ik-master-toggle');
  const limbSelect = document.getElementById('ik-limb-select');
  if (masterToggle) {
    masterToggle.addEventListener('change', e => {
      window.ikToggleActive = e.target.checked;
      if (limbSelect) limbSelect.disabled = !window.ikToggleActive;
      // Disable/enable individual IK limbs based on toggle
      IK_LIMBS.forEach(k => {
        ikEnabled[k] = window.ikToggleActive && limbSelect.value === k;
      });
      if (!window.ikToggleActive) {
        isDraggingIK = false;
        activeIKHandle = null;
      }
      updateStageControlsEnabled();
      updatePropertiesPanel();
    });
  }

  if (limbSelect) {
    limbSelect.addEventListener('change', e => {
      IK_LIMBS.forEach(k => {
        ikEnabled[k] = (e.target.value === k);
      });
      updatePropertiesPanel();
    });
  }

  document.querySelectorAll('.mannequin-cam-preset').forEach(btn => {
    btn.addEventListener('click', e => {
      if (!activeMannequin || !activeMannequin.torso) return;
      const preset = e.target.dataset.preset;
      const torso = activeMannequin.torso;
      
      const distance = 5; // distance from torso
      const offsets = {
        front: new THREE.Vector3(distance, 0, 0),
        back: new THREE.Vector3(-distance, 0, 0),
        left: new THREE.Vector3(0, 0, -distance),
        right: new THREE.Vector3(0, 0, distance),
        top: new THREE.Vector3(0, distance, 0),
        bottom: new THREE.Vector3(0, -distance, 0)
      };

      const offset = offsets[preset].clone();
      
      // Apply torso's world rotation to the offset
      const torsoWorldQuat = new THREE.Quaternion();
      torso.getWorldQuaternion(torsoWorldQuat);
      offset.applyQuaternion(torsoWorldQuat);

      // Get torso's world position
      const torsoWorldPos = new THREE.Vector3();
      torso.getWorldPosition(torsoWorldPos);

      // Set camera position and target
      stage.camera.position.copy(torsoWorldPos).add(offset);
      stage.controls.target.copy(torsoWorldPos);
      
      stage.camera.lookAt(torsoWorldPos);
      stage.controls.update();
      updateHUDValues();
    });
  });
}

function bodyProfilePanel() {
  if(!activeMannequin?.torso)return '';
  const p=activeMannequin.userData.bodyProfile;
  const height=p?.height||1.75,heads=p?.headUnits||8;
  const chest=p?.chest||{height:0.65,spacing:0.46,projection:1};
  const chestUI='<details class="body-chest"><summary>가슴 형태 참조</summary><label class="studio-check"><input id="body-chest-enabled" type="checkbox" '+(p?.chest?'checked':'')+'> 가슴 형태 표시</label><div id="body-chest-options" '+(p?.chest?'':'hidden')+'><label>흉곽 높이 % <input id="body-chest-height" type="number" min="55" max="78" step="1" value="'+Math.round(chest.height*100)+'"></label><label>좌우 간격 % <input id="body-chest-spacing" type="number" min="30" max="60" step="1" value="'+Math.round(chest.spacing*100)+'"></label><label>돌출 배율 <input id="body-chest-projection" type="number" min="0.4" max="1.6" step="0.1" value="'+chest.projection+'"></label><p class="body-hint">흉곽에 붙은 입체 참조입니다. 포즈와 함께 움직이며 컬러·깊이 캡처에 포함됩니다.</p></div></details>';
  return '<section class="body-profile"><h3>인물 체형 설정</h3><div class="studio-row"><label>키 cm <input id="body-height" type="number" min="50" max="300" step="0.1" value="'+(height*100).toFixed(1)+'"></label><label>등신 <input id="body-head-units" type="number" min="3" max="12" step="0.5" value="'+heads+'"></label></div><div class="studio-row"><button class="btn" data-head-units="5">5등신</button><button class="btn" data-head-units="8">8등신</button><button class="btn" data-head-units="9.5">9.5등신</button><button class="btn primary" id="body-apply">체형 적용</button></div>'+chestUI+'<p class="body-hint">'+(p?'설정: '+(p.height*100).toFixed(1)+'cm / '+p.headUnits+'등신 · 머리 '+(p.height/p.headUnits*100).toFixed(2)+'cm':'기존 인체 유지 중 · 적용 버튼으로 체형을 설정하세요.')+'</p><p class="body-hint">포즈 조작 중 뼈 길이와 크기 고정. 관절 이동은 끝점 IK, 회전은 관절 회전입니다.</p><output id="body-status"></output></section>';
}
function bindBodyProfile() {
  if(!activeMannequin?.torso)return;
  document.querySelectorAll('[data-head-units]').forEach(button=>button.onclick=()=>{document.getElementById('body-head-units').value=button.dataset.headUnits;});
  document.getElementById('body-chest-enabled').onchange=e=>{document.getElementById('body-chest-options').hidden=!e.target.checked;};
  document.getElementById('body-apply').onclick=()=>{
    const message=document.getElementById('body-status');
    try {
      const profile={height:Number(document.getElementById('body-height').value)/100,headUnits:Number(document.getElementById('body-head-units').value)};
      if(document.getElementById('body-chest-enabled').checked)profile.chest={height:Number(document.getElementById('body-chest-height').value)/100,spacing:Number(document.getElementById('body-chest-spacing').value)/100,projection:Number(document.getElementById('body-chest-projection').value)};
      configureBody(activeMannequin,profile,true);
      captureState();updatePropertiesPanel();
    }catch(error){message.textContent=error.message;message.className='error';}
  };
}
function showIKResult(result) {
  const message=document.getElementById('body-status');
  if(message)message.textContent=result.reached?'관절 범위 안에서 이동했습니다.':result.targetClamped?'도달 가능한 위치까지만 이동했습니다. 뼈 길이는 유지됩니다.':'자세가 튀지 않도록 단계적으로 이동합니다. 계속 조정하세요. 뼈 길이는 유지됩니다.';
}
function updatePropertiesPanel() {
  const content=document.getElementById('properties-content');
  if(!activeMannequin){content.innerHTML='<p>인물 또는 소품을 선택하세요.</p>';return;}
  const parts=Object.keys(poseConfig).filter(key=>activeMannequin.torso||key==='Root');
  if(!parts.includes(selectedBodyPart))selectedBodyPart='Root';
  content.innerHTML=bodyProfilePanel()+'<div class="advanced-pose-controls"><select id="body-part-select" aria-label="조작할 관절">'+parts.map(k=>'<option value="'+k+'" '+(k===selectedBodyPart?'selected':'')+'>'+k.replaceAll('_',' ')+'</option>').join('')+'</select>'+renderSliders()+'</div>';
  document.getElementById('body-part-select').onchange=e=>{
    selectedBodyPart=e.target.value;
    const cfg=poseConfig[selectedBodyPart];
    if(cfg.target!=='self'&&activeMannequin[cfg.target])setHighlight(activeMannequin[cfg.target]);else clearHighlight();
    updatePropertiesPanel();
  };
  renderObjectInfo(content,activeMannequin,studio?.snapshot().document,{objects:()=>[...mannequins,...importedModels],commit:()=>{captureState();updateLayerWindow();}});
  setupSliderListeners();bindBodyProfile();attachGizmo(activeMannequin);
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
    if(e.target.closest?.('#pose-library-panel,#pose-source-dialog'))return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      e.preventDefault();
      deleteSelected();
    }
  });
}

// ─── Camera HUD Listeners ─────────────────────────────────────────────────────
function setupHUDListeners() {
  ['x', 'y', 'z'].forEach(a => {
    const rng = document.getElementById(`cam-pos-${a}`);
    const num = document.getElementById(`val-cam-pos-${a}`);
    const inc = document.getElementById(`btn-cam-pos-${a}-inc`);
    const dec = document.getElementById(`btn-cam-pos-${a}-dec`);
    rng.addEventListener('input', () => { stage.camera.position[a] = +rng.value; num.textContent = rng.value; });
    inc.addEventListener('click', () => { stage.camera.position[a] += 1; updateHUDValues(); });
    dec.addEventListener('click', () => { stage.camera.position[a] -= 1; updateHUDValues(); });
  });
  ['x', 'y', 'z'].forEach(a => {
    const rng = document.getElementById(`cam-rot-${a}`);
    const num = document.getElementById(`val-cam-rot-${a}`);
    const inc = document.getElementById(`btn-cam-rot-${a}-inc`);
    const dec = document.getElementById(`btn-cam-rot-${a}-dec`);
    rng.addEventListener('input', () => {
      stage.camera.rotation[a] = THREE.MathUtils.degToRad(+rng.value);
      num.textContent = rng.value + '°';
    });
    inc.addEventListener('click', () => {
      stage.camera.rotation[a] = THREE.MathUtils.degToRad(THREE.MathUtils.radToDeg(stage.camera.rotation[a]) + 0.5);
      updateHUDValues();
    });
    dec.addEventListener('click', () => {
      stage.camera.rotation[a] = THREE.MathUtils.degToRad(THREE.MathUtils.radToDeg(stage.camera.rotation[a]) - 0.5);
      updateHUDValues();
    });
  });
  document.querySelectorAll('.cam-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = { front: [0, 0.7, 7], back: [0, 0.7, -7], left: [-7, 0.7, 0], right: [7, 0.7, 0], top: [0, 10, 0.01] }[btn.dataset.preset];
      if (pos) { stage.camera.position.set(...pos); updateHUDValues(); }
    });
  });
}

// ─── Mouse Interaction ────────────────────────────────────────────────────────
function onMouseDown(event) {
  if(directEditor?.cameraPan)return;
  if (event.target.closest('.glass-panel') || transformControl.dragging || transformControl.axis !== null) return;
  if (event.button !== 0) return;
  const rect = stage.renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, stage.camera);
  
  // Check IK handles first
  const ikHits = raycaster.intersectObjects(Object.values(ikHandles).filter(h => h.visible));
  if (ikHits.length > 0) {
    activeIKHandle = ikHits[0].object;
    isDraggingIK = true;
    updateStageControlsEnabled();
    const limbKey = activeIKHandle.userData.ikLimbKey;
    const chain = IK_CHAINS[limbKey];
    const endJoint = activeMannequin[chain[chain.length - 1]];
    if (endJoint) {
      const endPos = new THREE.Vector3();
      endJoint.getWorldPosition(endPos);
      stage.camera.getWorldDirection(ikDragPlaneNormal);
      ikDragPlane.setFromNormalAndCoplanarPoint(ikDragPlaneNormal, endPos);
    }
    return;
  }
  
  // Check mannequins and imported models
  const allObjects = [...mannequins, ...importedModels];
  const hits = raycaster.intersectObjects(allObjects, true);
  if (hits.length > 0) {
    let hitNode = hits[0].object;
    
    // First, find the root mannequin or imported model
    const root = mannequins.find(m => {
      let n = hitNode;
      while(n) { if (n === m) return true; n = n.parent; }
      return false;
    });
    
    const importedRoot = importedModels.find(m => {
      let n = hitNode;
      while(n) { if (n === m) return true; n = n.parent; }
      return false;
    });

    const targetRoot = root || importedRoot;
    
    if (targetRoot) {
      activeMannequin = targetRoot;
      attachGizmo(activeMannequin);

      let posePartKey = null;
      // Traverse up to find a node that has a posePartKey, or until we hit the root
      let curr = hitNode;
      while (curr) {
        // We found a specific body part mapping
        for (const [key, cfg] of Object.entries(poseConfig)) {
          if (cfg.target !== 'self' && activeMannequin[cfg.target] === curr) {
            posePartKey = key;
            break;
          }
        }
        if (posePartKey) break;
        curr = curr.parent;
      }
      
      if (posePartKey) {
        selectedBodyPart = posePartKey;
        const cfg = poseConfig[selectedBodyPart];
        if (cfg && cfg.target !== 'self' && activeMannequin[cfg.target]) {
          setHighlight(activeMannequin[cfg.target]);
        } else {
          clearHighlight();
        }
      } else {
        selectedBodyPart = 'Root';
        clearHighlight();
      }
      updatePropertiesPanel();
      
      // Ensure the properties panel is visible
      const panel = document.getElementById('properties-panel');
      if (panel) panel.classList.remove('hidden');
    }
  }
}

function onMouseMove(event) {
  if (isDraggingIK && activeIKHandle && activeMannequin) {
    const rect = stage.renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, stage.camera);
    const pt = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(ikDragPlane, pt);
    if (hit) {
      solveIKChain(activeMannequin, activeIKHandle.userData.ikLimbKey, pt);
      activeIKHandle.position.copy(getChainEnd(activeMannequin,activeIKHandle.userData.ikLimbKey));
    }
  }
}

function onMouseUp() {
  if (isDraggingIK) {
    isDraggingIK = false;
    activeIKHandle = null;
    updateStageControlsEnabled();
    updatePropertiesPanel();
    captureState();
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  stage = getStage();
  stage.scene.background = new THREE.Color(0x1a1a1a);
  const cc = document.getElementById('canvas-container');
  if (cc && stage.renderer.domElement.parentNode === document.body) {
    document.body.removeChild(stage.renderer.domElement);
    cc.appendChild(stage.renderer.domElement);
    Object.assign(stage.renderer.domElement.style, { position:'absolute', top:'0', left:'0', width:'100%', height:'100%' });
  }
  createStage(() => { if(document.getElementById('camera-hud')?.offsetParent)updateHUDValues();if(document.getElementById('mannequin-pos-hud')?.offsetParent)updateMannequinHUD();tickIKHandles();syncProxy(); });
  if (stage.ground && stage.ground.material) { stage.ground.material.transparent = true; stage.ground.material.opacity = 0.8; }
  stage.camera.position.set(0, 0.7, 7);
  stage.camera.rotation.set(THREE.MathUtils.degToRad(-4), 0, 0);
  stage.controls.target.set(0, 0.7, 0);
  stage.controls.update();

  const grid = new THREE.GridHelper(100, 100, 0x000000, 0x000000);
  grid.material.transparent = true;
  grid.material.opacity = 0.2;
  stage.scene.add(grid);
  stage.scene.add(new THREE.AxesHelper(10));

  transformProxy = new THREE.Object3D();
  stage.scene.add(transformProxy);
  const lineMat = new THREE.LineDashedMaterial({ color: 0x888888, dashSize: 0.2, gapSize: 0.1 });
  connectionLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), lineMat);
  connectionLine.userData.exportHideWhenGizmoDisabled = true;
  connectionLine.visible = false;
  stage.scene.add(connectionLine);

  transformControl = new TransformControls(stage.camera, stage.renderer.domElement);
  transformControl.userData.exportHideWhenGizmoDisabled = true;
  transformControl.traverse(obj => {
    obj.userData.exportHideWhenGizmoDisabled = true;
  });
  transformControl.addEventListener('dragging-changed', e => {
    updateStageControlsEnabled();
    // Sync the numeric panel to the dragged pose so a later slider edit starts from it.
    if (!e.value) { updatePropertiesPanel(); captureState(); }
  });
  transformControl.addEventListener('objectChange',()=>{
    viewPerformance?.invalidate();
    if(!activeMannequin)return;
    if(gizmoJoint){
      if(transformControl.getMode()==='translate'&&gizmoChain){
        const result=solveConstrainedIK(activeMannequin,gizmoChain,transformProxy.position.clone());
        activeMannequin[gizmoChain.at(-1)].getWorldPosition(transformProxy.position);showIKResult(result);
      }else{
        const joint=activeMannequin[gizmoJoint],parent=new THREE.Quaternion();
        joint.parent.getWorldQuaternion(parent);
        joint.quaternion.copy(parent.invert().multiply(transformProxy.quaternion));
        clampJoint(activeMannequin,gizmoJoint);constrainBody(activeMannequin);
      }
    }else{
      const pos=transformProxy.position.clone();if(activeMannequin.torso)pos.sub(GIZMO_OFFSET);
      activeMannequin.position.copy(pos);activeMannequin.quaternion.copy(transformProxy.quaternion);
      if(activeMannequin.torso)enforceBoneLengths(activeMannequin);else activeMannequin.scale.copy(transformProxy.scale);
    }
  });
  stage.scene.add(transformControl);

  initIKHandles();
  initExportSystem(stage, THREE);
  setupHUDListeners();
  setupKeyboardShortcuts();

  document.getElementById('btn-focus-center').addEventListener('click', () => {
    stage.camera.position.set(0, 0.7, 7);
    stage.controls.target.set(0, 0.7, 0);
    updateHUDValues();
  });

  const btnTranslate = document.getElementById('btn-gizmo-translate');
  const btnRotate = document.getElementById('btn-gizmo-rotate');
  
  if (btnTranslate && btnRotate) {
    btnTranslate.addEventListener('click', () => {
      directEditor?.setMode('advanced');
      transformControl.setMode('translate');
      if(activeMannequin)attachGizmo(activeMannequin);
      btnTranslate.style.background = 'rgba(255,255,255,0.15)';
      btnRotate.style.background = 'transparent';
    });
    btnRotate.addEventListener('click', () => {
      directEditor?.setMode('advanced');
      transformControl.setMode('rotate');
      if(activeMannequin)attachGizmo(activeMannequin);
      btnRotate.style.background = 'rgba(255,255,255,0.15)';
      btnTranslate.style.background = 'transparent';
    });
  }

  const addMannequinBtn = document.getElementById('btn-add-mannequin');
  const addMannequinMenu = document.getElementById('add-mannequin-menu');
  const addMannequinPathBtn = document.getElementById('btn-add-mannequin-path');
  if (addMannequinBtn && addMannequinMenu) {
    addMannequinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addMannequinMenu.classList.toggle('hidden');
    });
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addMannequinMenu.classList.add('hidden');
        addMannequin(btn.dataset.preset);
      });
    });
    if (addMannequinPathBtn) {
      addMannequinPathBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addMannequinMenu.classList.add('hidden');
        addMannequinFromPickedFile();
      });
    }
    window.addEventListener('click', () => {
      addMannequinMenu.classList.add('hidden');
    });
  }

  document.getElementById('btn-save').addEventListener('click', saveProject);
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-load').addEventListener('change', e => {
    if (e.target.files[0]) loadProject(e.target.files[0]);
  });

  // GLB Import button
  const importBtn = document.getElementById('btn-import');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.glb,.gltf';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) importGLB(file);
      };
      input.click();
    });
  }

  // Mouse events
  stage.renderer.domElement.addEventListener('pointerdown', onMouseDown);
  window.addEventListener('pointermove', onMouseMove);
  window.addEventListener('pointerup', onMouseUp);

  // Panel hamburger toggle
  const hamb = document.getElementById('btn-hamburguer');
  const panel = document.getElementById('properties-panel');
  if (hamb && panel) {
    hamb.addEventListener('click', () => panel.classList.toggle('collapsed'));
  }
  
  const layerHamb = document.getElementById('btn-layer-hamburguer');
  const layerPanel = document.getElementById('layer-panel');
  if (layerHamb && layerPanel) {
    layerHamb.addEventListener('click', () => layerPanel.classList.toggle('collapsed'));
  }

  // Create initial mannequin
  addMannequin();
  studio = initCutsceneStudio({
    stage, THREE, mannequins, importedModels, poseConfig, createFullMannequin,
    getState: snapshotState, applyState, commit: captureState,
    addObject(data) { if (data.type === "mannequin") addMannequinFromData(data); else addImportedModelFromData(data); },
    select(object) { activeMannequin = object; selectedBodyPart = 'Root'; clearHighlight(); attachGizmo(object); updatePropertiesPanel(); updateLayerWindow(); },
    clean() { clearHighlight(); },
    workingCamera:()=>viewPerformance?.snapshotCamera(),
    setWorkingCamera(def){if(viewPerformance)viewPerformance.setWorkingCamera(def);else{stage.camera.position.fromArray(def.position);stage.camera.fov=def.fov;stage.camera.updateProjectionMatrix();stage.controls.target.fromArray(def.target);stage.controls.update();}},
    setWorkingFov(value){if(viewPerformance)viewPerformance.setWorkingFov(value);else{stage.camera.fov=value;stage.camera.updateProjectionMatrix();}},
  });
  stage.controls.addEventListener('end', () => captureState());
  directEditor=initDirectEditor({stage,sceneObjects:()=>[...mannequins,...importedModels],cameraModeChanged(value){transformControl.enabled=!value;},getSelection:()=>activeMannequin,objects:()=>viewPerformance?.editingObjects()||[...mannequins,...importedModels],commit:captureState,refresh:updatePropertiesPanel,
    invalidate:()=>viewPerformance?.invalidate(),revision:()=>viewPerformance?.revision()||0,
    setDragging(value){directDragging=value;updateStageControlsEnabled();},
    select(object,part){activeMannequin=object;selectedBodyPart=part;clearHighlight();updatePropertiesPanel();updateLayerWindow();},
    modeChanged(mode){interactionMode=mode;isDraggingIK=false;activeIKHandle=null;Object.keys(ikEnabled).forEach(key=>ikEnabled[key]=false);if(mode==='move')selectedBodyPart='Root';updateStageControlsEnabled();updatePropertiesPanel();viewPerformance?.sync();viewPerformance?.invalidate();}
  });
  poseLibrary=installPoseLibrary(directEditor,{getSelection:()=>activeMannequin,refresh:updatePropertiesPanel,commit:captureState,thumbnail:()=>studio.poseThumbnail(activeMannequin),afterApply:view=>viewPerformance?.refocus(view)});
  viewPerformance=initViewPerformance({stage,getSelection:()=>activeMannequin,getMode:()=>interactionMode,objects:()=>[...mannequins,...importedModels],isDragging:()=>directDragging||isDraggingIK||!!transformControl.dragging,
    invalidatePreview:()=>studio.invalidatePreview(),tickPreview:paused=>studio.tick({paused}),updateWalls:()=>studio.updateEditingWalls()});
  captureState();
}

function addMannequin(poseName = 'Default') {
    const m = createFullMannequin();
    m.position.set(0, GROUND_Y, 0);
    
    if (poseName && BUILTIN_POSES[poseName]) {
      const p = BUILTIN_POSES[poseName];
      if (p.posture) m.posture = p.posture;
      if (p.joints) {
        for (const [part, data] of Object.entries(p.joints)) {
          if (m[part] && data.rotation) m[part].rotation.fromArray(data.rotation);
        }
      }
    }
    m.updateMatrixWorld(true);
    m.position.y -= new THREE.Box3().setFromObject(m).min.y;
    
    mannequins.push(m);
    activeMannequin = m;
    m.updateMatrixWorld(true);
    attachGizmo(m);
    updatePropertiesPanel();
    updateLayerWindow();
    captureState();
  }

init();
