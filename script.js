const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav');
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  nav.classList.toggle('open', open);
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
  nav.classList.remove('open');
}));

const backToTop = document.querySelector('.back-to-top');
const hero = document.querySelector('.hero');
const updateBackToTop = () => {
  backToTop.classList.toggle('is-visible', hero.getBoundingClientRect().bottom <= 120);
};
window.addEventListener('scroll', updateBackToTop, { passive: true });
window.addEventListener('resize', updateBackToTop);
updateBackToTop();

const form = document.querySelector('#inquiry-form');
const status = document.querySelector('#form-status');
const submitButton = form.querySelector('button[type="submit"]');
const apiBase = import.meta.env.VITE_SUPABASE_URL;
const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Keep offering links in the same page and preselect the relevant inquiry topic.
document.querySelectorAll('a[data-service]').forEach(link => link.addEventListener('click', () => {
  const checkbox = form.querySelector(`input[name="services"][value="${link.dataset.service}"]`);
  if (checkbox) checkbox.checked = true;
}));

form.addEventListener('submit', async event => {
  event.preventDefault();
  status.className = 'form-status';
  status.textContent = '';
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const services = data.getAll('services');
  const profile = String(data.get('profile_url') || '').trim();
  const payload = {
    name: String(data.get('name') || '').trim(),
    email: String(data.get('email') || '').trim(),
    organization: String(data.get('organization') || '').trim(),
    audience: String(data.get('audience') || ''),
    service: services[0] || 'general',
    services,
    timing: data.get('timing') || null,
    profile_url: profile || null,
    message: String(data.get('message') || '').trim()
  };
  if (!payload.name || !payload.email || !payload.audience) {
    status.classList.add('error');
    status.textContent = 'Please complete the required fields.';
    return;
  }
  submitButton.disabled = true;
  status.textContent = 'Sending your inquiry…';
  try {
    const headers = { apikey: apiKey, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    const response = await fetch(`${apiBase}/functions/v1/submit-inquiry`, {
      method: 'POST', headers, body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed (${response.status})`);
    }
    const result = await response.json();
    form.reset();
    status.classList.add('success');
    if (result.notification_failed) {
      status.textContent = 'Thank you. Your inquiry was saved, but the email notification could not be sent — we will still see your submission.';
    } else {
      status.textContent = 'Thank you. Your inquiry was received.';
    }
  } catch (error) {
    status.classList.add('error');
    status.textContent = 'We could not send your inquiry. Please try again in a moment.';
  } finally {
    submitButton.disabled = false;
  }
});
