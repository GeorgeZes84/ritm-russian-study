import { chapters, lessons } from './data.js';

const STORAGE = 'ritm-progress-v1';
const view = document.getElementById('view');
const toast = document.getElementById('toast');
let saved;
try { saved = JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch { saved = {}; }
const progress = { done: saved.done || {}, attempts: saved.attempts || {}, mistakes: saved.mistakes || {} };
let currentLesson = null;
let chosen = {};
let recognition = null;
let speaking = false;
let pathFilter = 'all';
let challenge = null;

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const save = () => { try { localStorage.setItem(STORAGE, JSON.stringify(progress)); } catch { showToast('Η αποθήκευση προόδου δεν είναι διαθέσιμη εδώ.'); } };
const totalDone = () => lessons.filter(l => progress.done[l.id]).length;
const percent = () => Math.round(totalDone() / lessons.length * 100);
const dueEntries = () => Object.entries(progress.mistakes).filter(([, item]) => item.due <= Date.now());
const lessonNumber = (lesson) => lessons.findIndex(l => l.id === lesson.id) + 1;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3600);
}

function updateChrome() {
  document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'long' }).format(new Date());
  const badge = document.getElementById('reviewBadge');
  const due = dueEntries().length;
  badge.textContent = due;
  badge.hidden = due === 0;
  const route = location.hash.replace('#', '').split('/')[0] || 'home';
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.toggle('active', el.dataset.nav === route));
}

function lessonCard(lesson, compact = false) {
  const done = !!progress.done[lesson.id];
  return `<a class="lesson-card ${compact ? 'compact' : ''} ${done ? 'completed' : ''}" href="#lesson/${lesson.id}">
    <span class="lesson-icon ${chapters[lesson.chapter].color}">${lesson.symbol}</span>
    <span class="lesson-card-copy"><span class="eyebrow">${lesson.level} · ${escapeHTML(lesson.test)}</span><strong>${escapeHTML(lesson.title)}</strong><small>${escapeHTML(lesson.subtitle)}</small></span>
    <span class="lesson-card-end">${done ? '<span class="done-check" aria-label="Ολοκληρώθηκε">✓</span>' : `<small>${lesson.minutes} λεπτά</small><span class="round-arrow">↗</span>`}</span>
  </a>`;
}

function renderHome() {
  const next = lessons.find(l => !progress.done[l.id]) || lessons[0];
  const done = totalDone();
  view.innerHTML = `<section class="page home-page">
    <div class="page-intro"><div><span class="section-kicker"><span class="kicker-star">✦</span> ΚΑΛΩΣ ΗΡΘΕΣ</span><h1>Μάθε ρωσικά.<br /><em>Με τον δικό σου ρυθμό.</em></h1><p>Μικρές ιστορίες, καθαρές εξηγήσεις στα ελληνικά και η χαρά του «α, τώρα το κατάλαβα!».</p><a class="primary-button" href="#lesson/${next.id}">Συνέχισε την αποστολή <span>↗</span></a></div>
      <div class="hero-art" aria-hidden="true"><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div><span class="art-spark spark-one">✳</span><span class="art-spark spark-two">✦</span><div class="art-card art-card-back"><span>привет!</span></div><div class="art-card art-card-front"><span>Я могу!</span><small>Τα καταφέρνω ✨</small></div><span class="art-bubble">Я</span></div></div>
    <div class="dashboard-grid"><section class="progress-panel"><div class="panel-heading"><span>Η πρόοδός σου</span><span class="muted">${done} / ${lessons.length} αποστολές</span></div><div class="progress-body"><div class="progress-ring" style="--progress:${percent()}%"><span>${percent()}<small>%</small></span></div><div><h2>${done === 0 ? 'Η αρχή μιας ωραίας ιστορίας.' : done === lessons.length ? 'Τα κατάφερες!' : 'Συνέχισε έτσι.'}</h2><p>Κάθε μικρό μάθημα χτίζει μια πραγματική δεξιότητα.</p><div class="progress-track"><span style="width:${percent()}%"></span></div></div></div></section>
      <section class="daily-card"><div class="daily-top"><span class="mini-icon">⚡</span><span>Η ΕΠΟΜΕΝΗ ΑΠΟΣΤΟΛΗ</span></div><h2>${escapeHTML(next.title)}</h2><p>${escapeHTML(next.story)}</p><a href="#lesson/${next.id}">Ξεκίνα τώρα <span>↗</span></a></section></div>
    <a href="#challenge" class="challenge-promo"><span class="challenge-promo-icon">✳</span><span><strong>Θες να δεις τι θυμάσαι;</strong><small>Μια μικρή δοκιμασία με ερωτήσεις από διαφορετικές αποστολές.</small></span><span class="challenge-promo-arrow">↗</span></a>
    <div class="section-title-row"><div><span class="section-kicker">Η ΜΑΘΗΣΗ ΣΑΝ ΔΙΑΔΡΟΜΗ</span><h2>Διάλεξε πού θα πας.</h2></div><a href="#path" class="text-link">Δες όλες τις αποστολές ↗</a></div>
    <div class="chapter-grid">${chapters.map((chapter, index) => { const group = lessons.filter(l => l.chapter === index); const count = group.filter(l => progress.done[l.id]).length; return `<a class="chapter-card ${chapter.color}" href="#path/${index}"><span class="chapter-symbol">${chapter.icon}</span><span class="chapter-count">${String(index + 1).padStart(2,'0')} / 04</span><h3>${escapeHTML(chapter.title)}</h3><p>${escapeHTML(chapter.description)}</p><div class="chapter-foot"><span>${count} από ${group.length} ολοκληρώθηκαν</span><span>↗</span></div></a>`; }).join('')}</div>
    <p class="source-note">Η διαδρομή ακολουθεί τις θεματικές του βιβλίου «Тесты по грамматике для самостоятельной работы» (A1–A2). Οι εξηγήσεις και οι ασκήσεις εδώ είναι πρωτότυπες.</p>
  </section>`;
}

