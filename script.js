const WORKER_URL = 'https://anime-pfp-api.grakkerfly.workers.dev';
const $ = id => document.getElementById(id);
let previewURL, resultURL, submissionId, savedJob;
const say = text => { $('status').textContent = text; };
async function api(path, password, options = {}) {
  const response = await fetch(WORKER_URL + path, { ...options, headers: { ...options.headers, 'X-Test-Password': password } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
$('image').addEventListener('change', () => {
  const file = $('image').files[0];
  if (previewURL) URL.revokeObjectURL(previewURL);
  submissionId = crypto.randomUUID(); savedJob = undefined;
  $('after').hidden = true;
  $('before').hidden = !file;
  if (file) $('preview').src = previewURL = URL.createObjectURL(file);
});
$('generator').addEventListener('submit', async event => {
  event.preventDefault();
  const file = $('image').files[0], password = $('password').value;
  if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5*1024*1024) return say('Envie JPG, PNG ou WebP de até 5 MB.');
  $('generate').disabled = true; $('image').disabled = true;
  try {
    if (!savedJob) {
      say('Enviando tua imagem…');
      const form = new FormData(); form.append('image', file); form.append('submission_id', submissionId ||= crypto.randomUUID());
      savedJob = await api('/generate', password, { method: 'POST', body: form });
    }
    const start = Date.now();
    let job = savedJob;
    while (['queued','in_progress'].includes(job.status)) {
      if (Date.now()-start > 10*60*1000) throw new Error('Ainda não terminou. Clica em continuar pra consultar a mesma geração, sem enviar outra.');
      say(job.status === 'queued' ? 'Na fila da Higgsfield…' : 'Transformando em anime…');
      await new Promise(resolve => setTimeout(resolve, 4000));
      if (!savedJob.status_url) throw new Error('A API não retornou status_url. Confira teu histórico da Higgsfield.');
      job = await api('/status?url=' + encodeURIComponent(savedJob.status_url), password);
    }
    if (job.status !== 'completed') {
      savedJob = undefined; submissionId = crypto.randomUUID();
      throw new Error(job.error || `Geração encerrada: ${job.status || 'resposta inesperada'}.`);
    }
    const imageURL = new URL(job.images?.[0]?.url);
    if (imageURL.protocol !== 'https:') throw new Error('A API retornou uma URL de imagem inválida.');
    resultURL = imageURL.href; $('result').src = resultURL; $('open').href = resultURL; $('after').hidden = false;
    say('Pronto! Tua anime PFP foi gerada.');
    savedJob = undefined; submissionId = crypto.randomUUID();
  } catch (error) { say(error.message || 'Erro de conexão. Confira o histórico da Higgsfield antes de enviar novamente.'); }
  finally { $('generate').disabled = false; $('image').disabled = false; $('generate').textContent = savedJob ? 'Continuar geração' : 'Gerar anime PFP'; }
});
$('download').addEventListener('click', async () => {
  if (!resultURL) return;
  try {
    const response = await fetch(resultURL);
    if (!response.ok) throw new Error();
    const blob = await response.blob();
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'anime-pfp.' + (blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg');
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch { say('O CDN bloqueou o download direto. Usa “Abrir imagem” e salva por lá.'); }
});
