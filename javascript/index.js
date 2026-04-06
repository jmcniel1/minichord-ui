// Global controller instance
const miniChordController = new MiniChordController();

// Legacy global variables for backward compatibility
let minichord_device = false;
let active_bank_number = -1;

//-->> UTILITIES
function map_value(value, in_min, in_max, out_min, out_max) {
  return (value - in_min) * (out_max - out_min) / (in_max - in_min) + Number(out_min);
}

// Update C-QNC-style fill bar on a slider
function updateSliderFill(slider) {
  const row = slider.closest('.param-row');
  if (!row) return;
  const fill = row.querySelector('.h-fill');
  if (!fill) return;
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  fill.style.width = pct + '%';
}

// SVG line icons for parameter types
function getParamIcon(name) {
  const n = name.toLowerCase();
  const s = (d) => `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

  // ADSR envelope
  if (/^attack/.test(n))    return s('<path d="M2 10L6 2L10 2"/>');
  if (/^hold/.test(n))      return s('<path d="M2 3L10 3"/>');
  if (/^decay/.test(n))     return s('<path d="M2 2L5 2L10 10"/>');
  if (/^sustain/.test(n))   return s('<path d="M1 6L11 6"/><path d="M1 4L1 8"/>');
  if (/^release/.test(n))   return s('<path d="M2 4C5 4 8 8 10 10"/>');
  if (/^retrigger/.test(n)) return s('<path d="M3 9A4 4 0 1 1 9 9"/><path d="M9 6V9H6"/>');

  // Oscillator
  if (n === 'waveform')     return s('<path d="M1 6C3 1 5 1 6 6C7 11 9 11 11 6"/>');
  if (n === 'amplitude' || n === 'global gain') return s('<path d="M3 10V6M6 10V3M9 10V7"/>');

  // Filter
  if (n === 'resonance')    return s('<path d="M1 10L4 10C5 10 6 2 7 10L11 10"/>');
  if (n === 'base frequency') return s('<path d="M1 8L4 8C5 8 6 3 8 3L11 3"/>');
  if (n.includes('keytrack')) return s('<path d="M2 3V10H4V6H6V10H8V3"/>');
  if (n.includes('filter sensitivity')) return s('<path d="M2 10C4 10 6 2 10 2"/>');

  // Effects
  if (n.includes('reverb size')) return s('<path d="M4 4A3 3 0 0 1 4 8"/><path d="M2 2A6 6 0 0 1 2 10"/>');
  if (n.includes('damping'))  return s('<path d="M1 6C2 4 3 8 4 6C5 5 6 7 7 6C8 5.5 9 6.5 10 6"/>');
  if (n.includes('diffusion')) return s('<circle cx="3" cy="4" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="3" r="1" fill="currentColor" stroke="none"/><circle cx="5" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="8" r="1" fill="currentColor" stroke="none"/>');
  if (n === 'pan')           return s('<path d="M1 6L4 3V9Z" fill="currentColor" stroke="none"/><path d="M6 4A3 3 0 0 1 6 8"/><path d="M8 2A5 5 0 0 1 8 10"/>');

  // Settings
  if (n.includes('transpose')) return s('<path d="M6 2V10"/><path d="M3 5L6 2L9 5"/>');
  if (n.includes('octave'))  return s('<path d="M2 10V7H5V4H8V1"/>');
  if (n.includes('color') || n.includes('hue')) return s('<circle cx="6" cy="6" r="4"/>');
  if (n.includes('channel')) return s('<circle cx="6" cy="6" r="3.5"/><circle cx="6" cy="6" r="1" fill="currentColor" stroke="none"/>');
  if (n.includes('chromatic')) return s('<path d="M2 10L4 6L6 10L8 6L10 10"/>');
  if (n.includes('shuffling')) return s('<path d="M2 4H5L7 8H10"/><path d="M2 8H5L7 4H10"/>');
  if (n.includes('sharp'))   return s('<path d="M4 1V11M8 1V11M2 4H10M2 8H10"/>');
  if (n.includes('frame shift')) return s('<path d="M2 6H10"/><path d="M7 3L10 6L7 9"/>');
  if (n.includes('key signature')) return s('<path d="M3 2V10"/><path d="M3 4L8 3"/><path d="M3 7L8 6"/>');

  // Modulation
  if (n.includes('pitch bend') || n.includes('bend')) return s('<path d="M3 10C3 4 9 4 9 2"/>');
  if (n.includes('note level')) return s('<circle cx="5" cy="8" r="2"/><path d="M7 8V2L10 4"/>');
  if (n.includes('frequency') && !n.includes('base')) return s('<path d="M1 6C3 2 5 10 6 6C7 2 9 10 11 6"/>');

  // Generic
  if (n.includes('attenuation')) return s('<path d="M2 2L10 10"/><path d="M7 2L10 2L10 5"/>');
  if (n.includes('range') || n.includes('percent')) return s('<path d="M2 6H10"/><path d="M2 4V8M10 4V8"/>');
  if (n.includes('control'))  return s('<circle cx="6" cy="6" r="3"/><path d="M6 3V1"/>');
  if (n.includes('mode') || n.includes('retrigger chord') || n.includes('held')) return s('<path d="M3 2V10M9 2V10M3 6H9"/>');
  if (n.includes('port'))    return s('<path d="M2 6H4M8 6H10"/><rect x="4" y="3" width="4" height="6" rx="1" fill="none"/>');
  if (n.includes('slash'))   return s('<path d="M3 10L9 2"/>');
  if (n.includes('barry'))   return s('<path d="M2 9C4 3 8 3 10 9"/>');
  if (n.includes('level'))   return s('<path d="M3 10V6M6 10V3M9 10V7"/>');

  return '';
}

// Group header icons — colored circle with line icon inside
function getGroupIcon(name) {
  const n = name.toLowerCase();
  // 22x22 circle bg + 12x12 icon centered (offset 5,5)
  const wrap = (paths) => `<svg width="33" height="33" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="11" fill="var(--group-color, rgba(255,255,255,0.2))" opacity="0.2"/><g transform="translate(5,5)" stroke="var(--group-color, #888)" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none">${paths}</g></svg>`;

  if (n === 'settings')
    return wrap('<circle cx="6" cy="6" r="2.5"/><path d="M6 1V2.5M6 9.5V11M1 6H2.5M9.5 6H11M2.5 2.5L3.5 3.5M8.5 8.5L9.5 9.5M2.5 9.5L3.5 8.5M8.5 3.5L9.5 2.5"/>');
  if (n === 'midi')
    return wrap('<circle cx="6" cy="6" r="4.5"/><circle cx="4" cy="5" r="0.7" fill="var(--group-color, #888)"/><circle cx="8" cy="5" r="0.7" fill="var(--group-color, #888)"/><circle cx="6" cy="8" r="0.7" fill="var(--group-color, #888)"/><circle cx="3.5" cy="7.5" r="0.7" fill="var(--group-color, #888)"/><circle cx="8.5" cy="7.5" r="0.7" fill="var(--group-color, #888)"/>');
  if (n === 'effects')
    return wrap('<path d="M6 1L7 4L10 3L8 6L11 7L8 8L10 11L7 9L6 12L5 9L2 11L4 8L1 7L4 6L2 3L5 4Z"/>');
  if (n === 'potentiometer')
    return wrap('<circle cx="6" cy="6" r="4"/><circle cx="6" cy="6" r="1.5" fill="var(--group-color, #888)"/><path d="M6 2V0M6 12V10"/>');
  if (n === 'general')
    return wrap('<path d="M2 3H10M2 6H10M2 9H10"/><circle cx="5" cy="3" r="1" fill="var(--group-color, #888)"/><circle cx="7" cy="6" r="1" fill="var(--group-color, #888)"/><circle cx="4" cy="9" r="1" fill="var(--group-color, #888)"/>');
  if (n === 'oscillator')
    return wrap('<path d="M0 6C2 1 4 1 6 6C8 11 10 11 12 6"/>');
  if (n === 'envelope')
    return wrap('<path d="M1 10L3 2L5 2L7 7L9 7L11 10"/>');
  if (n === 'low pass filter')
    return wrap('<path d="M1 3L5 3C7 3 8 5 9 8L11 10"/><path d="M7 2L9 5" opacity="0.4"/>');
  if (n === 'transient')
    return wrap('<path d="M1 10L4 10L6 1L8 10L11 10"/>');
  if (n === 'tremolo')
    return wrap('<path d="M1 6C2 3 3 3 4 6C5 9 6 9 7 6C8 3 9 3 10 6" opacity="0.4"/><path d="M1 6C2 4 3 4 4 6C5 8 6 8 7 6C8 4 9 4 10 6"/>');
  if (n === 'vibrato')
    return wrap('<path d="M1 6C2 2 3 10 4 6C5 2 6 10 7 6C8 2 9 10 10 6"/>');
  if (n === 'output filter')
    return wrap('<path d="M1 1L5 5V10L7 10V5L11 1Z"/>');
  if (n === 'rythm')
    return wrap('<path d="M6 1V8"/><circle cx="4" cy="9" r="2"/><path d="M1 4L4 2M8 2L11 4" opacity="0.4"/>');
  if (n === 'sequencer' || n === 'arp pattern')
    return wrap('<rect x="1" y="1" width="3" height="3" rx="0.5" fill="var(--group-color, #888)" opacity="0.6"/><rect x="5" y="1" width="3" height="3" rx="0.5" opacity="0.3"/><rect x="9" y="1" width="3" height="3" rx="0.5" fill="var(--group-color, #888)" opacity="0.6"/><rect x="1" y="5" width="3" height="3" rx="0.5" opacity="0.3"/><rect x="5" y="5" width="3" height="3" rx="0.5" fill="var(--group-color, #888)" opacity="0.6"/><rect x="9" y="5" width="3" height="3" rx="0.5" opacity="0.3"/><rect x="1" y="9" width="3" height="3" rx="0.5" opacity="0.3"/><rect x="5" y="9" width="3" height="3" rx="0.5" opacity="0.3"/><rect x="9" y="9" width="3" height="3" rx="0.5" fill="var(--group-color, #888)" opacity="0.6"/>');

  // fallback — generic dot
  return wrap('<circle cx="6" cy="6" r="3"/>');
}

