import { useEffect } from 'react';

export default function useDocumentTitle(suffix) {
  useEffect(() => {
    const prev = document.title;
    document.title = suffix ? `RWSQ — ${suffix}` : 'RWSQ';
    return () => { document.title = prev; };
  }, [suffix]);
}
