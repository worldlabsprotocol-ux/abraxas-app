const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const DOMAIN_NAME = "AbraxasSettlement";
const DOMAIN_VERSION = "1";
const CHAIN_ID = 5042002;

function buildTypedData(contractAddress, auth) {
  return {
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: CHAIN_ID,
      verifyingContract: contractAddress,
    },
    types: {
      SettlementAuthorization: [
        { name: "chainId", type: "uint256" },
        { name: "environment", type: "uint8" },
        { name: "partnerApplicationId", type: "bytes32" },
        { name: "partnerIdHash", type: "bytes32" },
        { name: "policyIdHash", type: "bytes32" },
        { name: "policyVersion", type: "uint256" },
        { name: "eligibleWallet", type: "address" },
        { name: "recipient", type: "address" },
        { name: "token", type: "address" },
        { name: "amountMicroUsdc", type: "uint256" },
        { name: "amountKind", type: "uint8" },
        { name: "actionType", type: "bytes32" },
        { name: "nonce", type: "bytes32" },
        { name: "issuedAt", type: "uint256" },
        { name: "expiresAt", type: "uint256" },
        { name: "receiptCommitment", type: "bytes32" },
        { name: "settlementReference", type: "bytes32" },
      ],
    },
    primaryType: "SettlementAuthorization",
    message: auth,
  };
}

async function signAuth(signer, contractAddress, auth) {
  return signer.signTypedData(
    buildTypedData(contractAddress, auth).domain,
    { SettlementAuthorization: buildTypedData(contractAddress, auth).types.SettlementAuthorization },
    auth,
  );
}

function sampleAuth(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    chainId: CHAIN_ID,
    environment: 0,
    partnerApplicationId: ethers.id("app-1"),
    partnerIdHash: ethers.id("partner-1"),
    policyIdHash: ethers.id("policy-1"),
    policyVersion: 1,
    eligibleWallet: overrides.eligibleWallet,
    recipient: overrides.recipient,
    token: overrides.token,
    amountMicroUsdc: 10000n,
    amountKind: 0,
    actionType: ethers.id("usdc_transfer"),
    nonce: ethers.hexlify(ethers.randomBytes(32)),
    issuedAt: now,
    expiresAt: now + 900,
    receiptCommitment: ethers.id("receipt-commitment"),
    settlementReference: ethers.id("settlement-ref"),
    ...overrides,
  };
}

describe("ProofGatedSettlement", function () {
  let settlement;
  let usdc;
  let signer;
  let payer;
  let recipient;

  beforeEach(async function () {
    [signer, payer, recipient] = await ethers.getSigners();
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    const Settlement = await ethers.getContractFactory("ProofGatedSettlement");
    settlement = await Settlement.deploy(true, signer.address, await usdc.getAddress(), recipient.address);
    await usdc.mint(payer.address, 1_000_000n);
    await usdc.connect(payer).approve(await settlement.getAddress(), 1_000_000n);
  });

  it("settles with a valid authorization", async function () {
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.emit(settlement, "SettlementExecuted");
    expect(await usdc.balanceOf(recipient.address)).to.equal(10000n);
  });

  it("rejects wrong chain", async function () {
    const auth = sampleAuth({
      chainId: 1,
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "InvalidChain");
  });

  it("rejects wrong wallet", async function () {
    const auth = sampleAuth({
      eligibleWallet: recipient.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "InvalidWallet");
  });

  it("rejects modified amount", async function () {
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, 20000n))
      .to.be.revertedWithCustomError(settlement, "InvalidAmount");
  });

  it("rejects expired authorization", async function () {
    const now = await time.latest();
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
      issuedAt: now - 1000,
      expiresAt: now - 1,
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "AuthorizationExpired");
  });

  it("rejects reused nonce", async function () {
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "NonceAlreadyUsed");
  });

  it("rejects invalid signer", async function () {
    const [, , , other] = await ethers.getSigners();
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(other, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "SignerNotAuthorized");
  });

  it("accepts rotated signer", async function () {
    const [, , , rotated] = await ethers.getSigners();
    await settlement.authorizeSigner(rotated.address);
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(rotated, await settlement.getAddress(), auth);
    await settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc);
    expect(await usdc.balanceOf(recipient.address)).to.equal(10000n);
  });

  it("rejects when paused", async function () {
    await settlement.pauseSettlement();
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "EnforcedPause");
  });

  it("rejects wrong token", async function () {
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: "0x0000000000000000000000000000000000000bad",
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "InvalidToken");
  });

  it("rejects wrong recipient", async function () {
    const [, , , other] = await ethers.getSigners();
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: other.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "InvalidRecipient");
  });

  it("rejects production environment in sandbox only mode", async function () {
    const auth = sampleAuth({
      environment: 1,
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    await expect(settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc))
      .to.be.revertedWithCustomError(settlement, "InvalidEnvironment");
  });

  it("emits privacy preserving settlement events without PII fields", async function () {
    const auth = sampleAuth({
      eligibleWallet: payer.address,
      recipient: recipient.address,
      token: await usdc.getAddress(),
    });
    const signature = await signAuth(signer, await settlement.getAddress(), auth);
    const tx = await settlement.connect(payer).settle(auth, signature, auth.amountMicroUsdc);
    const receipt = await tx.wait();
    const event = receipt.logs.find((log) => log.fragment?.name === "SettlementExecuted");
    expect(event).to.exist;
    const json = JSON.stringify(event.args, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    expect(json.toLowerCase()).to.not.include("email");
    expect(json.toLowerCase()).to.not.include("birth");
    expect(json.toLowerCase()).to.not.include("passport");
  });
});