function renderPath() {
  const hashFilter = location.hash.split('/')[1];
  if (hashFilter !== undefined && /^[0-3]$/.test(hashFilter)) pathFilter = hashFilter;
  else if (hashFilter === undefined) pathFilter = 'all';
  const groups = chapters.map((chapter, index) => ({ chapter, index, items: lessons.filter(l => l.chapter === index) })).filter(g => pathFilter === 'all' || String(g.index) === pathFilter);
  view.innerHTML = `<section class="page path-page"><div class="page-heading"><span class="section-kicker">24 ΜΙΚΡΕΣ ΑΠΟΣΤΟΛΕΣ · A1 → A2</span><h1>Ο χάρτης σου.</h1><p>Μάθε ένα μοτίβο, χρησιμοποίησέ το σε πραγματική φράση και γύρνα ξανά όταν το χρειαστείς.</p></div>
  <div class="filter-row" role="group" aria-label="Φίλτρο ενοτήτων"><button data-filter="all" class="${pathFilter === 'all' ? 'selected' : ''}">Όλα</button>${chapters.map((c,i) => `<button data-filter="${i}" class="${pathFilter === String(i) ? 'selected' : ''}">${escapeHTML(c.title)}</button>`).join('')}</div>
  ${groups.map(({chapter,index,items}) => `<section class="path-group"><div class="path-group-head"><span class="group-icon ${chapter.color}">${chapter.icon}</span><div><span class="eyebrow">ΕΝΟΤΗΤΑ ${String(index + 1).padStart(2,'0')} · ${items[0].level}</span><h2>${escapeHTML(chapter.title)}</h2><p>${escapeHTML(chapter.description)}</p></div><span class="group-count">${items.filter(l => progress.done[l.id]).length}/${items.length}</span></div><div class="lesson-list">${items.map(l => lessonCard(l)).join('')}</div></section>`).join('')}</section>`;
  view.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { pathFilter = button.dataset.filter; location.hash = pathFilter === 'all' ? '#path' : `#path/${pathFilter}`; renderPath(); }));
}

