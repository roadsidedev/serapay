export const SERA_MAINNET_DOMAIN = {
  name: "Sera",
  version: "1",
  chainId: 1,
  verifyingContract: "0xB5C50C5D5f038404F85970b7f5B7259C4AC0E198",
} as const;

const SERA_SWAP_INTENT_TYPES = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ],
  Intent: [
    { name: "taker", type: "address" },
    { name: "inputToken", type: "address" },
    { name: "outputToken", type: "address" },
    { name: "maxInputAmount", type: "uint256" },
    { name: "minOutputAmount", type: "uint256" },
    { name: "recipient", type: "address" },
    { name: "initialDepositAmount", type: "uint256" },
    { name: "uuid", type: "uint256" },
    { name: "deadline", type: "uint48" },
  ],
} as const;

const EIP712_DOMAIN_TYPES = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
] as const;

const ERC2612_PERMIT_TYPES = {
  EIP712Domain: EIP712_DOMAIN_TYPES,
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

const SERA_WITHDRAW_INTENT_TYPES = {
  EIP712Domain: EIP712_DOMAIN_TYPES,
  WithdrawIntent: [
    { name: "user", type: "address" },
    { name: "tokens", type: "address[]" },
    { name: "amounts", type: "uint256[]" },
    { name: "recipient", type: "address" },
    { name: "deadline", type: "uint256" },
    { name: "uuid", type: "uint256" },
  ],
} as const;

export type SeraSwapIntent = {
  taker: string;
  inputToken: string;
  outputToken: string;
  maxInputAmount: string;
  minOutputAmount: string;
  recipient: string;
  initialDepositAmount: string;
  uuid: string;
  deadline: string;
};

export function getSeraSwapTypedData(routeParams: SeraSwapIntent) {
  return {
    domain: SERA_MAINNET_DOMAIN,
    types: SERA_SWAP_INTENT_TYPES,
    primaryType: "Intent" as const,
    message: routeParams,
  };
}

export type Eip712Domain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

export type SeraWithdrawIntent = {
  user: string;
  tokens: string[];
  amounts: string[];
  recipient: string;
  deadline: string;
  uuid: string;
};

export function getErc2612PermitTypedData(domain: Eip712Domain, message: { owner: string; spender: string; value: string; nonce: number; deadline: number }) {
  return { domain, types: ERC2612_PERMIT_TYPES, primaryType: "Permit" as const, message };
}

export function getSeraWithdrawTypedData(intent: SeraWithdrawIntent, domain: Eip712Domain = SERA_MAINNET_DOMAIN) {
  return { domain, types: SERA_WITHDRAW_INTENT_TYPES, primaryType: "WithdrawIntent" as const, message: intent };
}

export function parseTokenAmount(value: string, decimals: number) {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid positive amount.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`This asset supports up to ${decimals} decimal places.`);
  }

  const result = `${whole}${(fraction + "0".repeat(decimals)).slice(0, decimals)}`.replace(/^0+/, "") || "0";

  if (result === "0") throw new Error("Enter an amount greater than zero.");
  return result;
}

function decimalStringToHex(value: string) {
  let remainder = value.replace(/^0+/, "") || "0";
  let hex = "";

  while (remainder !== "0") {
    let quotient = "";
    let carry = 0;
    for (const character of remainder) {
      const current = carry * 10 + Number(character);
      const digit = Math.floor(current / 16);
      carry = current % 16;
      if (quotient || digit) quotient += String(digit);
    }
    hex = carry.toString(16) + hex;
    remainder = quotient || "0";
  }

  return hex;
}

export function encodeErc20Transfer(recipient: string, rawAmount: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new Error("Enter a valid Ethereum recipient address.");
  }
  if (!/^\d+$/.test(rawAmount) || rawAmount === "0") {
    throw new Error("Enter an amount greater than zero.");
  }

  const encodedRecipient = recipient.slice(2).toLowerCase().padStart(64, "0");
  const encodedAmount = decimalStringToHex(rawAmount).padStart(64, "0");
  return `0xa9059cbb${encodedRecipient}${encodedAmount}`;
}
