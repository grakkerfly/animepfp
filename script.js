'use strict';

// EDIT YOUR COMMUNITY LINKS, CONTRACT, AND WORKER HERE.
const SITE_CONFIG = {
  twitterUrl: '', // Example: https://x.com/your_account
  pumpFunUrl: '', // Paste your coin's full pump.fun URL.
  contractAddress: '', // Paste the complete Solana contract address.
  workerUrl: 'https://anime-pfp-api.grakkerfly.workers.dev',
};

// EDIT TRACK TITLES HERE. Each title appears in the music player.
// Keep the audio files inside the assets folder: 1.mp3 through 6.mp3.
const PLAYLIST = [{
    file: 'assets/1.mp3',
    name: 'Track 01'
  }, // 1.mp3 - your song title
  {
    file: 'assets/2.mp3',
    name: 'Track 02'
  }, // 2.mp3 - your song title
  {
    file: 'assets/3.mp3',
    name: 'Track 03'
  }, // 3.mp3 - your song title
  {
    file: 'assets/4.mp3',
    name: 'Track 04'
  }, // 4.mp3 - your song title
  {
    file: 'assets/5.mp3',
    name: 'Track 05'
  }, // 5.mp3 - your song title
  {
    file: 'assets/6.mp3',
    name: 'Track 06'
  }, // 6.mp3 - your song title
];

// The transformation prompt and model settings stay in your Cloudflare Worker.
// Never put Higgsfield credentials in this file.
const $ = id => document.getElementById(id);
let toastTimer;

function notify(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $('toast').hidden = true;
  }, 4500);
}

function configureCommunityLinks() {
  for (const [id, value] of [
      ['twitter-link', SITE_CONFIG.twitterUrl],
      ['pump-link', SITE_CONFIG.pumpFunUrl]
    ]) {
    const link = $(id);
    let validUrl;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:') validUrl = url.href;
    } catch {
      /* An empty link is allowed before launch. */ }
    if (validUrl) {
      link.href = validUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      link.addEventListener('click', event => {
        event.preventDefault();
        notify('Community link coming soon.');
      });
    }
  }
}
configureCommunityLinks();
$('copy-contract').addEventListener('click', async () => {
  const contract = SITE_CONFIG.contractAddress.trim();
  if (!contract) return notify('Contract address coming soon.');
  try {
    await navigator.clipboard.writeText(contract);
    notify('Contract address copied!');
  } catch {
    // Provide a selectable fallback when browser clipboard access is blocked.
    window.prompt('Copy the contract address:', contract);
  }
});

// Desktop controls.
function updateClock() {
  $('clock').textContent = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
updateClock();
setInterval(updateClock, 30000);
$('year').textContent = new Date().getFullYear();

function closeStartMenu() {
  $('start-menu').hidden = true;
  $('start').setAttribute('aria-expanded', 'false');
}
$('start').addEventListener('click', () => {
  $('start-menu').hidden = !$('start-menu').hidden;
  $('start').setAttribute('aria-expanded', String(!$('start-menu').hidden));
});
document.addEventListener('click', event => {
  if (!$('start-menu').contains(event.target) && !$('start').contains(event.target))
    closeStartMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('start-menu').hidden) {
    closeStartMenu();
    $('start').focus();
  }
});
document.querySelectorAll('a[href="#generator"], #start-menu a').forEach(link => link
  .addEventListener('click', () => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target === $('generator')) expandPanel('generator-content');
    closeStartMenu();
  }));

function expandPanel(id) {
  $(id).hidden = false;
  const button = document.querySelector(`[data-collapse="${id}"]`);
  if (button) {
    button.setAttribute('aria-expanded', 'true');
    button.textContent = '_';
  }
}
document.querySelectorAll('[data-collapse]').forEach(button => {
  button.addEventListener('click', () => {
    const panel = $(button.dataset.collapse);
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
    button.setAttribute('aria-label', `${panel.hidden ? 'Restore' : 'Minimize'} generator`);
    button.textContent = panel.hidden ? '□' : '_';
  });
});
$('open-player').addEventListener('click', () => {
  restorePlayer();
  $('play').focus({
    preventScroll: true
  });
  closeStartMenu();
});

// Music starts on the first real visitor interaction, then respects manual pause.
const audio = $('audio');
let trackIndex = 0;
let audioRevision = 0;
let firstInteractionHandled = false;

function timeLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function renderAudioTime() {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  $('track-time').textContent = `${timeLabel(audio.currentTime)} / ${timeLabel(duration)}`;
  $('seek').disabled = !duration;
  $('seek').value = duration ? (audio.currentTime / duration) * 100 : 0;
}

