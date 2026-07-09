const screens = [...document.querySelectorAll('.screen')];
const bookTabs = [...document.querySelectorAll('[data-tab]')];
const bookPanels = [...document.querySelectorAll('[data-panel]')];
const summaryTabs = [...document.querySelectorAll('[data-summary-tab]')];
const summaryPanels = [...document.querySelectorAll('[data-summary-panel]')];
const recordTabs = [...document.querySelectorAll('[data-record-tab]')];
const recordPanels = [...document.querySelectorAll('[data-record-panel]')];
const organizeButton = document.getElementById('organizeButton');
const organizeResult = document.getElementById('organizedResult');
const aehInput = document.getElementById('aehInput');
const toast = document.getElementById('toast');
const completionPrimary = document.getElementById('completionPrimary');
let currentScreen = 2;
let toastTimer;
let completionTarget = 2;
let completionTab = 'logs';

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
}

function setBookTab(tabName) {
  bookTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
  bookPanels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tabName));
}

function showScreen(index, tabName) {
  currentScreen = Math.max(0, Math.min(Number(index), 20));
  let matched = false;
  screens.forEach((screen) => {
    const on = Number(screen.dataset.screen) === currentScreen;
    screen.classList.toggle('active', on);
    if (on) matched = true;
  });
  if (!matched) { currentScreen = 2; screens.forEach((s) => s.classList.toggle('active', Number(s.dataset.screen) === 2)); }
  if (currentScreen === 2 && tabName) setBookTab(tabName);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCompletion(title, message, detail, target = 2, tab = 'logs') {
  document.getElementById('completionTitle').textContent = title;
  document.getElementById('completionMessage').textContent = message;
  document.querySelector('#completionCard strong').textContent = detail;
  completionTarget = target;
  completionTab = tab;
  showScreen(11);
}

document.addEventListener('click', (event) => {
  const screenLink = event.target.closest('[data-screen-link]');
  const chip = event.target.closest('[data-chip]');
  if (screenLink) {
    showScreen(screenLink.dataset.screenLink, screenLink.dataset.tabTarget);
    if (screenLink.dataset.recordTarget) setRecordTab(screenLink.dataset.recordTarget);
    if (screenLink.dataset.logTarget) setLogTab(screenLink.dataset.logTarget);
    const eventTarget = screenLink.dataset.eventTarget;
    if (eventTarget) {
      window.setTimeout(() => {
        const el = document.querySelector(`[data-event="${eventTarget}"]`);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top: y, behavior: 'smooth' });
          el.classList.add('flash');
          window.setTimeout(() => el.classList.remove('flash'), 1600);
        }
      }, 340);
    }
  }
  if (chip) {
    aehInput.value = chip.dataset.chip;
    aehInput.focus();
  }
});

document.getElementById('brandHome').addEventListener('click', (event) => {
  event.preventDefault();
  showScreen(2);
});

document.querySelector('.mic-button').addEventListener('click', () => showToast('ต้นแบบนี้ใช้ข้อความตัวอย่างแทนการเปิดไมค์ค่ะ'));

organizeButton.addEventListener('click', () => {
  if (!aehInput.value.trim()) {
    aehInput.focus();
    showToast('ลองเล่าเรื่องสั้น ๆ ก่อนนะคะ');
    return;
  }
  organizeButton.disabled = true;
  organizeButton.textContent = 'กำลังจัดลงสมุด…';
  window.setTimeout(() => {
    organizeButton.hidden = true;
    organizeResult.hidden = false;
    organizeResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 550);
});

bookTabs.forEach((tab) => tab.addEventListener('click', () => showScreen(2, tab.dataset.tab)));

function setRecordTab(tabName) {
  recordTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.recordTab === tabName));
  recordPanels.forEach((panel) => panel.classList.toggle('active', panel.dataset.recordPanel === tabName));
}

recordTabs.forEach((tab) => tab.addEventListener('click', () => setRecordTab(tab.dataset.recordTab)));

const logTabs = [...document.querySelectorAll('[data-log-tab]')];
const logPanels = [...document.querySelectorAll('[data-log-panel]')];
function setLogTab(tabName) {
  logTabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.logTab === tabName));
  logPanels.forEach((panel) => panel.classList.toggle('active', panel.dataset.logPanel === tabName));
}
logTabs.forEach((tab) => tab.addEventListener('click', () => setLogTab(tab.dataset.logTab)));

