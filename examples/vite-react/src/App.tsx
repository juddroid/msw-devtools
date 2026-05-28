import { MswDevtools } from '@juddroid_raccoon/msw-devtools-react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AxiosBridge } from './axios-bridge';
import { handlers } from './handlers';

const client = new QueryClient();

function UsersPanel() {
  const { data, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await axios.get('/api/users')).data,
    retry: false,
  });
  if (isError) return <pre>error: {String((error as Error).message)}</pre>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

function Inner() {
  const queryClient = useQueryClient();
  return (
    <MswDevtools
      handlers={handlers}
      onMockChange={() => queryClient.refetchQueries({ type: 'all' })}
    >
      <AxiosBridge />
      <h1>Vite + React + axios + react-query</h1>
      <UsersPanel />
    </MswDevtools>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <Inner />
    </QueryClientProvider>
  );
}