function renderAudioState(state) {
  $('music-state').textContent = state;
  const playing = state === 'PLAYING';
  document.querySelector('.music-window').classList.toggle('is-playing', playing);
  $('play').textContent = playing ? 'Ⅱ' : '▶';
  $('play').setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
}

function loadTrack(index) {
  audioRevision++;
  audio.pause();
  trackIndex = (index + PLAYLIST.length) % PLAYLIST.length;
  audio.src = PLAYLIST[trackIndex].file;
  $('track-name').textContent = PLAYLIST[trackIndex].name;
  $('track-name').title = PLAYLIST[trackIndex].name;
  $('track-number').textContent =
    `${String(trackIndex + 1).padStart(2, '0')} / ${String(PLAYLIST.length).padStart(2, '0')}`;
  $('track-time').textContent = '00:00 / 00:00';
  $('seek').value = 0;
  $('seek').disabled = true;
  $('music-hint').textContent = firstInteractionHandled ? 'Press play. Enter your character arc.' :
    'Music starts with your first interaction.';
  renderAudioState('STOPPED');
}
async function playTrack() {
  const revision = audioRevision;
  $('music-hint').textContent = 'Loading the soundtrack…';
  renderAudioState('LOADING');
  try {
    await audio.play();
    if (revision !== audioRevision) return;
    $('music-hint').textContent = 'Soundtrack for your next questionable take.';
  } catch (error) {
    if (revision !== audioRevision || error.name === 'AbortError') return;
    if (error.name === 'NotAllowedError') firstInteractionHandled = false;
    renderAudioState('UNAVAILABLE');
    $('music-hint').textContent = error.name === 'NotAllowedError' ?
      'Click Play to allow music playback.' : 'This track is unavailable. Try the next one.';
  }
}
$('play').addEventListener('click', () => {
  firstInteractionHandled = true;
  if (!audio.paused) {
    audio.pause();
  } else {
    void playTrack();
  }
});
$('previous').addEventListener('click', () => {
  const resume = !audio.paused || !firstInteractionHandled;
  firstInteractionHandled = true;
  loadTrack(trackIndex - 1);
  if (resume) void playTrack();
});
$('next').addEventListener('click', () => {
  const resume = !audio.paused || !firstInteractionHandled;
  firstInteractionHandled = true;
  loadTrack(trackIndex + 1);
  if (resume) void playTrack();
});
$('stop').addEventListener('click', () => {
  firstInteractionHandled = true;
  audioRevision++;
  audio.pause();
  audio.currentTime = 0;
  renderAudioState('STOPPED');
  renderAudioTime();
  $('music-hint').textContent = firstInteractionHandled ?
    'Press play. Enter your character arc.' : 'Music starts with your first interaction.';
});
audio.addEventListener('playing', () => renderAudioState('PLAYING'));
audio.addEventListener('pause', () => renderAudioState('PAUSED'));
audio.addEventListener('waiting', () => {
  if (!audio.paused) renderAudioState('BUFFERING');
});
audio.addEventListener('ended', () => {
  loadTrack(trackIndex + 1);
  void playTrack();
});
audio.addEventListener('error', () => {
  renderAudioState('UNAVAILABLE');
  $('music-hint').textContent = 'This track is unavailable. Try the next one.';
});
audio.addEventListener('timeupdate', renderAudioTime);
audio.addEventListener('loadedmetadata', renderAudioTime);
$('seek').addEventListener('input', () => {
  if (Number.isFinite(audio.duration)) audio.currentTime = Number($('seek').value) / 100 * audio
    .duration;
});
$('volume').addEventListener('input', () => {
  audio.volume = Number($('volume').value);
  $('volume-value').textContent = `${Math.round(audio.volume * 100)}%`;
});
audio.volume = 0.5;
loadTrack(0);

function startMusicOnInteraction(event) {
  if (firstInteractionHandled || !event.isTrusted) return;
  // Transport buttons handle their own gesture, avoiding an immediate play/pause race.
  if (event.target.closest?.('#play, #previous, #next, #stop')) return;
  if (event.type === 'keydown' && (event.ctrlKey || event.metaKey || event.altKey || ['Shift',
      'Control', 'Alt', 'Meta', 'Escape'
    ].includes(event.key))) return;
  firstInteractionHandled = true;
  void playTrack();
}
for (const eventType of ['pointerdown', 'click', 'touchend', 'keydown']) {
  document.addEventListener(eventType, startMusicOnInteraction, {
    capture: true
  });
}