//-->> UI BUILDER — dynamically generates parameter rows from JSON
async function buildParameterUI() {
  try {
    const response = await fetch('./json/parameters.json');
    const data = await response.json();

    const container = document.getElementById('parameters');
    const sections = [
      { key: 'global_parameter', title: 'Global parameters' },
      { key: 'harp_parameter', title: 'Harp parameters' },
      { key: 'chord_parameter', title: 'Chord parameters' }
    ];

    for (const section of sections) {
      const params = data[section.key];
      if (!params) continue;

      const sectionEl = document.createElement('div');
      sectionEl.className = 'param-section';

      // Per-section vibrant OKLCH color on the section element
      const sectionColors = {
        'Global parameters': 'oklch(0.75 0.2 160)',   // vibrant teal
        'Harp parameters':   'oklch(0.75 0.2 290)',   // vibrant violet
        'Chord parameters':  'oklch(0.75 0.2 30)'     // vibrant orange
      };
      sectionEl.style.setProperty('--section-color', sectionColors[section.title] || '#888');

      const h2 = document.createElement('h2');
      h2.textContent = section.title.replace(' parameters', '');
      sectionEl.appendChild(h2);

      // Group parameters by their group
      const groups = {};
      const groupOrder = [];
      for (const param of params) {
        if (!groups[param.group]) {
          groups[param.group] = [];
          groupOrder.push(param.group);
        }
        groups[param.group].push(param);
      }

      const createdGroups = [];

      // Per-group vibrant color palette (TE-DMX style)
      const groupPalette = [
        'oklch(0.80 0.18 85)',   // amber
        'oklch(0.75 0.20 155)',  // green
        'oklch(0.72 0.20 290)',  // violet
        'oklch(0.70 0.22 25)',   // coral
        'oklch(0.78 0.17 200)',  // cyan
        'oklch(0.75 0.19 330)',  // magenta
        'oklch(0.80 0.16 110)',  // lime
        'oklch(0.72 0.20 260)',  // blue
      ];
      let groupColorIndex = 0;

      for (const groupName of groupOrder) {
        const groupParams = groups[groupName];

        // Check if this is the Rythm group — it has special checkbox handling
        const isRhythmGroup = groupName === 'Rythm';

        const isOutputFilter = groupName === 'Output filter';
        const groupEl = document.createElement('div');
        groupEl.className = 'param-group' + (isRhythmGroup ? ' rhythm-group' : '') + (isOutputFilter ? ' output-filter-group' : '');

        if (groupName === 'hidden') {
          groupEl.style.display = 'none';
        } else {
          groupEl.style.setProperty('--group-color', groupPalette[groupColorIndex % groupPalette.length]);
          groupColorIndex++;
        }

        const h4 = document.createElement('h4');
        const groupIcon = getGroupIcon(groupName);
        if (groupIcon) {
          const iconSpan = document.createElement('span');
          iconSpan.className = 'group-icon';
          iconSpan.innerHTML = groupIcon;
          h4.appendChild(iconSpan);
        }
        const h4Text = document.createTextNode(groupName);
        h4.appendChild(h4Text);
        groupEl.appendChild(h4);

        for (const param of groupParams) {
          // Skip rhythm pattern entries (addresses 220-235) — they get special handling below
          if (param.sysex_adress >= miniChordController.base_adress_rythm &&
              param.sysex_adress < miniChordController.base_adress_rythm + 16) {
            continue;
          }

          const row = document.createElement('div');
          row.className = 'param-row';
          row.id = String(param.sysex_adress);
          row.setAttribute('version', param.introduction_version);

          // Fill bar
          const fill = document.createElement('div');
          fill.className = 'h-fill';
          row.appendChild(fill);

          // Name with icon (overlaid on fill)
          const nameEl = document.createElement('div');
          nameEl.className = 'param-name';
          const icon = getParamIcon(param.name);
          if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'param-icon';
            iconSpan.innerHTML = icon;
            nameEl.appendChild(iconSpan);
          }
          const dfn = document.createElement('dfn');
          dfn.title = param.tooltip || '';
          dfn.textContent = param.name;
          nameEl.appendChild(dfn);
          row.appendChild(nameEl);

          // Slider
          const slider = document.createElement('input');
          slider.type = 'range';
          slider.className = 'slider';

          if (param.data_type === 'float') {
            slider.min = param.min_value;
            slider.max = param.max_value;
            slider.step = 0.01;
            slider.value = param.default_value;
          } else {
            if (param.curve === 'exponential') {
              // For exponential, the slider operates in a log-mapped range
              slider.min = 0;
              slider.max = param.max_value;
              slider.step = 1;
              slider.value = param.default_value;
            } else {
              slider.min = param.min_value;
              slider.max = param.max_value;
              slider.step = 1;
              slider.value = param.default_value;
            }
          }

          slider.setAttribute('curve', param.curve);
          slider.setAttribute('data_type', param.data_type);
          slider.setAttribute('adress_field', param.sysex_adress);
          slider.setAttribute('target_min', param.min_value);
          slider.setAttribute('target_max', param.max_value);
          slider.setAttribute('version', param.introduction_version);
          slider.setAttribute('oninput', 'handlechange(this); updateSliderFill(this)');
          row.appendChild(slider);

          // Value display
          const valueEl = document.createElement('div');
          valueEl.className = 'param-value';
          const valueP = document.createElement('span');
          valueP.id = 'value_zone' + param.sysex_adress;
          valueP.textContent = param.default_value;
          valueEl.appendChild(valueP);
          row.appendChild(valueEl);

          groupEl.appendChild(row);
        }

        // Collect groups instead of appending directly
        if (isRhythmGroup) {
          createdGroups.push(groupEl); // sliders card

          const seqEl = document.createElement('div');
          seqEl.className = 'param-group sequencer-group';
          seqEl.style.setProperty('--group-color', groupEl.style.getPropertyValue('--group-color'));
          const seqH4 = document.createElement('h4');
          const seqIcon = getGroupIcon('Arp Pattern');
          if (seqIcon) {
            const seqIconSpan = document.createElement('span');
            seqIconSpan.className = 'group-icon';
            seqIconSpan.innerHTML = seqIcon;
            seqH4.appendChild(seqIconSpan);
          }
          seqH4.appendChild(document.createTextNode('Arp Pattern'));
          seqEl.appendChild(seqH4);

          const rhythmContainer = document.createElement('div');
          rhythmContainer.className = 'rhythm-grid';
          for (let i = 0; i < 16; i++) {
            const placeholder = document.createElement('div');
            placeholder.id = String(miniChordController.base_adress_rythm + i);
            rhythmContainer.appendChild(placeholder);
          }
          seqEl.appendChild(rhythmContainer);
          createdGroups.push(seqEl);
        } else {
          createdGroups.push(groupEl);
        }
      }

      // Stack short groups together into bento columns
      const MAX_STACK = 12;
      let currentStack = [];
      let currentCount = 0;

      for (const g of createdGroups) {
        const isHidden = g.style.display === 'none';
        const isSpecial = g.classList.contains('sequencer-group') || g.classList.contains('rhythm-group') || g.classList.contains('output-filter-group');
        const paramCount = g.querySelectorAll('.param-row').length;

        if (isHidden || isSpecial || paramCount > 6) {
          // Flush any pending stack first
          if (currentStack.length > 1) {
            const wrapper = document.createElement('div');
            wrapper.className = 'group-stack';
            for (const s of currentStack) wrapper.appendChild(s);
            sectionEl.appendChild(wrapper);
          } else if (currentStack.length === 1) {
            sectionEl.appendChild(currentStack[0]);
          }
          currentStack = [];
          currentCount = 0;
          sectionEl.appendChild(g);
        } else if (currentCount + paramCount <= MAX_STACK) {
          currentStack.push(g);
          currentCount += paramCount;
        } else {
          // Flush and start new stack
          if (currentStack.length > 1) {
            const wrapper = document.createElement('div');
            wrapper.className = 'group-stack';
            for (const s of currentStack) wrapper.appendChild(s);
            sectionEl.appendChild(wrapper);
          } else if (currentStack.length === 1) {
            sectionEl.appendChild(currentStack[0]);
          }
          currentStack = [g];
          currentCount = paramCount;
        }
      }
      // Flush remaining
      if (currentStack.length > 1) {
        const wrapper = document.createElement('div');
        wrapper.className = 'group-stack';
        for (const s of currentStack) wrapper.appendChild(s);
        sectionEl.appendChild(wrapper);
      } else if (currentStack.length === 1) {
        sectionEl.appendChild(currentStack[0]);
      }

      container.appendChild(sectionEl);
    }

    // Now build the rhythm checkboxes
    checkbox_array();

    // Initialize slider hover effects
    initializeSliderHoverEffects();

  } catch (error) {
    console.error('Error building parameter UI:', error);
  }
}

