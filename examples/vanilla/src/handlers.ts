import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/users', () => HttpResponse.json([{ id: 1, name: 'Alice' }])),
  http.post('/users', () => HttpResponse.json({ ok: true }, { status: 201 })),
  http.get('/users/:id', ({ params }) => HttpResponse.json({ id: params.id, name: 'Mocked' })),
];