function setSummaryTab(tabName) {
  summaryTabs.forEach((item) => item.classList.toggle('active', item.dataset.summaryTab === tabName));
  summaryPanels.forEach((panel) => panel.classList.toggle('active', panel.dataset.summaryPanel === tabName));
}

summaryTabs.forEach((tab) => tab.addEventListener('click', () => {
  setSummaryTab(tab.dataset.summaryTab);
}));

document.querySelector('[data-action="done-medicine-list"]').addEventListener('click', (event) => {
  event.currentTarget.textContent = 'กินแล้ว ✓';
  showToast('จดไว้แล้วค่ะ ว่าม้ากินยาเรียบร้อย');
});

document.querySelectorAll('.organized-result article button').forEach((button) => {
  button.addEventListener('click', () => showToast('แตะคำในช่องเล่าเพื่อแก้ไขได้ค่ะ'));
});

document.getElementById('shareButton').addEventListener('click', async () => {
  const text = 'สรุปให้หมอ: ครอบครัวรายงานว่า ช่วง 4 สัปดาห์ที่ผ่านมา รับประทานอาหารและดื่มน้ำน้อยลง น้ำหนักลด 1.8 กก. และตื่นปัสสาวะกลางคืนประมาณ 5 ครั้ง/คืน';
  try { await navigator.clipboard.writeText(text); } catch { /* prototype fallback */ }
  showCompletion('สรุปพร้อมส่งต่อแล้วค่ะ', 'ตรวจคำและคัดลอกไว้ให้แล้ว', 'สรุปให้หมอ · ข้อมูลจากครอบครัว', 5, 'summary');
});

document.querySelectorAll('.emergency-card,.contact-card,.people-section button').forEach((button) => {
  button.addEventListener('click', () => showToast('ต้นแบบนี้จะไม่โทรออกจริงค่ะ'));
});

document.getElementById('weightForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const weight = Number(document.getElementById('weightInput').value).toFixed(1);
  const sys = document.getElementById('bpSystolic').value.trim();
  const dia = document.getElementById('bpDiastolic').value.trim();
  const pulse = document.getElementById('pulseInput').value.trim();
  document.querySelector('[data-screen="2"] .timeline article:nth-child(2) strong').innerHTML = `${weight} กก. <b>↘ 1.8 กก.</b>`;
  const vitals = document.querySelectorAll('[data-screen="2"] .vitals article strong');
  if (vitals.length === 3) {
    vitals[0].textContent = weight;
    if (sys && dia) vitals[1].textContent = `${sys}/${dia}`;
    if (pulse) vitals[2].textContent = pulse;
  }
  const detailBits = [`น้ำหนัก ${weight} กก.`];
  if (sys && dia) detailBits.push(`ความดัน ${sys}/${dia}`);
  if (pulse) detailBits.push(`ชีพจร ${pulse}`);
  showCompletion('เก็บค่าร่างกายลงสมุดแล้วค่ะ', 'แนวโน้มใหม่อยู่ในหน้าบันทึก', detailBits.join(' · '), 2, 'logs');
});

const MED_OPTIONS = ['ยาความดัน', 'แอสไพริน', 'ยาลดไขมัน', 'ยาละลายลิ่มเลือด', 'พาราเซตามอล', 'เพนิซิลลิน', 'ยาแก้อักเสบ (NSAIDs)'];
let allergies = ['เพนิซิลลิน'];
const medicineNameSelect = document.getElementById('medicineName');
const allergyChips = document.getElementById('allergyChips');
const allergyInput = document.getElementById('allergyInput');
const allergyNote = document.getElementById('allergyNote');
const allergyFact = document.getElementById('allergyFact');

function isAllergic(name) {
  return allergies.some((a) => a.trim() && name.toLowerCase().includes(a.trim().toLowerCase()));
}

function renderMedOptions() {
  const prev = medicineNameSelect.value;
  medicineNameSelect.innerHTML = '';
  MED_OPTIONS.forEach((name) => {
    const opt = document.createElement('option');
    const blocked = isAllergic(name);
    opt.value = name;
    opt.textContent = blocked ? `${name} · แพ้ยา — เลือกไม่ได้` : name;
    opt.disabled = blocked;
    medicineNameSelect.appendChild(opt);
  });
  if (prev && !isAllergic(prev)) medicineNameSelect.value = prev;
  else { const firstOk = MED_OPTIONS.find((n) => !isAllergic(n)); if (firstOk) medicineNameSelect.value = firstOk; }
  allergyNote.hidden = allergies.length === 0;
}