//-->> INTERFACE HANDLER
// Slider Handler
function handlechange(event) {
  const curve_type = event.getAttribute("curve");
  let range_value;
  if (curve_type == "exponential") {
    range_value = Math.exp((Math.log(event.max) / event.max) * event.value);
  } else {
    range_value = event.value;
  }
  let displayed_value;
  if (event.getAttribute("data_type") == "int") {
    displayed_value = map_value(range_value, event.min, event.max, event.getAttribute("target_min"), event.getAttribute("target_max")).toFixed(0);
  } else if (event.getAttribute("data_type") == "float") {
    displayed_value = map_value(range_value, event.min, event.max, event.getAttribute("target_min"), event.getAttribute("target_max")).toFixed(2);
    range_value = Math.round(range_value * miniChordController.float_multiplier);
  }
  const address = event.getAttribute("adress_field");
  var value_zone = document.getElementById("value_zone" + event.getAttribute("adress_field"));
  if (value_zone) {
    value_zone.innerHTML = displayed_value;
  }
  if (miniChordController.isConnected()) {
    miniChordController.sendParameter(address, Math.round(range_value));
  }
}

// Euclidean rhythm generator — distributes N hits evenly across M steps
function euclidean(hits, steps) {
  if (hits >= steps) return new Array(steps).fill(1);
  if (hits <= 0) return new Array(steps).fill(0);
  let pattern = [];
  let bucket = 0;
  for (let i = 0; i < steps; i++) {
    bucket += hits;
    if (bucket >= steps) {
      bucket -= steps;
      pattern.push(1);
    } else {
      pattern.push(0);
    }
  }
  return pattern;
}