// Generator: reserve a slot, submit, then poll.
let selectedFile;
let previewURL;
let resultURL;
let submissionId;
let savedJob;
try {
  const stored = JSON.parse(sessionStorage.getItem('animePfpPendingJob') || 'null');
  if (stored && /^[0-9a-f-]{36}$/i.test(stored.job_id)) savedJob = {
    job_id: stored.job_id,
    status: 'in_progress'
  };
} catch {
  /* Recovery is optional when session storage is blocked. */ }

function savePendingJob(job) {
  savedJob = job;
  try {
    if (job) sessionStorage.setItem('animePfpPendingJob', JSON.stringify({
      job_id: job.job_id
    }));
    else sessionStorage.removeItem('animePfpPendingJob');
  } catch {
    /* Keep the in-memory job if session storage is blocked. */ }
}
if (savedJob) {
  $('generate').textContent = 'CONTINUE GENERATION';
  say('A previous generation is pending. Click Continue generation to check it.');
}
let busy = false;
let elapsedTimer;
const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

function say(message, state = 'ready') {
  $('status').textContent = message;
  $('status-light').className = `status-light ${state === 'ready' ? '' : state}`;
}

function resetResult() {
  resultURL = undefined;
  $('result').hidden = true;
  $('result').removeAttribute('src');
  $('output-empty').hidden = false;
  $('result-actions').hidden = true;
  $('open').removeAttribute('href');
  $('result-badge').textContent = 'WAITING';
}

function selectImage(file) {
  if (busy || !file) return;
  if (savedJob) return say(
    'A generation is still pending. Click Continue generation before uploading another photo.',
    'error');
  if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) {
    $('image').value = '';
    return say('Choose a JPG, PNG, or WebP image up to 5 MB.', 'error');
  }
  selectedFile = file;
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = URL.createObjectURL(file);
  $('preview').src = previewURL;
  $('preview').hidden = false;
  $('upload-empty').hidden = true;
  $('replace-hint').hidden = false;
  $('file-badge').textContent = 'LOADED';
  savedJob = undefined;
  submissionId = crypto.randomUUID();
  resetResult();
  $('generate').innerHTML = '<span aria-hidden="true">✦</span> GENERATE ANIME PFP';
  say('Photo loaded. Your anime pfp is one click away.');
}
$('image').addEventListener('change', () => selectImage($('image').files[0]));
$('preview').addEventListener('error', () => {
  selectedFile = undefined;
  $('image').value = '';
  $('preview').hidden = true;
  $('upload-empty').hidden = false;
  $('replace-hint').hidden = true;
  $('file-badge').textContent = 'NO FILE';
  say('This image could not be opened. Try a different file.', 'error');
});
for (const eventName of ['dragenter', 'dragover']) $('drop-zone').addEventListener(eventName,
  event => {
    event.preventDefault();
    if (!busy) $('drop-zone').classList.add('dragging');
  });
for (const eventName of ['dragleave', 'drop']) $('drop-zone').addEventListener(eventName, event => {
  event.preventDefault();
  $('drop-zone').classList.remove('dragging');
});
$('drop-zone').addEventListener('drop', event => selectImage(event.dataTransfer.files[0]));
// Prevent dropped files outside the upload area from navigating away.
document.addEventListener('dragover', event => {
  if (event.dataTransfer.types.includes('Files')) event.preventDefault();
});
document.addEventListener('drop', event => {
  if (event.dataTransfer.types.includes('Files')) event.preventDefault();
});

