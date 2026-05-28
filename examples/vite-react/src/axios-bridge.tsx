import axios from 'axios';
import { useEffect } from 'react';
import { useMswDevtools } from '@juddroid_raccoon/msw-devtools-react';

export function AxiosBridge() {
  const { notifyUnhandledRequest } = useMswDevtools();
  useEffect(() => {
    const id = axios.interceptors.response.use(undefined, (err) => {
      notifyUnhandledRequest({
        method: err.config?.method ?? '',
        url: (err.config?.baseURL ?? '') + (err.config?.url ?? ''),
      });
      throw err;
    });
    return () => axios.interceptors.response.eject(id);
  }, [notifyUnhandledRequest]);
  return null;
}
