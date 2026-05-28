import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => HttpResponse.json([{ id: 1, name: 'Alice' }])),
  http.get('/api/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Mocked user' })),
  http.post('/api/users', () => HttpResponse.json({ ok: true })),
];
