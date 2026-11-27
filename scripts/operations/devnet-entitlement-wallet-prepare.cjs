// Server-side, read-only preparation. All state-changing transactions are signed in the founder wallet.
const {randomBytes}=require('node:crypto');
const nacl=require('tweetnacl');
const {Connection,PublicKey,Transaction,TransactionInstruction}=require('@solana/web3.js');
const x=require('./devnet-entitlement-instructions.cjs');
const {quote,SIZES}=require('./devnet-entitlement-quote.cjs');
const STEPS=require('./devnet-entitlement-wallet-steps.json');

const RPC=process.env.ABRAXAS_DEVNET_RPC_URL||'https://api.devnet.solana.com';
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const FOUNDER=new PublicKey('3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd');
const MEMO=new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const HEX32=/^[0-9a-f]{64}$/;
const MAX_CEILING=50_000_000;
const PER_STEP_BUFFER=100_000;
const connection=new Connection(RPC,'finalized');
const memo=()=>new TransactionInstruction({programId:MEMO,keys:[],data:randomBytes(8)});

function approvedCeiling() {
  const value=Number(process.env.ABRAXAS_DEVNET_WALLET_TEST_MAX_LAMPORTS);
  const reference=process.env.ABRAXAS_DEVNET_WALLET_TEST_APPROVAL_REFERENCE||'';
  if(process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED!=='true'||!Number.isSafeInteger(value)||
     value<=0||value>MAX_CEILING||
     !/^https:\/\/github\.com\/worldlabsprotocol-ux\/abraxas-app\/(pull|issues)\/\d+#issuecomment-\d+$/.test(reference))
    return null;
  return value;
}
function fields(input,receiptNumber,allowExpired=false) {
  if(input.admin!==FOUNDER.toBase58()) throw Error('Unapproved Devnet test wallet');
  const id=input[`receipt${receiptNumber}`], digest=input[`payload${receiptNumber}`];
  const receipt=typeof id==='string'&&HEX32.test(id)?Buffer.from(id,'hex'):null;
  const payload=typeof digest==='string'&&HEX32.test(digest)?Buffer.from(digest,'hex'):null;
  const expires=Number(input.expires);
  if(!receipt||!payload||!Number.isSafeInteger(expires)||
     (!allowExpired&&expires<Math.floor(Date.now()/1000)+60)||
     expires>Math.floor(Date.now()/1000)+1800)
    throw Error('Invalid or stale test receipt fields');
  return {receipt,payload,expires,a:x.addresses(FOUNDER,FOUNDER,receipt)};
}
function signedIssuerInstruction(input,message,review=false) {
  if(review) return x.issuerSignedIx(FOUNDER,Buffer.alloc(64),message);
  if(typeof input.issuerSignature!=='string') throw Error('Missing founder wallet message signature');
  const signature=Buffer.from(input.issuerSignature,'base64');
  if(signature.length!==64||!nacl.sign.detached.verify(message,signature,FOUNDER.toBytes()))
    throw Error('Founder wallet message signature mismatch');
  return x.issuerSignedIx(FOUNDER,signature,message);
}
function expectedProgram(action) {
  return ['initialize_relying_party','consume_entitlement','repeat_consume','wrong_holder','revoked_consume']
    .includes(action)?x.CONSUMER:x.PROOF;
}
function expectedAccount(step,input,allowExpired=false) {
  const f=fields(input,step.receipt,allowExpired);
  if(step.action==='initialize_registry'||step.action==='bind_holder') return f.a.registry;
  if(step.action==='initialize_mint') return f.a.mint;
  if(step.action==='initialize_relying_party') return f.a.trusted;
  if(step.action==='mint_entitlement') return f.a.issuance;
  if(['consume_entitlement','repeat_consume','wrong_holder','revoked_consume'].includes(step.action))
    return f.a.ata;
  return f.a.commitment;
}
async function verifyPrefix(input,rpc,stepIndex,allowExpired=false) {
  const evidence=input.evidence;
  if(!Array.isArray(evidence)||evidence.length!==stepIndex) throw Error('Incomplete journey evidence');
  let spent=0,previousSlot=0;
  const seen=new Set();
  for(let n=0;n<stepIndex;n++) {
    const expected=STEPS[n],item=evidence[n];
    if(!item||item.id!==expected.id||typeof item.signature!=='string'||
       !/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(item.signature)||seen.has(item.signature))
      throw Error('Journey evidence sequence mismatch');
    seen.add(item.signature);
    const tx=await rpc.getTransaction(item.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
    if(!tx||!tx.meta||tx.slot<previousSlot||tx.slot!==item.slot||
       Boolean(tx.meta.err)!==Boolean(expected.rejected)) throw Error('Prior step is not finalized as expected');
    previousSlot=tx.slot;
    const message=tx.transaction.message,keys=message.accountKeys;
    if(keys[0].toBase58()!==FOUNDER.toBase58()||
       !keys.some(k=>k.equals(expectedAccount(expected,input,allowExpired)))) throw Error('Prior step account binding mismatch');
    const invoked=message.instructions.map(ix=>keys[ix.programIdIndex].toBase58());
    if(!invoked.includes(expectedProgram(expected.action).toBase58())) throw Error('Prior step program mismatch');
    if(expected.rejected) {
      const failed=tx.meta.err?.InstructionError?.[0];
      if(!Number.isInteger(failed)||invoked[failed]!==x.CONSUMER.toBase58())
        throw Error('Negative probe failed outside entitlement consumer');
    }
    if(expected.action==='wrong_holder') {
      const wrong=new PublicKey(item.wrongHolder);
      if(wrong.equals(FOUNDER)||!keys.slice(0,message.header.numRequiredSignatures).some(k=>k.equals(wrong)))
        throw Error('Wrong-holder signer missing');
    }
    const debit=tx.meta.preBalances[0]-tx.meta.postBalances[0];
    if(!Number.isSafeInteger(debit)||debit<0) throw Error('Prior payer debit indeterminate');
    spent+=debit;
    if(!Number.isSafeInteger(spent)) throw Error('Cumulative cost overflow');
  }
  return spent;
}
async function prepare(input,rpc=connection,quoteProvider=quote) {
  if(!input||typeof input!=='object'||input.admin!==FOUNDER.toBase58())
    throw Error('Unapproved Devnet test wallet');
  const cap=approvedCeiling();
  if(input.action==='preflight') return {executionEnabled:cap!==null,
    quote:cap===null?null:await quoteProvider(),approvedCeilingLamports:cap};
  const readOnlyCheck=input.action==='recover'||input.action==='compatibility_message';
  if(cap===null&&!readOnlyCheck) throw Error('Devnet execution has not been authorized');
  if(await rpc.getGenesisHash()!==GENESIS) throw Error('Wrong Solana cluster');
  if(readOnlyCheck) {
    if(input.stepId!=='signed_receipt1'||!Array.isArray(input.evidence)||input.evidence.length!==4)
      throw Error('Message-only check requires the four finalized steps');
    if(input.action==='recover'&&Number(input.expires)>=Math.floor(Date.now()/1000)+60)
      throw Error('Only an expired, unissued first receipt can be recovered');
    const first=fields(input,1,input.action==='recover');
    const second=fields(input,2,input.action==='recover');
    const spent=await verifyPrefix(input,rpc,4,true);
    if(spent>=(cap??MAX_CEILING)) throw Error('Journey spending ceiling exhausted');
    const unissued=await rpc.getMultipleAccountsInfo(
      [first.a.ledger,first.a.commitment,second.a.commitment],'finalized');
    if(unissued.some(Boolean)) throw Error('Receipt or execution ledger already exists; do not replace its identity');
    if(input.action==='recover') return {recoverable:true,spentLamports:spent,stepId:'signed_receipt1'};
    return {message:x.canonical(first.receipt,first.payload,first.expires,1,1).toString('base64'),
      stepId:'signed_receipt1'};
  }
  const stepIndex=STEPS.findIndex(step=>step.id===input.stepId);
  if(stepIndex<0) throw Error('Unsupported journey step');
  const step=STEPS[stepIndex],f=fields(input,step.receipt);
  fields(input,step.receipt===1?2:1);
  const spent=await verifyPrefix(input,rpc,stepIndex);
  if(spent>=cap) throw Error('Approved journey spending ceiling exhausted');
  if(input.action==='message') {
    if(!['signed_receipt','revoke_receipt'].includes(step.action)) throw Error('Step requires no message');
    const bytes=step.action==='signed_receipt'?
      x.canonical(f.receipt,f.payload,f.expires,1,1):x.statusMessage(f.receipt,f.payload,f.expires);
    return {message:bytes.toString('base64')};
  }
  if(input.action!=='transaction'&&input.action!=='review') throw Error('Unsupported preparation action');
  const review=input.action==='review';
  let instructions;
  switch(step.action) {
    case 'initialize_registry': instructions=[x.registerIx(FOUNDER,f.a)]; break;
    case 'bind_holder': instructions=[x.sandboxIx(FOUNDER,f.a)]; break;
    case 'initialize_mint': instructions=[x.mintInitIx(FOUNDER,f.a)]; break;
    case 'initialize_relying_party': instructions=[x.trustedIx(FOUNDER,f.a)]; break;
    case 'signed_receipt': instructions=[signedIssuerInstruction(input,x.canonical(f.receipt,f.payload,f.expires,1,1),review),
      x.harnessIx(FOUNDER,FOUNDER,f.a,f.receipt,f.payload,f.expires)]; break;
    case 'mint_entitlement': instructions=[x.mintIx(FOUNDER,FOUNDER,f.a,f.receipt)]; break;
    case 'consume_entitlement': instructions=[x.consumeIx(FOUNDER,FOUNDER,f.a,f.receipt)]; break;
    case 'repeat_consume':
    case 'revoked_consume': instructions=[memo(),x.consumeIx(FOUNDER,FOUNDER,f.a,f.receipt)]; break;
    case 'wrong_holder': {
      const wrong=new PublicKey(input.wrongHolder);
      if(wrong.equals(FOUNDER)) throw Error('Wrong-holder probe must use another signer');
      instructions=[memo(),x.consumeIx(FOUNDER,wrong,f.a,f.receipt)]; break;
    }
    case 'revoke_receipt': instructions=[signedIssuerInstruction(input,x.statusMessage(f.receipt,f.payload,f.expires),review),
      x.revokeIx(FOUNDER,f.a,f.receipt,f.payload,f.expires)]; break;
    default: throw Error('Unsupported journey step');
  }
  const {blockhash,lastValidBlockHeight}=await rpc.getLatestBlockhash('finalized');
  const transaction=new Transaction({feePayer:FOUNDER,recentBlockhash:blockhash});
  transaction.add(...instructions);
  const bytes=transaction.serialize({requireAllSignatures:false,verifySignatures:false});
  if(bytes.length>1232) throw Error('Prepared transaction exceeds Solana packet limit');
  const fee=(await rpc.getFeeForMessage(transaction.compileMessage(),'finalized')).value;
  if(!Number.isSafeInteger(fee)||fee<=0) throw Error('Transaction fee cannot be quoted');
  let rent=0;
  for(const name of step.rent) rent+=await rpc.getMinimumBalanceForRentExemption(SIZES[name],'finalized');
  const maxDebit=fee+rent+PER_STEP_BUFFER;
  if(spent+maxDebit>cap) throw Error('Next transaction could exceed approved journey spending ceiling');
  if(review) return {spentLamports:spent,maxDebitLamports:maxDebit,
    remainingAfterMaxLamports:cap-spent-maxDebit,effects:step.effect,
    expectedFailure:Boolean(step.rejected),stepId:step.id};
  return {transaction:bytes.toString('base64'),blockhash,lastValidBlockHeight,
    spentLamports:spent,maxDebitLamports:maxDebit,remainingAfterMaxLamports:cap-spent-maxDebit,
    effects:step.effect,expectedFailure:Boolean(step.rejected),stepId:step.id};
}
module.exports={prepare,fields,verifyPrefix,approvedCeiling,STEPS};