function renderReview() {
  const due = dueEntries();
  const all = Object.entries(progress.mistakes);
  view.innerHTML = `<section class="page review-page"><div class="page-heading"><span class="section-kicker">ΕΠΑΝΑΛΗΨΗ ΧΩΡΙΣ ΠΙΕΣΗ</span><h1>Ό,τι ξαναβλέπεις,<br /><em>γίνεται δικό σου.</em></h1><p>Οι ερωτήσεις που σε δυσκόλεψαν επιστρέφουν εδώ. Λίγες κάθε φορά αρκούν.</p></div>
  <div class="review-hero"><div class="review-hero-icon">↺</div><div><span class="eyebrow">ΓΙΑ ΣΗΜΕΡΑ</span><h2>${due.length ? `${due.length} ${due.length === 1 ? 'ερώτηση σε περιμένει' : 'ερωτήσεις σε περιμένουν'}` : 'Είσαι έτοιμη για το επόμενο βήμα'}</h2><p>${due.length ? 'Κάνε μια σύντομη επανάληψη και συνέχισε τη διαδρομή σου.' : all.length ? 'Οι επόμενες ερωτήσεις θα εμφανιστούν τις επόμενες ημέρες.' : 'Όταν κάποια απάντηση σε δυσκολέψει, θα τη βρεις εδώ για επανάληψη.'}</p></div></div>
  ${due.length ? `<div class="review-list">${due.map(([key,item]) => { const lesson = lessons.find(l => l.id === item.lessonId); const question = lesson?.quiz[item.questionIndex]; return lesson && question ? `<div class="review-item"><div><span class="eyebrow">${lesson.level} · ${escapeHTML(lesson.title)}</span><strong>${escapeHTML(question.prompt)}</strong></div><a href="#lesson/${lesson.id}" class="small-button">Δοκίμασε ξανά ↗</a></div>` : ''; }).join('')}</div>` : `<a class="primary-button" href="#path">Πήγαινε στις αποστολές <span>↗</span></a>`}<button id="resetProgress" class="reset-button">Ξεκίνα τη διαδρομή από την αρχή</button></section>`;
  document.getElementById('resetProgress').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="resetTitle"><span class="section-kicker">ΜΙΑ ΝΕΑ ΑΡΧΗ</span><h2 id="resetTitle">Να ξεκινήσουμε ξανά;</h2><p>Η πρόοδος και η λίστα επανάληψης θα διαγραφούν μόνο από αυτόν τον browser.</p><div class="modal-actions"><button id="cancelReset" class="secondary-button">Άκυρο</button><button id="confirmReset" class="primary-button">Ναι, από την αρχή</button></div></div>';
    document.body.append(overlay);
    overlay.querySelector('#cancelReset').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#confirmReset').addEventListener('click', () => { progress.done = {}; progress.attempts = {}; progress.mistakes = {}; save(); updateChrome(); renderReview(); overlay.remove(); showToast('Η διαδρομή ξεκίνησε από την αρχή.'); });
  });
}

function renderChallenge() {
  if (challenge?.finished) return renderChallengeResult();
  if (challenge) return renderChallengeQuestion();
  view.innerHTML = `<section class="page challenge-page"><div class="page-heading"><span class="section-kicker">ΜΙΑ ΜΙΚΡΗ ΠΡΟΒΑ, ΟΧΙ ΑΓΧΟΣ</span><h1>Τι θυμάσαι<br /><em>χωρίς βοήθεια;</em></h1><p>Δέκα ανακατεμένες ερωτήσεις. Διάλεξε επίπεδο, δες αμέσως το σκεπτικό και ξαναπροσπάθησε όποτε θέλεις.</p></div><div class="challenge-options"><button data-start="A1" class="challenge-option peach"><span class="challenge-option-mark">A1</span><strong>Τα βασικά</strong><small>Γένη, ρήματα, χρόνοι και οι πρώτες πτώσεις.</small><span class="option-arrow">↗</span></button><button data-start="A2" class="challenge-option lavender"><span class="challenge-option-mark">A2</span><strong>Ένα βήμα παραπέρα</strong><small>Πτώσεις, όψη και σύνθετες προτάσεις.</small><span class="option-arrow">↗</span></button></div><p class="challenge-note">Η δοκιμασία χρησιμοποιεί τις πρωτότυπες ερωτήσεις των αποστολών. Οι λανθασμένες απαντήσεις μπαίνουν στην επανάληψη.</p></section>`;
  view.querySelectorAll('[data-start]').forEach(button => button.addEventListener('click', () => startChallenge(button.dataset.start)));
}

function startChallenge(level) {
  const pool = lessons.filter(l => l.level === level).flatMap(l => l.quiz.map((question, index) => ({ lesson: l, question, index })));
  const shuffled = [...pool].sort(() => Math.random() - .5).slice(0, 10);
  challenge = { level, questions: shuffled, index: 0, score: 0, results: [], finished: false };
  renderChallengeQuestion();
}

