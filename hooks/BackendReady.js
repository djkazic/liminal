import { useState, useEffect } from 'react';
import { NativeModules } from 'react-native';

const useBackendReady = () => {
  const [isBackendReady, setIsBackendReady] = useState(false);

  useEffect(() => {
    NativeModules.LndModule.isRunning()
      .then((isRunning) => {
        if (isRunning) {
          setIsBackendReady(lndStatus());
        }
      })
      .catch((error) => {
        console.log('Error checking backend readiness:', error);
      });
  }, []);
  return isBackendReady;
};

const lndStatus = async () => {
  try {
    const lndStatus = await NativeModules.LndModule.getStatus();
    console.log("lndStatus: " + lndStatus);
    if (lndStatus == "rpcactive") {
      return true;
    }
  } catch (error) {
    console.log('Error checking lnd status:', error);
  }
};

export default useBackendReady;
