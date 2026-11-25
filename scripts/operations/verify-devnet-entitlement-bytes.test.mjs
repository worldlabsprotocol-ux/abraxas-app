import test from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { verifyDeployedProgramBytes, UPGRADEABLE_LOADER_ID } from "./verify-devnet-entitlement-bytes.mjs";

const authority = new PublicKey("3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd");
const dataAddress = new PublicKey("11111111111111111111111111111111");
const elf = Buffer.from([0x7f, 0x45, 0x4c, 0x46, 1]);
function fixture() {
  const programData = Buffer.alloc(45 + elf.length);
  programData.writeUInt32LE(3, 0);
  programData.writeBigUInt64LE(42n, 4);
  programData[12] = 1;
  authority.toBuffer().copy(programData, 13);
  elf.copy(programData, 45);
  const program = Buffer.alloc(36);
  program.writeUInt32LE(2, 0);
  dataAddress.toBuffer().copy(program, 4);
  return {
    name: "proof", elf, expectedAuthority: authority,
    programInfo: { owner: UPGRADEABLE_LOADER_ID, executable: true, data: program },
    programDataInfo: { owner: UPGRADEABLE_LOADER_ID, data: programData },
  };
}

test("accepts exact finalized loader bytes and authority", () => {
  const result = verifyDeployedProgramBytes(fixture());
  assert.equal(result.upgrade_authority, authority.toBase58());
  assert.equal(result.deployed_slot, 42);
});
test("rejects wrong authority, owner, and modified ELF", () => {
  const wrongAuthority = fixture();
  wrongAuthority.programDataInfo.data[13] ^= 1;
  assert.throws(() => verifyDeployedProgramBytes(wrongAuthority), /authority/);
  const wrongOwner = fixture();
  wrongOwner.programInfo.owner = dataAddress;
  assert.throws(() => verifyDeployedProgramBytes(wrongOwner), /program account invalid/);
  const wrongElf = fixture();
  wrongElf.programDataInfo.data[45] ^= 1;
  assert.throws(() => verifyDeployedProgramBytes(wrongElf), /bytecode differs/);
});

