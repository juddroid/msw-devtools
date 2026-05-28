import { http, HttpResponse } from 'msw';
export const handlers = [
  http.get('/api/posts', () => HttpResponse.json([{ id: 1, title: 'Mocked post' }])),
];