function renderChallengeQuestion() {
  const item = challenge.questions[challenge.index];
  const { question } = item;
  view.innerHTML = `<section class="page challenge-page"><a href="#challenge" id="exitChallenge" class="back-link">← Πίσω στη δοκιμασία</a><div class="challenge-run"><div class="challenge-status"><span>${challenge.level} · ΕΡΩΤΗΣΗ ${challenge.index + 1} / ${challenge.questions.length}</span><span>${challenge.score} σωστές μέχρι τώρα</span></div><div class="challenge-meter"><span style="width:${challenge.index / challenge.questions.length * 100}%"></span></div><div class="challenge-question"><span class="eyebrow">${escapeHTML(item.lesson.title)}</span><h1 lang="ru">${escapeHTML(question.prompt)}</h1><div class="challenge-choices">${question.choices.map((choice,index) => `<button data-answer="${index}"><span>${'АБВГ'[index]}</span><span lang="ru">${escapeHTML(choice)}</span></button>`).join('')}</div><div id="challengeFeedback" class="challenge-feedback" hidden></div><button id="nextChallenge" class="primary-button" hidden>${challenge.index === challenge.questions.length - 1 ? 'Δες το αποτέλεσμα' : 'Επόμενη ερώτηση'} <span>↗</span></button></div></div></section>`;
  document.getElementById('exitChallenge').addEventListener('click', event => { event.preventDefault(); challenge = null; renderChallenge(); });
  view.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => answerChallenge(Number(button.dataset.answer))));
  document.getElementById('nextChallenge').addEventListener('click', () => { challenge.index++; if (challenge.index >= challenge.questions.length) { challenge.finished = true; renderChallengeResult(); } else renderChallengeQuestion(); });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function answerChallenge(selection) {
  const item = challenge.questions[challenge.index];
  if (challenge.results[challenge.index]) return;
  const correct = selection === item.question.answer;
  if (correct) challenge.score++;
  view.querySelector('.challenge-status span:last-child').textContent = `${challenge.score} σωστές μέχρι τώρα`;
  challenge.results.push({ item, correct });
  const key = `${item.lesson.id}:${item.index}`;
  if (!correct) { progress.mistakes[key] = { lessonId: item.lesson.id, questionIndex: item.index, due: Date.now() + 24 * 60 * 60 * 1000, stage: 0 }; save(); updateChrome(); }
  view.querySelectorAll('[data-answer]').forEach((button,index) => { button.disabled = true; if (index === item.question.answer) button.classList.add('correct'); else if (index === selection) button.classList.add('incorrect'); });
  const feedback = document.getElementById('challengeFeedback');
  feedback.hidden = false; feedback.innerHTML = `<strong>${correct ? 'Σωστά!' : 'Κράτα αυτό το μοτίβο.'}</strong><p>${escapeHTML(item.question.why)}</p>`;
  document.getElementById('nextChallenge').hidden = false;
}

