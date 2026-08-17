import { PrivyProvider, useExportWallet, useLinkWithPasskey, useLoginWithPasskey, useMfaEnrollment, usePrivy, useWallets } from "@privy-io/react-auth";
import { setPrivyAccessTokenProvider } from "@/lib/privyAccessToken";
import { deriveUsernameSuggestion } from "@shared/usernameSuggestion";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";

type SeraPrivySession = {
  configured: boolean;
  ready: boolean;
  authenticated: boolean;
  did: string | null;
  walletAddress: string | null;
  usernameSuggestion: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  login: () => void;
  loginWithPasskey: () => Promise<void>;
  linkPasskey: () => Promise<void>;
  enrollPasskeyMfa: () => Promise<void>;
  logout: () => Promise<void>;
  exportWallet: () => Promise<void>;
  signTypedData: ((address: string, typedData: unknown) => Promise<string>) | null;
};

type LinkedAccountWithProfile = {
  name?: string | null;
  username?: string | null;
  profile_picture_url?: string | null;
  photo_url?: string | null;
  picture?: string | null;
};

function deriveProfilePresentation(identity: unknown) {
  const linkedAccounts = typeof identity === "object" && identity !== null && "linkedAccounts" in identity ? (identity as { linkedAccounts?: unknown }).linkedAccounts : [];
  const accounts = Array.isArray(linkedAccounts) ? linkedAccounts.filter((account): account is LinkedAccountWithProfile => typeof account === "object" && account !== null) : [];
  const namedAccount = accounts.find(account => account.name || account.username);
  const picturedAccount = accounts.find(account => account.profile_picture_url || account.photo_url || account.picture);
  return {
    displayName: namedAccount?.name ?? namedAccount?.username ?? null,
    avatarUrl: picturedAccount?.profile_picture_url ?? picturedAccount?.photo_url ?? picturedAccount?.picture ?? null,
  };
}

const unavailableSession: SeraPrivySession = {
  configured: false,
  ready: true,
  authenticated: false,
  did: null,
  walletAddress: null,
  usernameSuggestion: null,
  displayName: null,
  avatarUrl: null,
  login: () => undefined,
  loginWithPasskey: async () => undefined,
  linkPasskey: async () => undefined,
  enrollPasskeyMfa: async () => undefined,
  logout: async () => undefined,
  exportWallet: async () => undefined,
  signTypedData: null,
};

const SeraPrivyContext = createContext<SeraPrivySession>(unavailableSession);

function PrivySessionBridge({ children }: { children: ReactNode }) {
  const { authenticated, getAccessToken, login, logout, ready, user } = usePrivy();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();
  const { loginWithPasskey } = useLoginWithPasskey();
  const { linkWithPasskey } = useLinkWithPasskey();
  const { initEnrollmentWithPasskey } = useMfaEnrollment();

  useEffect(() => {
    setPrivyAccessTokenProvider(getAccessToken);
    return () => setPrivyAccessTokenProvider(null);
  }, [getAccessToken]);

  const signTypedData = useCallback(async (address: string, typedData: unknown) => {
    const wallet = wallets.find(candidate => candidate.address.toLowerCase() === address.toLowerCase()) ?? wallets[0];
    if (!wallet) throw new Error("Privy has not created an Ethereum wallet for this account yet.");
    const provider = await wallet.getEthereumProvider();
    const signature = await provider.request({ method: "eth_signTypedData_v4", params: [address, JSON.stringify(typedData)] });
    if (typeof signature !== "string") throw new Error("Privy did not return a wallet signature.");
    return signature;
  }, [wallets]);

  const presentation = deriveProfilePresentation(user);
  const session = useMemo<SeraPrivySession>(() => ({
    configured: true,
    ready,
    authenticated,
    did: user?.id ?? null,
    walletAddress: wallets[0]?.address ?? null,
    usernameSuggestion: deriveUsernameSuggestion(user),
    displayName: presentation.displayName,
    avatarUrl: presentation.avatarUrl,
    login,
    loginWithPasskey,
    linkPasskey: linkWithPasskey,
    enrollPasskeyMfa: initEnrollmentWithPasskey,
    logout,
    exportWallet: () => exportWallet(wallets[0] ? { address: wallets[0].address } : undefined),
    signTypedData,
  }), [authenticated, exportWallet, initEnrollmentWithPasskey, linkWithPasskey, login, loginWithPasskey, logout, presentation.avatarUrl, presentation.displayName, ready, signTypedData, user, wallets]);

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