// Rotate a pattern array by N positions
function rotatePattern(pattern, offset) {
  const n = pattern.length;
  const o = ((offset % n) + n) % n;
  return [...pattern.slice(o), ...pattern.slice(0, o)];
}

// Randomize one voice lane with a rhythmically coherent euclidean pattern
function randomizeVoiceLane(voiceIndex) {
  // Weighted hit counts — favor musical divisions
  const hitWeights = [
    { hits: 0, weight: 2 },
    { hits: 1, weight: 3 },
    { hits: 2, weight: 5 },   // half notes
    { hits: 3, weight: 6 },   // E(3,16) — common in world music
    { hits: 4, weight: 10 },  // 4/4 quarter notes
    { hits: 5, weight: 5 },   // E(5,16) — bossa nova feel
    { hits: 6, weight: 4 },   // E(6,16)
    { hits: 7, weight: 3 },   // E(7,16) — West African
    { hits: 8, weight: 7 },   // 8th notes
    { hits: 10, weight: 2 },
    { hits: 12, weight: 2 },
    { hits: 16, weight: 1 },  // all on
  ];

  // Weighted random selection
  const totalWeight = hitWeights.reduce((sum, w) => sum + w.weight, 0);
  let r = Math.random() * totalWeight;
  let selectedHits = 4;
  for (const w of hitWeights) {
    r -= w.weight;
    if (r <= 0) { selectedHits = w.hits; break; }
  }

  // Generate euclidean pattern with random rotation
  const pattern = euclidean(selectedHits, 16);
  const rotated = rotatePattern(pattern, Math.floor(Math.random() * 16));

  // Apply to checkboxes
  for (let j = 0; j < 16; j++) {
    const cb = document.getElementById('checkbox' + voiceIndex + j);
    if (cb) cb.checked = !!rotated[j];
  }

  // Send to device
  send_array_data();
}

