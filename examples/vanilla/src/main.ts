import { createMswDevtools } from '@juddroid/msw-devtools-core';
import { handlers } from './handlers';

const devtools = createMswDevtools({
  handlers,
  groupBy: (p) => (p.startsWith('/users') ? 'Users' : 'Other'),
});
void devtools.mount();

document.getElementById('fetch')?.addEventListener('click', async () => {
  const res = await fetch('/users');
  const json = await res.json();
  const out = document.getElementById('out');
  if (out) out.textContent = JSON.stringify(json, null, 2);
});
