import { useEffect, useCallback } from 'react';
import useBackendReady from './BackendReady';

const useDataFetching = (fetchFunction, interval) => {
  const isBackendReady = useBackendReady();

  const fetchData = useCallback(() => {
    fetchFunction();
  }, []);

  useEffect(() => {
    if (isBackendReady) {
      fetchData();
      const fetchDataTimer = setInterval(fetchData, interval);
      return () => {
        clearInterval(fetchDataTimer);
      };
    }
  }, [isBackendReady, interval]);
};

export default useDataFetching;
