// CREATE2 prediction. Partner deploys; Abraxas does not.

import { getContractAddress, keccak256, encodeAbiParameters, type Hex } from "viem";

export function predictEvmGateCreate2Address(input: {
  deployer: `0x${string}`;
  salt: `0x${string}`;
  initCode: Hex;
}): `0x${string}` {
  return getContractAddress({
    opcode: "CREATE2",
    from: input.deployer,
    salt: input.salt,
    bytecodeHash: keccak256(input.initCode),
  });
}

export function encodeGateConfigArgs(config: {
  trustedSigner: `0x${string}`;
  partnerHash: `0x${string}`;
  networkId: `0x${string}`;
  policyHash: `0x${string}`;
  actionHash: `0x${string}`;
  environment: `0x${string}`;
  requireSubjectBinding: boolean;
}): Hex {
  return encodeAbiParameters(
    [{
      type: "tuple",
      components: [
        { name: "trustedSigner", type: "address" },
        { name: "partnerHash", type: "bytes32" },
        { name: "networkId", type: "bytes32" },
        { name: "policyHash", type: "bytes32" },
        { name: "actionHash", type: "bytes32" },
        { name: "environment", type: "bytes32" },
        { name: "requireSubjectBinding", type: "bool" },
      ],
    }],
    [config],
  );
}