function renderChallengeResult() {
  view.innerHTML = `<section class="page completion-page"><div class="completion-confetti" aria-hidden="true">✦ ✳ ✦</div><span class="completion-icon">${challenge.score}</span><span class="section-kicker">ΜΙΚΡΗ ΔΟΚΙΜΑΣΙΑ ${challenge.level}</span><h1>${challenge.score} στα ${challenge.questions.length}.<br /><em>Τώρα ξέρεις τι να δουλέψεις.</em></h1><p>Οι ερωτήσεις που σε δυσκόλεψαν θα επιστρέψουν στην επανάληψη. Μπορείς να δοκιμάσεις ξανά χωρίς χρονική πίεση.</p><div class="completion-actions"><button id="againChallenge" class="primary-button">Νέα δοκιμασία <span>↗</span></button><a href="#review" class="secondary-button">Πήγαινε στην επανάληψη</a></div></section>`;
  document.getElementById('againChallenge').addEventListener('click', () => { const level = challenge.level; challenge = null; startChallenge(level); });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderLesson(id) {
  const lesson = lessons.find(l => l.id === id);
  if (!lesson) { location.hash = '#path'; return; }
  currentLesson = lesson;
  chosen = {};
  const chapter = chapters[lesson.chapter];
  view.innerHTML = `<section class="page lesson-page"><a class="back-link" href="#path/${lesson.chapter}">← Όλες οι αποστολές</a><div class="lesson-banner ${chapter.color}"><div><span class="banner-label">ΑΠΟΣΤΟΛΗ ${String(lessonNumber(lesson)).padStart(2,'0')} / 24 · ${lesson.level}</span><h1>${escapeHTML(lesson.title)}</h1><p>${escapeHTML(lesson.subtitle)} · περίπου ${lesson.minutes} λεπτά</p></div><div class="banner-symbol" aria-hidden="true">${lesson.symbol}</div></div>
  <div class="lesson-layout"><div class="lesson-main"><section class="story-block"><div class="block-label"><span class="step-badge">01</span> Η ΙΣΤΟΡΙΑ</div><p>${escapeHTML(lesson.story)}</p></section>
  <section class="rule-block"><div class="block-label"><span class="step-badge">02</span> Η ΙΔΕΑ ΜΕ ΑΠΛΑ ΛΟΓΙΑ</div><p>${escapeHTML(lesson.rule)}</p><div class="examples">${lesson.examples.map(([ru,el]) => `<div class="example-row"><div><strong lang="ru">${escapeHTML(ru)}</strong><span>${escapeHTML(el)}</span></div><button class="listen-button" data-say="${escapeHTML(ru)}" aria-label="Άκου τη ρωσική φράση">◖))</button></div>`).join('')}</div></section>
  <section class="quiz-section"><div class="block-label"><span class="step-badge">03</span> ΜΙΚΡΗ ΔΟΚΙΜΗ</div><h2>Διάλεξε, μετά εξήγησε.</h2><p class="section-help">Δεν βιαζόμαστε. Η εξήγηση έχει μεγαλύτερη αξία από το σκορ.</p>${lesson.quiz.map((question,i) => `<div class="question-card" id="question-${i}"><span class="question-number">ΕΡΩΤΗΣΗ ${String(i+1).padStart(2,'0')}</span><h3 lang="ru">${escapeHTML(question.prompt)}</h3><div class="choices">${question.choices.map((choice,ci) => `<button class="choice" data-question="${i}" data-choice="${ci}"><span>${'АБВГ'[ci]}</span><span lang="ru">${escapeHTML(choice)}</span></button>`).join('')}</div><div class="answer-note" hidden></div></div>`).join('')}</section>
  <section class="speaking-section"><div class="block-label"><span class="step-badge">04</span> ΠΕΣ ΤΟ ΔΥΝΑΤΑ</div><div class="speaking-head"><div><h2>Η σειρά σου να μιλήσεις.</h2><p>${escapeHTML(lesson.speak)}</p></div><div class="mic-art" aria-hidden="true">◉</div></div><div class="speaking-actions"><button id="micButton" class="primary-button dark-button">🎙 Μίλα στα ρωσικά</button><button id="chatgptButton" class="secondary-button">✦ Εξάσκηση με ChatGPT Voice</button></div><p class="voice-hint" id="voiceHint">Το μικρόφωνο εμφανίζει όσα αναγνώρισε ο browser, χωρίς βαθμολόγηση. Το ChatGPT ανοίγει σε νέα καρτέλα: επικόλλησε τις οδηγίες που αντιγράφονται και πάτησε Voice.</p><div class="transcript-box"><label for="transcript">Τι είπες; Μπορείς και να γράψεις.</label><textarea id="transcript" rows="3" placeholder="Напиши или скажи здесь…"></textarea></div><button id="finishButton" class="finish-button">Ολοκλήρωσα την αποστολή <span>✓</span></button></section></div>
  <aside class="lesson-aside"><div class="aside-card"><span class="aside-icon">✦</span><h3>Μικρή υπενθύμιση</h3><p>Αν μπερδευτείς, γύρνα στο παράδειγμα και πες τον κανόνα με δικά σου λόγια.</p><div class="aside-divider"></div><span>${escapeHTML(lesson.test)} του βιβλίου</span></div><div class="aside-progress"><span>Η μικρή σου δοκιμή</span><strong id="quizProgress">0 / ${lesson.quiz.length}</strong><div class="mini-progress"><span id="quizProgressBar" style="width:0%"></span></div></div></aside></div></section>`;
  view.querySelectorAll('.choice').forEach(button => button.addEventListener('click', () => answer(Number(button.dataset.question), Number(button.dataset.choice))));
  view.querySelectorAll('[data-say]').forEach(button => button.addEventListener('click', () => say(button.dataset.say)));
  document.getElementById('micButton').addEventListener('click', toggleMic);
  document.getElementById('chatgptButton').addEventListener('click', openChatGPT);
  document.getElementById('finishButton').insertAdjacentHTML('beforebegin', '<label class="practice-check"><input type="checkbox" id="practicedVoice" /> Έκανα τη φωνητική άσκηση στο ChatGPT</label>');
  document.getElementById('finishButton').addEventListener('click', finishLesson);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function answer(index, selection) {
  if (!currentLesson || chosen[index] !== undefined) return;
  const question = currentLesson.quiz[index];
  const correct = selection === question.answer;
  chosen[index] = selection;
  progress.attempts[currentLesson.id] = (progress.attempts[currentLesson.id] || 0) + 1;
  const key = `${currentLesson.id}:${index}`;
  if (!correct) progress.mistakes[key] = { lessonId: currentLesson.id, questionIndex: index, due: Date.now() + 24 * 60 * 60 * 1000, stage: 0 };
  else if (progress.mistakes[key]) {
    const stage = Math.min((progress.mistakes[key].stage || 0) + 1, 2);
    if (stage === 2) delete progress.mistakes[key];
    else progress.mistakes[key] = { lessonId: currentLesson.id, questionIndex: index, due: Date.now() + 3 * 24 * 60 * 60 * 1000, stage };
  }
  save(); updateChrome();
  const card = document.getElementById(`question-${index}`);
  card.querySelectorAll('.choice').forEach((button, ci) => { button.disabled = true; if (ci === question.answer) button.classList.add('correct'); else if (ci === selection) button.classList.add('incorrect'); });
  const note = card.querySelector('.answer-note');
  note.hidden = false;
  note.innerHTML = `<strong>${correct ? 'Μπράβο, σωστά!' : 'Σχεδόν! Δες το μοτίβο.'}</strong><span>${escapeHTML(question.why)}</span>`;
  document.getElementById('quizProgress').textContent = `${Object.keys(chosen).length} / ${currentLesson.quiz.length}`;
  document.getElementById('quizProgressBar').style.width = `${Object.keys(chosen).length / currentLesson.quiz.length * 100}%`;
}

