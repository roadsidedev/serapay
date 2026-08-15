import { PrivyProvider, useExportWallet, usePrivy, useWallets } from "@privy-io/react-auth";
import { createContext, type ReactNode, useContext, useEffect, useMemo } from "react";
import { setPrivyAccessTokenProvider } from "@/lib/privyAccessToken";
import { deriveUsernameSuggestion } from "@shared/usernameSuggestion";

type SeraPrivySession = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  did: string | null;
  walletAddress: string | null;
  usernameSuggestion: string | null;
  login: () => void;
  logout: () => Promise<void>;
  exportWallet: () => Promise<void>;
};

const unavailableSession: SeraPrivySession = {
  configured: false,
  ready: true,
  authenticated: false,
  did: null,
  walletAddress: null,
  usernameSuggestion: null,
  login: () => undefined,
  logout: async () => undefined,
  exportWallet: async () => undefined,
};

const SeraPrivyContext = createContext<SeraPrivySession>(unavailableSession);

function PrivySessionBridge({ children }: { children: ReactNode }) {
  const { authenticated, getAccessToken, login, logout, ready, user } = usePrivy();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();

  useEffect(() => {
    setPrivyAccessTokenProvider(getAccessToken);
    return () => setPrivyAccessTokenProvider(null);
  }, [getAccessToken]);

  const session = useMemo<SeraPrivySession>(() => ({
    configured: true,
    ready,
    authenticated,
    did: user?.id ?? null,
    walletAddress: wallets[0]?.address ?? null,
    usernameSuggestion: deriveUsernameSuggestion(user),
    login,
    logout,
    exportWallet: () => exportWallet(wallets[0] ? { address: wallets[0].address } : undefined),
  }), [authenticated, exportWallet, login, logout, ready, user, wallets]);

  return <SeraPrivyContext.Provider value={session}>{children}</SeraPrivyContext.Provider>;
}

export function SeraPrivyProvider({ children }: { children: ReactNode }) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID?.trim();
  if (!appId) return <SeraPrivyContext.Provider value={unavailableSession}>{children}</SeraPrivyContext.Provider>;

  return <PrivyProvider appId={appId}><PrivySessionBridge>{children}</PrivySessionBridge></PrivyProvider>;
}

export function useSeraPrivy() {
  return useContext(SeraPrivyContext);
}