// Build rhythm checkbox grid as a table
function checkbox_array() {
  const voiceNames = ['voice 1', 'voice 2', 'voice 3', 'voice 4', 'voice 4"', 'voice 5"', 'voice 6"'];

  // Find the rhythm grid container
  const gridContainer = document.querySelector('.rhythm-grid');
  if (!gridContainer) return;

  // Clear placeholder divs but keep them for ID-based lookups
  const table = document.createElement('table');

  // Header row with beat numbers
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const cornerTh = document.createElement('th');
  cornerTh.textContent = '';
  headerRow.appendChild(cornerTh);
  for (let j = 1; j <= 16; j++) {
    const th = document.createElement('th');
    th.textContent = j;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Voice rows
  const tbody = document.createElement('tbody');
  for (let i = 0; i < 7; i++) {
    const target_adress = miniChordController.base_adress_rythm + i;
    const container = document.getElementById(String(target_adress));
    if (container) {
      container.className = '';
      container.setAttribute('version', '2');
    }

    const tr = document.createElement('tr');
    const labelTd = document.createElement('td');
    const labelText = document.createElement('span');
    labelText.textContent = voiceNames[i] || ('voice ' + (i + 1));
    labelTd.appendChild(labelText);
    const diceBtn = document.createElement('button');
    diceBtn.className = 'dice-btn';
    diceBtn.title = 'Randomize lane';
    diceBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="12" height="12" rx="2"/><circle cx="4.5" cy="4.5" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="4.5" r="1" fill="currentColor" stroke="none"/><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="9.5" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="9.5" r="1" fill="currentColor" stroke="none"/></svg>';
    diceBtn.onclick = (function(idx) { return function(e) { e.stopPropagation(); randomizeVoiceLane(idx); }; })(i);
    labelTd.appendChild(diceBtn);
    const clearBtn = document.createElement('button');
    clearBtn.className = 'dice-btn';
    clearBtn.title = 'Clear lane';
    clearBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 2L10 10M10 2L2 10"/></svg>';
    clearBtn.onclick = (function(idx) { return function(e) { e.stopPropagation(); for (let j=0;j<16;j++){const cb=document.getElementById('checkbox'+idx+j);if(cb)cb.checked=false;} send_array_data(); }; })(i);
    labelTd.appendChild(clearBtn);
    tr.appendChild(labelTd);

    for (let j = 0; j < 16; j++) {
      const td = document.createElement('td');
      const checkBox = document.createElement('input');
      checkBox.type = 'checkbox';
      checkBox.id = 'checkbox' + i + j;
      checkBox.onclick = send_array_data;
      td.appendChild(checkBox);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  // Replace content inside rhythm grid
  // Keep the ID divs but hide them, add the table
  for (let i = 7; i < 16; i++) {
    const el = document.getElementById(String(miniChordController.base_adress_rythm + i));
    if (el) el.style.display = 'none';
  }

  gridContainer.appendChild(table);
}

function send_array_data() {
  for (var i = 0; i < 16; i++) {
    var output_value = 0;
    for (var j = 0; j < 7; j++) {
      var checkbox = document.getElementById("checkbox" + j + i);
      if (null != checkbox) {
        output_value = output_value | (checkbox.checked << j);
      }
    }
    console.log(output_value);
    miniChordController.sendParameter(miniChordController.base_adress_rythm + i, output_value);
  }
}

//-->> UI INTEGRATION
// UI callbacks for controller events
miniChordController.onConnectionChange = function(connected, message) {
  if (connected) {
    document.getElementById("step3").className = "satisfied";
    document.getElementById("information_text").innerHTML = "";
    document.getElementById("status_zone").className = "connected";
    var body = document.getElementById('body');
    body.classList.remove("control_full");
  } else {
    document.getElementById("information_text").innerHTML = message;
    document.getElementById("information_zone").focus();
    if (message.includes("disconnected")) {
      document.getElementById("status_zone").className = "disconnected";
      var body = document.getElementById('body');
      window.scrollTo(0, 0);
      body.classList.add("control_full");
      var elements = document.getElementsByClassName('active');
      while (elements.length > 0) {
        elements.item(0).classList.add("inactive");
        elements[0].classList.remove("active");
      }
    }
  }
  minichord_device = miniChordController.isConnected();
};

miniChordController.onDataReceived = function(data) {
  // Update sliders
  for (let i = 2; i < miniChordController.parameter_size; i++) {
    if (data.parameters[i] !== undefined) {
      set_slider_to_value(i, data.parameters[i]);
    }
  }

  // Update rhythm checkboxes
  for (let j = 0; j < data.rhythmData.length; j++) {
    const rhythmBits = data.rhythmData[j];
    if (rhythmBits) {
      for (let k = 0; k < 7; k++) {
        const checkbox = document.getElementById("checkbox" + k + j);
        if (checkbox) {
          checkbox.checked = rhythmBits[k];
        }
      }
    }
  }

  // Update bank selection
  const element = document.getElementById("bank_number_selection");
  if (element) {
    element.value = data.bankNumber;
  }
  active_bank_number = data.bankNumber;

  // Apply color theme from device
  const result = document.querySelectorAll('[adress_field="' + miniChordController.color_hue_sysex_adress + '"]');
  if (result.length > 0) {
    const hue = result[0].valueAsNumber;
    const elements = document.getElementsByClassName('slider');
    for (let i = 0; i < elements.length; i++) {
      elements[i].style.setProperty('--slider_color', 'hsl(' + hue + ',100%,50%)');
    }
    document.documentElement.style.setProperty('--slider-color', 'hsl(' + hue + ',100%,50%)');
  }

  // Update UI state
  document.getElementById("step3").className = "satisfied";
  document.getElementById("information_text").innerHTML = "";
  document.getElementById("status_zone").className = "connected";

  var body = document.getElementById('body');
  body.classList.remove("control_full");

  // Activate parameters based on firmware version
  var inactiveElements = document.querySelectorAll('.inactive');
  for (let i = 0; i < inactiveElements.length; i++) {
    const ver = inactiveElements[i].getAttribute("version");
    if (ver && ver <= data.firmwareVersion) {
      inactiveElements[i].classList.add("active");
      inactiveElements[i].classList.remove("inactive");
    }
  }

  miniChordController.onConnectionChange(true, "");
};

// Initialize the controller
async function initializeMidiController() {
  try {
    const success = await miniChordController.initialize();
    if (success) {
      document.getElementById("step1").className = "satisfied";
      document.getElementById("step2").className = "satisfied";
    } else {
      document.getElementById("information_text").innerHTML = "> please use a compatible browser";
      document.getElementById("information_zone").focus();
    }
  } catch (error) {
    console.log(">> ERROR: MIDI initialization failed");
    console.error(error);
    document.getElementById("information_text").innerHTML = "> please reload and provide the authorisation to access the minichord";
    document.getElementById("information_zone").focus();
  }
}

function set_slider_to_value(slider_num, sysex_value) {
  var result = document.querySelectorAll('[adress_field="' + slider_num + '"]');
  if (result.length > 0) {
    var slider_value;
    if (result[0].getAttribute("curve") == "exponential") {
      slider_value = Math.round((result[0].max * Math.log(sysex_value) / Math.log(result[0].max)));
    } else {
      slider_value = sysex_value;
    }
    if (result[0].getAttribute("data_type") == "float") {
      result[0].value = slider_value / miniChordController.float_multiplier;
      var value_zone = document.getElementById("value_zone" + slider_num);
      if (value_zone) {
        value_zone.innerHTML = sysex_value / miniChordController.float_multiplier;
      }
    } else {
      result[0].value = slider_value;
      var value_zone = document.getElementById("value_zone" + slider_num);
      if (value_zone) {
        value_zone.innerHTML = sysex_value;
      }
    }
    updateSliderFill(result[0]);
  }
}

//-->> COMMUNICATION HANDLERS
function reset_memory() {
  if (miniChordController.isConnected()) {
    return miniChordController.resetMemory();
  } else {
    document.getElementById("information_zone").focus();
    return false;
  }
}

function save_current_settings() {
  if (miniChordController.isConnected()) {
    var e = document.getElementById("bank_number_selection");
    var bank_number = e.value;
    console.log(bank_number);
    return miniChordController.saveCurrentSettings(bank_number);
  } else {
    document.getElementById("information_zone").focus();
    return false;
  }
}

function reset_current_bank() {
  if (miniChordController.isConnected()) {
    console.log(miniChordController.active_bank_number);
    return miniChordController.resetCurrentBank();
  } else {
    document.getElementById("information_zone").focus();
    return false;
  }
}

//-->> SETTINGS OFFLINE SHARE
function generate_settings() {
  if (!miniChordController.isConnected()) {
    document.getElementById("information_zone").focus();
  } else {
    var sysex_array = Array(miniChordController.parameter_size).fill(0);
    var sliders = document.querySelectorAll(".slider");
    for (let i = 0; i < sliders.length; i++) {
      var curve_type = sliders[i].getAttribute("curve");
      var range_value = 0;
      var adress = sliders[i].getAttribute("adress_field");
      if (curve_type == "exponential") {
        range_value = Math.round(Math.exp((Math.log(sliders[i].max) / sliders[i].max) * sliders[i].value));
      } else {
        range_value = sliders[i].value;
      }
      if (sliders[i].getAttribute("data_type") == "float") {
        range_value = Math.round(range_value * 100);
      }
      sysex_array[adress] = range_value;
    }
    // Rhythm pattern
    for (var i = 0; i < 16; i++) {
      var output_value = 0;
      for (var j = 0; j < 7; j++) {
        var checkbox = document.getElementById("checkbox" + j + i);
        if (null != checkbox) {
          output_value = output_value | checkbox.checked << j;
        }
      }
      sysex_array[miniChordController.base_adress_rythm + i] = output_value;
    }
    var output_base64 = "";
    var output_string = "{";
    for (let i = 0; i < (miniChordController.parameter_size - 1); i++) {
      output_string += String(sysex_array[i]);
      output_string += ",";
      output_base64 += sysex_array[i];
      output_base64 += ";";
    }
    output_string += String(sysex_array[miniChordController.parameter_size - 1]);
    output_string += "},";
    var encoded = btoa(output_base64);
    console.log(encoded);
    navigator.clipboard.writeText(encoded);
    alert("Preset code copied to clipboard");
    console.log(atob(encoded));
    document.getElementById("output_zone").innerHTML = output_string;
  }
}

function load_settings() {
  if (!miniChordController.isConnected()) {
    document.getElementById("information_zone").focus();
  } else {
    let preset_code = prompt('Paste preset code');
    if (preset_code != null) {
      var parameters = atob(preset_code).split(";");
      if (parameters.length != miniChordController.parameter_size) {
        alert("malformed preset code");
      } else {
        var adress_index = 2;
        for (adress_index; adress_index < miniChordController.parameter_size; adress_index++) {
          miniChordController.sendParameter(adress_index, parameters[adress_index]);
        }
        miniChordController.sendParameter(0, 0);
      }
    }
  }
}

// Hover highlighting for parameter names
function initializeSliderHoverEffects() {
  const sliders = document.querySelectorAll('.slider');
  sliders.forEach(slider => {
    const parentRow = slider.closest('.param-row');
    if (parentRow) {
      const nameEl = parentRow.querySelector('.param-name');
      if (nameEl) {
        slider.addEventListener('mouseenter', () => nameEl.classList.add('highlighted'));
        slider.addEventListener('mouseleave', () => nameEl.classList.remove('highlighted'));
      }
    }
  });
}

//-->> RANDOM PRESET GENERATOR
async function loadParameterRanges() {
  try {
    const [parametersResponse, presetsResponse] = await Promise.all([
      fetch('./json/parameters.json'),
      fetch('./json/shared_presets.json')
    ]);

    const parametersData = await parametersResponse.json();
    let presetsData = null;
    try {
      presetsData = await presetsResponse.json();
    } catch (e) {
      console.warn('shared_presets.json not available, using defaults');
    }

    const parameterRanges = {};
    let decodedPreset = null;

    if (presetsData && presetsData.shared_presets && presetsData.shared_presets.length > 0) {
      const randomPreset = presetsData.shared_presets[Math.floor(Math.random() * presetsData.shared_presets.length)];
      console.log(`Using random preset as base: "${randomPreset.name}" by ${randomPreset.author}`);
      decodedPreset = atob(randomPreset.value).split(';').map(v => parseFloat(v));
    }

    ['global_parameter', 'harp_parameter', 'chord_parameter'].forEach(category => {
      parametersData[category].forEach(param => {
        let defaultValue = param.default_value;
        if (decodedPreset) {
          const presetValue = decodedPreset[param.sysex_adress];
          if (presetValue !== undefined && presetValue !== null && !isNaN(presetValue)) {
            if (param.data_type === "float") {
              defaultValue = presetValue / 100;
            } else {
              defaultValue = presetValue;
            }
          }
        }
        parameterRanges[param.sysex_adress] = {
          min: param.min_value,
          max: param.max_value,
          type: param.data_type,
          default: defaultValue,
          original_default: param.default_value
        };
      });
    });

    return parameterRanges;
  } catch (error) {
    console.error('Error loading parameter ranges:', error);
    return {};
  }
}

// Normal distribution via Box-Muller
// Based on TerminalWaltz's code. GNU General Public License v3.0
function normalRandom(mean, sigma) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * sigma + mean;
}

async function generateRandomPreset() {
  if (!miniChordController.isConnected()) {
    document.getElementById("information_zone").focus();
    return;
  }

  const parameterRanges = await loadParameterRanges();
  const weirdness_factor = 0.10;
  const preset = Array(miniChordController.parameter_size).fill(0);
  const fixedValues = [32, 33, 34, 35, 41, 97, 106, 107, 108, 197];

  Object.entries(parameterRanges).forEach(([index, params]) => {
    const idx = parseInt(index);
    if (idx < 19 || fixedValues.includes(idx)) {
      preset[idx] = params.original_default;
    } else {
      const minVal = params.min;
      const maxVal = params.max;
      const center = params.default;
      const range = maxVal - minVal;
      const sigma = range * weirdness_factor;
      let value = normalRandom(center, sigma);
      if (value < 0) {
        value = -value / 4.0;
      }
      value = Math.max(minVal, Math.min(maxVal, value));
      if (params.type === "int") {
        preset[idx] = Math.round(value);
      } else {
        preset[idx] = Math.round(value * 100) / 100;
      }
    }
  });

  for (let i = 2; i < miniChordController.parameter_size; i++) {
    if (preset[i] !== undefined) {
      let valueToSend = preset[i];
      if (parameterRanges[i] && parameterRanges[i].type === "float") {
        valueToSend = Math.round(preset[i] * miniChordController.float_multiplier);
      }
      miniChordController.sendParameter(i, Math.round(valueToSend));
    }
  }

  miniChordController.sendParameter(0, 0);
  console.log("Random preset generated and applied!");
}

// (sidebar removed — controls are in the top header bar now)

//-->> INITIALIZATION
document.addEventListener('DOMContentLoaded', async () => {
  // Build UI from JSON
  await buildParameterUI();

  // Initialize all slider fills
  document.querySelectorAll('.slider').forEach(s => updateSliderFill(s));

  // Wire up randomise button
  const randomiseBtn = document.getElementById('randomise_btn');
  if (randomiseBtn) {
    randomiseBtn.addEventListener('click', generateRandomPreset);
  }

  // Start MIDI
  initializeMidiController();
});