function say(text) {
  if (!('speechSynthesis' in window)) { showToast('Η αναπαραγωγή ομιλίας δεν υποστηρίζεται σε αυτόν τον browser.'); return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU'; utterance.rate = 0.82;
  speechSynthesis.speak(utterance);
}

function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('Ο browser δεν υποστηρίζει αναγνώριση ομιλίας. Γράψε την απάντησή σου ή χρησιμοποίησε το ChatGPT Voice.'); document.getElementById('transcript').focus(); return; }
  const button = document.getElementById('micButton');
  const hint = document.getElementById('voiceHint');
  if (speaking && recognition) { recognition.stop(); return; }
  recognition = new SR();
  recognition.lang = 'ru-RU'; recognition.interimResults = false; recognition.continuous = false;
  recognition.onstart = () => { speaking = true; button.textContent = '■ Σταμάτα την ηχογράφηση'; button.classList.add('recording'); hint.textContent = 'Μιλάς τώρα… Πες μια μικρή ρωσική πρόταση.'; };
  recognition.onresult = event => { document.getElementById('transcript').value = event.results[0][0].transcript; hint.textContent = 'Άκουσες τι αναγνώρισε ο browser; Διόρθωσε το κείμενο αν χρειάζεται.'; };
  recognition.onerror = event => { if (event.error !== 'no-speech') showToast(event.error === 'not-allowed' ? 'Επίτρεψε τη χρήση μικροφώνου στον browser.' : 'Δεν μπόρεσα να αναγνωρίσω την ομιλία. Δοκίμασε ξανά ή γράψε.'); };
  recognition.onend = () => { speaking = false; button.textContent = '🎙 Μίλα στα ρωσικά'; button.classList.remove('recording'); };
  try { recognition.start(); } catch { showToast('Το μικρόφωνο δεν ξεκίνησε. Δοκίμασε ξανά.'); }
}

