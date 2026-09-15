const { expect } = require("chai");
const { ethers } = require("hardhat");

const CHAIN_ID = 5042002;

describe("ProofGatedSettlement fuzz", function () {
  it("rejects random signatures for random authorizations", async function () {
    const [signer, payer, recipient] = await ethers.getSigners();
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const Settlement = await ethers.getContractFactory("ProofGatedSettlement");
    const settlement = await Settlement.deploy(true, signer.address);
    await usdc.mint(payer.address, 10_000_000n);
    await usdc.connect(payer).approve(await settlement.getAddress(), 10_000_000n);

    for (let i = 0; i < 20; i++) {
      const now = Math.floor(Date.now() / 1000);
      const auth = {
        chainId: CHAIN_ID,
        environment: 0,
        partnerApplicationId: ethers.hexlify(ethers.randomBytes(32)),
        partnerIdHash: ethers.hexlify(ethers.randomBytes(32)),
        policyIdHash: ethers.hexlify(ethers.randomBytes(32)),
        policyVersion: BigInt(i + 1),
        eligibleWallet: payer.address,
        recipient: recipient.address,
        token: await usdc.getAddress(),
        amountMicroUsdc: BigInt(1000 + i),
        amountKind: 0,
        actionType: ethers.id("usdc_transfer"),
        nonce: ethers.hexlify(ethers.randomBytes(32)),
        issuedAt: now,
        expiresAt: now + 900,
        receiptCommitment: ethers.hexlify(ethers.randomBytes(32)),
        settlementReference: ethers.hexlify(ethers.randomBytes(32)),
      };
      const badSignature = ethers.hexlify(ethers.randomBytes(65));
      await expect(settlement.connect(payer).settle(auth, badSignature, auth.amountMicroUsdc))
        .to.be.reverted;
    }
  });
});