class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
const API_MESSAGES = {
  IP_LIMIT: 'You have used your free generation. Come back 24 hours after your last request.',
  DAILY_LIMIT: 'All 100 free generations have been claimed today. Come back after midnight, Brasilia time.',
  NOT_CONFIGURED: 'The generator is not configured yet. Please try again later.',
  ORIGIN_BLOCKED: 'This website is not authorized to use the generator.',
  IMAGE_TOO_LARGE: 'Choose an image up to 5 MB.',
  INVALID_IMAGE: 'Choose a JPG, PNG, or WebP image up to 5 MB.',
  INVALID_UPLOAD: 'This upload could not be read. Try another image.',
  INVALID_JOB: 'Invalid generation identifier. Reload and try again.',
  IP_UNAVAILABLE: 'Your connection could not be verified. Try again.',
  JOB_NOT_FOUND: 'This generation could not be found for your connection. You can try again.',
  UPLOAD_FAILED: 'The upload failed before generation started. Your free slot was restored. Please try again.',
  PROVIDER_ERROR: 'The image service is unavailable. Please try again later.',
  PROVIDER_RESPONSE: 'The image service returned an unexpected response. Try again later.',
  TEMPORARILY_UNAVAILABLE: 'The generator is temporarily unavailable. Retry to check the same request.',
};
async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(SITE_CONFIG.workerUrl.replace(/\/$/, '') + path, {
      ...options,
      signal: controller.signal
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new ApiError(
        'The server returned an unexpected response. Retry to check the same request.',
        'CONNECTION');
    }
    if (!response.ok) throw new ApiError(API_MESSAGES[data.code] ||
      'The generator could not process this request. Please try again later.', data.code);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError(
      'The connection timed out. Click Continue generation to check the same request.',
      'CONNECTION');
    if (error instanceof TypeError) throw new ApiError(
      'Could not reach the generator. Check your connection and retry.', 'CONNECTION');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function setBusy(value) {
  busy = value;
  $('generate').disabled = value;
  $('image').disabled = value;
  $('loading-overlay').hidden = !value;
  $('generator').setAttribute('aria-busy', String(value));
  if (value) {
    $('output-empty').hidden = true;
    $('result-badge').textContent = 'WORKING';
    const started = Date.now();
    $('elapsed').textContent = '00:00';
    elapsedTimer = setInterval(() => {
      $('elapsed').textContent = timeLabel((Date.now() - started) / 1000);
    }, 1000);
  } else {
    clearInterval(elapsedTimer);
    $('output-empty').hidden = Boolean(resultURL);
    $('result-badge').textContent = resultURL ? 'COMPLETE' : savedJob ? 'PENDING' : 'WAITING';
    $('generate').textContent = savedJob ? 'CONTINUE GENERATION' : 'GENERATE ANIME PFP';
  }
}
$('generator').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  if (!selectedFile && !savedJob) return say(
    'Upload a photo first. JPG, PNG, or WebP, up to 5 MB.', 'error');
  setBusy(true);
  try {
    let job;
    if (!savedJob) {
      say('Uploading your photo…', 'busy');
      $('loading-label').textContent = 'Uploading your photo…';
      const form = new FormData();
      form.append('image', selectedFile);
      form.append('submission_id', submissionId ||= crypto.randomUUID());
      // Save BEFORE submission, so refreshes or lost responses cannot create a second job.
      savePendingJob({
        job_id: submissionId,
        status: 'in_progress'
      });
      job = await api('/generate', {
        method: 'POST',
        body: form
      });
      savePendingJob(job);
    } else {
      job = await api('/status?job_id=' + encodeURIComponent(savedJob.job_id));
    }
    const start = Date.now();
    while (['queued', 'in_progress'].includes(job.status)) {
      if (Date.now() - start > 10 * 60 * 1000) throw new Error(
        'Still processing. Click Continue generation to check this request without submitting another.'
        );
      const queued = job.status === 'queued';
      say(queued ? 'In the queue. Your character arc is loading…' :
        'Turning your photo into an anime PFP…', 'busy');
      $('loading-label').textContent = queued ? 'Waiting for your turn…' :
        'Entering the anime universe…';
      await new Promise(resolve => setTimeout(resolve, 4000));
      job = await api('/status?job_id=' + encodeURIComponent(savedJob.job_id));
    }
    if (job.status !== 'completed') {
      savePendingJob(undefined);
      submissionId = crypto.randomUUID();
      throw new Error(job.error_code === 'SUBMISSION_UNCERTAIN' ?
        'This request may have reached the image service, but its result could not be confirmed. Your daily slot is reserved. Please contact the site owner.' :
        job.error_code === 'UPLOAD_FAILED' ?
        'The upload did not finish. Your free slot was restored. Please try again.' :
        'The generation failed, was canceled, or was blocked. Requests sent to the image service still count toward the daily limits.'
        );
    }
    let imageURL;
    try {
      imageURL = new URL(job.images?.[0]?.url);
    } catch {
      throw new Error(
        'The service finished without a valid image link. Retry to check the result.');
    }
    if (imageURL.protocol !== 'https:') throw new Error(
      'The service returned an invalid image link.');
    resultURL = imageURL.href;
    $('result').src = resultURL;
    $('result').hidden = false;
    $('open').href = resultURL;
    $('result-actions').hidden = false;
    savePendingJob(undefined);
    submissionId = crypto.randomUUID();
    say('Character arc complete. Your anime PFP is ready.', 'success');
  } catch (error) {
    if (error instanceof ApiError && error.code && !['CONNECTION', 'TEMPORARILY_UNAVAILABLE',
        'PROVIDER_ERROR', 'PROVIDER_RESPONSE'
      ].includes(error.code)) {
      savePendingJob(undefined);
      // JOB_NOT_FOUND can follow a lost submission response; reuse the original ID.
      if (error.code !== 'JOB_NOT_FOUND') submissionId = crypto.randomUUID();
    }
    say(error.message || 'Something went wrong. Retry to check the same request.', 'error');
  } finally {
    setBusy(false);
  }
});
$('result').addEventListener('error', () => {
  if (!resultURL) return;
  say('Your PFP was generated, but the preview could not load. Use Open image to view it.',
    'error');
});
$('download').addEventListener('click', async () => {
  if (!resultURL || $('download').disabled) return;
  $('download').disabled = true;
  try {
    const response = await fetch(resultURL);
    if (!response.ok) throw new Error('Download failed.');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      `anime-pfp.${blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    notify('Your new PFP is ready to save.');
  } catch {
    say('Direct download is unavailable. Click Open image, then save it from there.',
    'error');
  } finally {
    $('download').disabled = false;
  }
});


// Floating radio: pointer capture supports mouse, pen, and touch.
const player = $('music-player');
const dragHandle = $('player-drag-handle');
let playerDrag = null;
const PLAYER_MARGIN = 8;
const TASKBAR_CLEARANCE = 49;

function movePlayer(left, top) {
  const rect = player.getBoundingClientRect();
  const maxLeft = Math.max(PLAYER_MARGIN, window.innerWidth - rect.width - PLAYER_MARGIN);
  const maxTop = Math.max(PLAYER_MARGIN, window.innerHeight - rect.height - TASKBAR_CLEARANCE);
  player.style.left = `${Math.min(maxLeft, Math.max(PLAYER_MARGIN, left))}px`;
  player.style.top = `${Math.min(maxTop, Math.max(PLAYER_MARGIN, top))}px`;
  player.style.right = 'auto';
  player.style.bottom = 'auto';
}

function keepPlayerOnScreen() {
  const rect = player.getBoundingClientRect();
  movePlayer(rect.left, rect.top);
}

function restorePlayer() {
  $('player-body').hidden = false;
  $('minimize-player').textContent = '_';
  $('minimize-player').setAttribute('aria-expanded', 'true');
  $('minimize-player').setAttribute('aria-label', 'Minimize music player');
  $('toggle-player').setAttribute('aria-expanded', 'true');
  keepPlayerOnScreen();
}

function togglePlayer() {
  if ($('player-body').hidden) return restorePlayer();
  $('player-body').hidden = true;
  $('minimize-player').textContent = '□';
  $('minimize-player').setAttribute('aria-expanded', 'false');
  $('minimize-player').setAttribute('aria-label', 'Restore music player');
  $('toggle-player').setAttribute('aria-expanded', 'false');
  keepPlayerOnScreen();
}

$('minimize-player').addEventListener('click', togglePlayer);
$('toggle-player').addEventListener('click', togglePlayer);

dragHandle.addEventListener('pointerdown', event => {
  if (event.button !== 0 || event.target.closest('button')) return;
  const rect = player.getBoundingClientRect();
  playerDrag = {
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  dragHandle.setPointerCapture(event.pointerId);
  player.classList.add('is-dragging');
  event.preventDefault();
});

dragHandle.addEventListener('pointermove', event => {
  if (!playerDrag || event.pointerId !== playerDrag.pointerId) return;
  movePlayer(event.clientX - playerDrag.offsetX, event.clientY - playerDrag.offsetY);
});

function finishPlayerDrag(event) {
  if (!playerDrag || event.pointerId !== playerDrag.pointerId) return;
  playerDrag = null;
  player.classList.remove('is-dragging');
  if (dragHandle.hasPointerCapture(event.pointerId)) dragHandle.releasePointerCapture(event
    .pointerId);
}

for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  dragHandle.addEventListener(type, finishPlayerDrag);
}

dragHandle.addEventListener('keydown', event => {
  if (event.target !== dragHandle) return;
  const directions = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  };
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  const rect = player.getBoundingClientRect();
  const step = event.shiftKey ? 40 : 10;
  movePlayer(rect.left + direction[0] * step, rect.top + direction[1] * step);
});

window.addEventListener('resize', keepPlayerOnScreen);
requestAnimationFrame(keepPlayerOnScreen);
