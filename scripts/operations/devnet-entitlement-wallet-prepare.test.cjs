const test=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {Keypair,Transaction}=require('@solana/web3.js');
const nacl=require('tweetnacl');
const {prepare}=require('./devnet-entitlement-wallet-prepare.cjs');
const FOUNDER='3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd';
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const input=()=>({admin:FOUNDER,receipt:randomBytes(32).toString('hex'),
  payload:randomBytes(32).toString('hex'),expires:Math.floor(Date.now()/1000)+900});
const rpc={getGenesisHash:async()=>GENESIS,
  getLatestBlockhash:async()=>({blockhash:'11111111111111111111111111111111',lastValidBlockHeight:123})};

test('execution stays disabled without explicit gate',async()=>{
  delete process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED;
  await assert.rejects(prepare({...input(),action:'initialize_registry'},rpc),/not been authorized/);
});
test('wrong wallet, stale receipt, and wrong genesis fail closed',async()=>{
  process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED='true';
  await assert.rejects(prepare({...input(),admin:Keypair.generate().publicKey.toBase58(),action:'initialize_registry'},rpc),/Unapproved/);
  await assert.rejects(prepare({...input(),expires:1,action:'initialize_registry'},rpc),/Invalid or stale/);
  await assert.rejects(prepare({...input(),action:'initialize_registry'},
    {...rpc,getGenesisHash:async()=>'wrong'}),/Wrong Solana cluster/);
  delete process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED;
});
test('unsigned transaction requires founder fee payer and leaves no funded runner key',async()=>{
  process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED='true';
  const result=await prepare({...input(),action:'initialize_registry'},rpc);
  const tx=Transaction.from(Buffer.from(result.transaction,'base64'));
  assert.equal(tx.feePayer.toBase58(),FOUNDER);
  assert.equal(tx.signatures.length,1);
  assert.equal(tx.signatures[0].signature,null);
  assert.equal(tx.instructions.length,1);
  delete process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED;
});
test('receipt issuance requires actual founder signature, not an arbitrary wallet signature',async()=>{
  process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED='true';
  const fields=input();
  const message=await prepare({...fields,action:'message_receipt'},rpc);
  const stranger=Keypair.generate();
  const signature=Buffer.from(nacl.sign.detached(Buffer.from(message.message,'base64'),stranger.secretKey)).toString('base64');
  await assert.rejects(prepare({...fields,action:'signed_receipt',issuerSignature:signature},rpc),/signature mismatch/);
  delete process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED;
});