function renderAllergyChips() {
  allergyChips.innerHTML = '';
  if (allergies.length === 0) {
    const empty = document.createElement('small');
    empty.className = 'allergy-empty';
    empty.textContent = 'ยังไม่มีข้อมูลยาที่แพ้';
    allergyChips.appendChild(empty);
  }
  allergies.forEach((a, i) => {
    const chip = document.createElement('span');
    chip.className = 'allergy-chip';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.setAttribute('aria-label', `ลบ ${a}`);
    remove.dataset.remove = String(i);
    remove.textContent = '×';
    chip.appendChild(document.createTextNode(a));
    chip.appendChild(remove);
    allergyChips.appendChild(chip);
  });
  if (allergyFact) allergyFact.textContent = allergies.length ? `แพ้ ${allergies.join(', ')}` : 'ไม่มีข้อมูลการแพ้ยา';
  const summaryText = document.getElementById('allergySummaryText');
  if (summaryText) summaryText.textContent = allergies.length ? `แพ้: ${allergies.join(', ')}` : 'ยังไม่มีข้อมูลยาที่แพ้';
}

function addAllergy() {
  const val = allergyInput.value.trim();
  if (!val) { allergyInput.focus(); return; }
  if (!allergies.some((a) => a.toLowerCase() === val.toLowerCase())) allergies.push(val);
  allergyInput.value = '';
  renderAllergyChips();
  renderMedOptions();
  showToast('เพิ่มยาที่แพ้แล้ว จะล็อกไม่ให้เลือกยานี้');
}

if (medicineNameSelect) {
  document.getElementById('allergyAddBtn').addEventListener('click', addAllergy);
  allergyInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addAllergy(); } });
  const allergyEdit = document.getElementById('allergyEdit');
  const allergySummary = document.getElementById('allergySummary');
  document.getElementById('allergyEditBtn').addEventListener('click', () => {
    allergySummary.hidden = true;
    allergyEdit.hidden = false;
    allergyInput.focus();
  });
  document.getElementById('allergyDoneBtn').addEventListener('click', () => {
    allergyEdit.hidden = true;
    allergySummary.hidden = false;
  });
  allergyChips.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-remove]');
    if (!btn) return;
    allergies.splice(Number(btn.dataset.remove), 1);
    renderAllergyChips();
    renderMedOptions();
  });
  renderAllergyChips();
  renderMedOptions();
}

document.getElementById('medicineForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('medicineName').value.trim();
  const dose = document.getElementById('medicineDose').value;
  const when = document.getElementById('medicineWhen').value;
  const left = document.getElementById('medicineLeft').value;
  document.getElementById('medicineSummary').textContent = `${name} · ${dose} เม็ด`;
  document.getElementById('medicineMeta').textContent = `${when} · เหลือ ${left} เม็ด`;
  showCompletion('บันทึกรายการยาแล้วค่ะ', 'สมุดจะช่วยนับยาที่เหลือจากข้อมูลนี้', `${name} · ${dose} เม็ด · ${when}`, 2, 'meds');
});

document.getElementById('appointmentForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('newAppointmentName').value.trim();
  const place = document.getElementById('newAppointmentPlace').value.trim();
  const date = document.getElementById('newAppointmentDate').value;
  const time = document.getElementById('newAppointmentTime').value;
  document.getElementById('appointmentTitle').textContent = name;
  document.getElementById('appointmentPlace').textContent = place;
  document.getElementById('appointmentTime').textContent = `${date} · ${time} น.`;
  showCompletion('เก็บนัดใหม่แล้วค่ะ', 'นัดนี้อยู่ในสมุดและพร้อมแชร์ให้ครอบครัว', `${name} · ${date} ${time} น.`, 2, 'meds');
});

document.querySelectorAll('.followup-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.followup-card').forEach((c) => c.classList.remove('selected'));
    card.classList.add('selected');
    document.getElementById('newAppointmentName').value = card.dataset.fuName || '';
    document.getElementById('newAppointmentPlace').value = card.dataset.fuPlace || '';
    document.getElementById('newAppointmentNote').value = card.dataset.fuNote || '';
    showToast('ดึงข้อมูลจากนัดก่อนแล้ว เลือกวันเวลาใหม่ได้เลย');
  });
});

const visitNoteForm = document.getElementById('visitNoteForm');
document.querySelector('[data-action="appointment-done"]').addEventListener('click', () => {
  visitNoteForm.hidden = false;
  const y = visitNoteForm.getBoundingClientRect().top + window.scrollY - 90;
  window.scrollTo({ top: y, behavior: 'smooth' });
});

visitNoteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const symptom = document.getElementById('visitSymptom').value.trim();
  const meds = document.getElementById('visitMeds').value.trim();
  const next = document.getElementById('visitNext').value.trim();
  const bits = ['ไปตามนัดแล้ว'];
  if (symptom) bits.push(symptom);
  if (meds) bits.push(`ยา: ${meds}`);
  if (next) bits.push(`นัดถัดไป: ${next}`);
  visitNoteForm.hidden = true;
  showCompletion('เก็บบันทึกการรักษาแล้วค่ะ', 'บันทึกการไปหาหมอครั้งนี้อยู่ในประวัติของม้า', bits.join(' · '), 2, 'meds');
});

document.getElementById('shareLineButton').addEventListener('click', async () => {
  const text = 'นัดของม้า: พรุ่งนี้ 09:00 น. อายุรกรรมหัวใจ รพ.เจริญกรุงประชารักษ์ เตรียมบัตรประชาชน ใบนัด ยาที่ใช้อยู่ และสรุปจากสมุด';
  try { await navigator.clipboard.writeText(text); } catch { /* prototype fallback */ }
  showCompletion('การ์ดนัดพร้อมแชร์แล้วค่ะ', 'คัดลอกข้อความไว้แล้ว เปิด LINE แล้ววางได้เลย', 'นัดพรุ่งนี้ · 09:00 น. · อายุรกรรมหัวใจ', 9, 'meds');
});

completionPrimary.addEventListener('click', () => showScreen(completionTarget, completionTab));

document.getElementById('identityForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.getElementById('identityNameInput').value.trim();
  const age = document.getElementById('identityAgeInput').value.trim();
  const right = document.getElementById('identityRightInput').value.trim();
  const hospital = document.getElementById('identityHospitalInput').value.trim();
  const likes = document.getElementById('identityLikesInput').value.trim();
  const disease = document.getElementById('identityDiseaseInput').value.trim();
  const job = document.getElementById('identityJobInput').value.trim();
  document.getElementById('identityName').textContent = `${name} · ${age} ปี`;
  document.getElementById('identityMeta').textContent = `${right} · ${hospital}`;
  document.getElementById('identityLikes').textContent = likes;
  const jobEl = document.getElementById('identityJob');
  if (jobEl) jobEl.textContent = job ? `อาชีพ: ${job}` : '';
  const diseaseFact = document.getElementById('diseaseFact');
  if (diseaseFact && disease) diseaseFact.textContent = disease;
  document.getElementById('identityAvatar').textContent = name.slice(0, 2);
  const headerName = document.getElementById('careHeaderName');
  const headerAvatar = document.getElementById('careHeaderAvatar');
  if (headerName) headerName.textContent = name;
  if (headerAvatar) headerAvatar.textContent = name.slice(0, 2);
  showCompletion('อัปเดตประวัติแล้วค่ะ', 'ทีมที่มาช่วยดูแลจะเห็นข้อมูลล่าสุดตรงกัน', `${name} · ${age} ปี · ${hospital}`, 2, 'profile');
});

document.getElementById('guideForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const eating = document.getElementById('guideEating').value.trim();
  const walking = document.getElementById('guideWalking').value.trim();
  const sleeping = document.getElementById('guideSleeping').value.trim();
  const guideItems = document.querySelectorAll('.care-guide li p');
  guideItems[0].textContent = eating;
  guideItems[1].textContent = walking;
  guideItems[2].textContent = sleeping;
  const updated = document.querySelector('.updated');
  if (updated) updated.textContent = 'อัปเดตคู่มือวันนี้ · ข้อมูลตัวอย่าง';
  showCompletion('อัปเดตคู่มือแล้วค่ะ', 'คนที่มาช่วยดูแลจะเห็นฉบับล่าสุดตรงกัน', 'คู่มือดูแลม้า · อัปเดตวันนี้', 2, 'profile');
});

const previewParams = new URLSearchParams(window.location.search);
const previewScreen = Number(previewParams.get('screen') || 2);
const previewTab = previewParams.get('tab') || undefined;
if (previewParams.get('result') === '1') {
  organizeButton.hidden = true;
  organizeResult.hidden = false;
}
if (previewParams.get('summary')) setSummaryTab(previewParams.get('summary'));
showScreen(previewScreen, previewTab);
