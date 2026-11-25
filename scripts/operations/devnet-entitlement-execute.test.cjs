const assert=require('node:assert/strict');
const test=require('node:test');
const {Connection,Keypair,Transaction,SystemInstruction}=require('@solana/web3.js');
const {returnUnspent,retryRpc}=require('./devnet-entitlement-execute.cjs');

test('refund drains the funded system account after the quoted fee',async()=>{
  const source=Keypair.generate();
  const overrides={
    getBalance:async()=>50_000_000,
    getLatestBlockhash:async()=>({blockhash:Keypair.generate().publicKey.toBase58(),lastValidBlockHeight:100}),
    getFeeForMessage:async()=>({value:5_000}),
    sendRawTransaction:async(raw)=>{
      const tx=Transaction.from(raw);
      const transfer=SystemInstruction.decodeTransfer(tx.instructions[0]);
      assert.equal(transfer.fromPubkey.toBase58(),source.publicKey.toBase58());
      assert.equal(transfer.toPubkey.toBase58(),'3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd');
      assert.equal(transfer.lamports,49_995_000n);
      return 'test-refund-signature';
    },
    confirmTransaction:async()=>({value:{err:null},context:{slot:123}}),
    getTransaction:async()=>({slot:123,meta:{err:null}}),
  };
  const previous=Object.fromEntries(Object.keys(overrides).map(k=>[k,Connection.prototype[k]]));
  Object.assign(Connection.prototype,overrides);
  try {
    const result=await returnUnspent(source);
    assert.equal(result.signature,'test-refund-signature');
    assert.equal(result.slot,123);
  } finally {Object.assign(Connection.prototype,previous);}
});

test('non-transport failures are not retried',async()=>{
  let calls=0;
  await assert.rejects(retryRpc(async()=>{calls++;throw Error('authorization rejected');},3),/authorization rejected/);
  assert.equal(calls,1);
});

