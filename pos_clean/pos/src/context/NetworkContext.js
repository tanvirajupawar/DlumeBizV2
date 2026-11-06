import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import NetInfo from "@react-native-community/netinfo";

const NetworkContext = createContext(null);

export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected =
        state.isConnected === true &&
        state.isInternetReachable !== false;

      setIsConnected(connected);
    });

    return unsubscribe;
  }, []);

  return (
    <NetworkContext.Provider value={{ isConnected }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  return useContext(NetworkContext);
};