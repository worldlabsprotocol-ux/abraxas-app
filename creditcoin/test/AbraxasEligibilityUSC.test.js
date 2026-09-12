const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

const CHAIN_KEY = 1n;
const BLOCK_HEIGHT = 100n;
const receiptHash = ethers.id("receipt-001");
const subjectHash = ethers.id("holder-pairwise-001");
const policyHash = ethers.id("abraxas-rwa-us-v1");
const eventSignature = ethers.id(
  "EligibilityPublished(bytes32,bytes32,bytes32,uint64,bool)"
);

function proof() {
  return {
    root: ethers.ZeroHash,
    siblings: [],
  };
}

function continuity() {
  return {
    lowerEndpointDigest: ethers.ZeroHash,
    roots: [],
  };
}

function encodedTransaction({ sourceRegistry, status = 1, emitter = sourceRegistry, approved = true }) {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const common = coder.encode(
    ["uint64", "uint64", "address", "bool", "address", "uint256", "bytes"],
    [1, 100000, ethers.ZeroAddress, false, sourceRegistry, 0, "0x"]
  );
  const logData = coder.encode(["uint64", "bool"], [expiresAt, approved]);
  const receipt = coder.encode(
    ["uint8", "uint64", "tuple(address emitter,bytes32[] topics,bytes data)[]", "bytes"],
    [
      status,
      50000,
      [{ emitter, topics: [eventSignature, receiptHash, subjectHash, policyHash], data: logData }],
      "0x",
    ]
  );
  return coder.encode(["uint8", "bytes[]"], [2, [common, "0x", receipt]]);
}

describe("AbraxasEligibilityUSC", function () {
  async function fixture() {
    const [owner] = await ethers.getSigners();
    const Source = await ethers.getContractFactory("SourceEligibilityRegistry");
    const source = await Source.deploy(owner.address);
    const Mock = await ethers.getContractFactory("MockNativeQueryVerifier");
    const verifier = await Mock.deploy();
    const Destination = await ethers.getContractFactory("AbraxasEligibilityUSC");
    const destination = await Destination.deploy(
      await verifier.getAddress(),
      CHAIN_KEY,
      await source.getAddress()
    );
    return { source, verifier, destination, owner };
  }

  it("records an approved, unexpired result after native proof verification", async function () {
    const { source, destination } = await fixture();
    const txBytes = encodedTransaction({ sourceRegistry: await source.getAddress() });
    await destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT, txBytes, proof(), continuity());

    const eligibilityKey = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [subjectHash, policyHash])
    );
    const record = await destination.eligibilityBySubjectAndPolicy(eligibilityKey);
    assert.equal(record.receiptHash, receiptHash);
    assert.equal(record.approved, true);
    assert.equal(await destination.isEligible(subjectHash, policyHash), true);
  });

  it("rejects a proof that the native verifier rejects", async function () {
    const { source, verifier, destination } = await fixture();
    await verifier.setResult(false);
    const txBytes = encodedTransaction({ sourceRegistry: await source.getAddress() });
    await assert.rejects(
      destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT, txBytes, proof(), continuity()),
      /InvalidProof/
    );
  });

  it("rejects a reverted source transaction", async function () {
    const { source, destination } = await fixture();
    const txBytes = encodedTransaction({ sourceRegistry: await source.getAddress(), status: 0 });
    await assert.rejects(
      destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT, txBytes, proof(), continuity()),
      /SourceTransactionFailed/
    );
  });

  it("rejects an event emitted by any other source contract", async function () {
    const { source, destination, owner } = await fixture();
    const txBytes = encodedTransaction({
      sourceRegistry: await source.getAddress(),
      emitter: owner.address,
    });
    await assert.rejects(
      destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT, txBytes, proof(), continuity()),
      /EligibilityEventMissing/
    );
  });

  it("prevents the same source transaction from being processed twice", async function () {
    const { source, destination } = await fixture();
    const txBytes = encodedTransaction({ sourceRegistry: await source.getAddress() });
    await destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT, txBytes, proof(), continuity());
    await assert.rejects(
      destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT, txBytes, proof(), continuity()),
      /TransactionAlreadyProcessed/
    );
  });

  it("keeps denied results queryable but ineligible", async function () {
    const { source, destination } = await fixture();
    const txBytes = encodedTransaction({
      sourceRegistry: await source.getAddress(),
      approved: false,
    });
    await destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT, txBytes, proof(), continuity());
    assert.equal(await destination.isEligible(subjectHash, policyHash), false);
  });

  it("prevents an older source decision from replacing a newer decision", async function () {
    const { source, verifier, destination } = await fixture();
    const txBytes = encodedTransaction({ sourceRegistry: await source.getAddress() });
    await verifier.setTxIndex(9);
    await destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT + 1n, txBytes, proof(), continuity());
    await verifier.setTxIndex(10);
    await assert.rejects(
      destination.verifyAndRecord(CHAIN_KEY, BLOCK_HEIGHT, txBytes, proof(), continuity()),
      /OlderThanCurrentDecision/
    );
  });
});
