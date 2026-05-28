'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState<unknown>(null);
  useEffect(() => {
    void fetch('/api/posts')
      .then((r) => r.json())
      .then(setData);
  }, []);
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Next.js App Router + MSW Devtools</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