function tutorPrompt(lesson) {
  return `Είσαι υπομονετικός, ζωντανός καθηγητής ρωσικών για Ελληνίδα ενήλικη μαθήτρια με ΔΕΠΥ. Κάνε μια σύντομη, διαδραστική φωνητική εξάσκηση 5-7 λεπτών. Εξήγησε στα ελληνικά, αλλά ζήτησέ μου να μιλώ στα ρωσικά. Μία ερώτηση κάθε φορά, χωρίς μεγάλους μονολόγους. Δώσε ήπια, συγκεκριμένη διόρθωση και ζήτησε να επαναλάβω φυσικά τη σωστή φράση. Θέμα: ${lesson.title} (${lesson.level}). Κανόνας: ${lesson.rule} Σκηνή: ${lesson.story} Στόχος ομιλίας: ${lesson.speak} Ξεκίνα αμέσως με μία απλή ερώτηση στα ρωσικά και, αν κολλήσω, δώσε μικρή βοήθεια στα ελληνικά.`;
}

function openChatGPT() {
  if (!currentLesson) return;
  const prompt = tutorPrompt(currentLesson);
  const oldPanel = document.getElementById('chatgptPanel');
  if (oldPanel) { oldPanel.scrollIntoView({ behavior: 'smooth' }); return; }
  const panel = document.createElement('div');
  panel.id = 'chatgptPanel'; panel.className = 'chatgpt-panel';
  panel.innerHTML = `<strong>Έτοιμη για συνομιλία;</strong><p>1. Αντίγραψε τις οδηγίες. 2. Άνοιξε το ChatGPT, επικόλλησέ τες στη συνομιλία και πάτησε το εικονίδιο Voice.</p><textarea id="voicePrompt" readonly aria-label="Οδηγίες για το ChatGPT Voice"></textarea><div class="chatgpt-panel-actions"><button id="copyVoicePrompt" class="secondary-button">Αντιγραφή οδηγιών</button><a class="primary-button" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Άνοιξε το ChatGPT <span>↗</span></a></div>`;
  panel.querySelector('textarea').value = prompt;
  document.querySelector('.speaking-actions').after(panel);
  panel.querySelector('#copyVoicePrompt').addEventListener('click', async () => {
    let copied = false;
    try { await navigator.clipboard.writeText(prompt); copied = true; } catch { /* manual copy fallback */ }
    if (!copied) { const field = panel.querySelector('textarea'); field.select(); try { copied = document.execCommand('copy'); } catch { /* manual selection remains */ } }
    showToast(copied ? 'Οι οδηγίες αντιγράφηκαν. Επικόλλησέ τες στο ChatGPT και πάτησε Voice.' : 'Επίλεξε και αντέγραψε τις οδηγίες από το πεδίο.');
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function finishLesson() {
  if (!currentLesson) return;
  if (Object.keys(chosen).length < currentLesson.quiz.length) { showToast('Απάντησε πρώτα στις μικρές ερωτήσεις της αποστολής.'); document.querySelector('.quiz-section').scrollIntoView({ behavior: 'smooth' }); return; }
  if (!document.getElementById('transcript').value.trim() && !document.getElementById('practicedVoice').checked) { showToast('Πες ή γράψε μία δική σου ρωσική φράση, ή σημείωσε ότι εξασκήθηκες στο ChatGPT.'); document.querySelector('.speaking-section').scrollIntoView({ behavior: 'smooth' }); return; }
  const id = currentLesson.id;
  progress.done[id] = Date.now(); save(); updateChrome();
  const next = lessons[lessonNumber(currentLesson)];
  view.innerHTML = `<section class="page completion-page"><div class="completion-confetti" aria-hidden="true">✦ ✳ ✦</div><span class="completion-icon">✓</span><span class="section-kicker">ΑΠΟΣΤΟΛΗ ΟΛΟΚΛΗΡΩΘΗΚΕ</span><h1>Μπράβο σου.<br /><em>Ένα βήμα πιο κοντά.</em></h1><p>Έμαθες το μοτίβο «${escapeHTML(currentLesson.title)}». Η πρόοδός σου αποθηκεύτηκε σε αυτόν τον browser.</p><div class="completion-actions">${next ? `<a href="#lesson/${next.id}" class="primary-button">Επόμενη αποστολή <span>↗</span></a>` : ''}<a href="#path" class="secondary-button">Δες τον χάρτη</a></div></section>`;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function route() {
  if (recognition && speaking) recognition.stop();
  updateChrome();
  const parts = location.hash.replace(/^#/, '').split('/');
  if (parts[0] === 'lesson') renderLesson(parts[1]);
  else if (parts[0] === 'path') renderPath();
  else if (parts[0] === 'challenge') renderChallenge();
  else if (parts[0] === 'review') renderReview();
  else renderHome();
}

window.addEventListener('hashchange', route);
route();

