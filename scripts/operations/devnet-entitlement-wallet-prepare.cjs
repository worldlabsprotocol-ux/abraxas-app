// Server-side unsigned transaction preparation. The founder wallet remains the fee payer and signer.
const {randomBytes}=require('node:crypto');
const nacl=require('tweetnacl');
const {Connection,PublicKey,Transaction,TransactionInstruction}=require('@solana/web3.js');
const x=require('./devnet-entitlement-instructions.cjs');
const {quote}=require('./devnet-entitlement-quote.cjs');

const RPC=process.env.ABRAXAS_DEVNET_RPC_URL||'https://api.devnet.solana.com';
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const FOUNDER=new PublicKey('3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd');
const MEMO=new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const HEX32=/^[0-9a-f]{64}$/;
const connection=new Connection(RPC,'finalized');
const memo=()=>new TransactionInstruction({programId:MEMO,keys:[],data:randomBytes(8)});

function fields(input) {
  if(input.admin!==FOUNDER.toBase58()) throw Error('Unapproved Devnet test wallet');
  const receipt=typeof input.receipt==='string'&&HEX32.test(input.receipt)?Buffer.from(input.receipt,'hex'):null;
  const payload=typeof input.payload==='string'&&HEX32.test(input.payload)?Buffer.from(input.payload,'hex'):null;
  const expires=Number(input.expires);
  if(!receipt||!payload||!Number.isSafeInteger(expires)||
     expires<Math.floor(Date.now()/1000)+60||expires>Math.floor(Date.now()/1000)+1800)
    throw Error('Invalid or stale test receipt fields');
  return {receipt,payload,expires,a:x.addresses(FOUNDER,FOUNDER,receipt)};
}
function signedIssuerInstruction(input,message) {
  if(typeof input.issuerSignature!=='string') throw Error('Missing founder wallet message signature');
  const signature=Buffer.from(input.issuerSignature,'base64');
  if(signature.length!==64||!nacl.sign.detached.verify(message,signature,FOUNDER.toBytes()))
    throw Error('Founder wallet message signature mismatch');
  return x.issuerSignedIx(FOUNDER,signature,message);
}
async function prepare(input,rpc=connection) {
  if(!input||typeof input!=='object'||input.admin!==FOUNDER.toBase58())
    throw Error('Unapproved Devnet test wallet');
  if(input.action==='preflight') {
    const executionEnabled=process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED==='true';
    return {executionEnabled,quote:executionEnabled?await quote():null};
  }
  const {receipt,payload,expires,a}=fields(input);
  if(input.action==='message_receipt')
    return {message:x.canonical(receipt,payload,expires,1,1).toString('base64')};
  if(input.action==='message_revoke')
    return {message:x.statusMessage(receipt,payload,expires).toString('base64')};
  if(process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED!=='true') throw Error('Devnet execution has not been authorized');
  if(await rpc.getGenesisHash()!==GENESIS) throw Error('Wrong Solana cluster');
  let instructions;
  switch(input.action) {
    case 'initialize_registry': instructions=[x.registerIx(FOUNDER,a)]; break;
    case 'bind_holder': instructions=[x.sandboxIx(FOUNDER,a)]; break;
    case 'initialize_mint': instructions=[x.mintInitIx(FOUNDER,a)]; break;
    case 'initialize_relying_party': instructions=[x.trustedIx(FOUNDER,a)]; break;
    case 'signed_receipt': instructions=[signedIssuerInstruction(input,x.canonical(receipt,payload,expires,1,1)),
      x.harnessIx(FOUNDER,FOUNDER,a,receipt,payload,expires)]; break;
    case 'mint_entitlement': instructions=[x.mintIx(FOUNDER,FOUNDER,a,receipt)]; break;
    case 'consume_entitlement': instructions=[x.consumeIx(FOUNDER,FOUNDER,a,receipt)]; break;
    case 'repeat_consume':
    case 'revoked_consume': instructions=[memo(),x.consumeIx(FOUNDER,FOUNDER,a,receipt)]; break;
    // A mismatched account is a negative probe; it must never be treated as success.
    case 'wrong_holder': instructions=[memo(),x.consumeIx(FOUNDER,FOUNDER,
      x.addresses(FOUNDER,new PublicKey(input.wrongHolder),receipt),receipt)]; break;
    case 'revoke_receipt': instructions=[signedIssuerInstruction(input,x.statusMessage(receipt,payload,expires)),
      x.revokeIx(FOUNDER,a,receipt,payload,expires)]; break;
    default: throw Error('Unsupported Devnet test action');
  }
  const {blockhash,lastValidBlockHeight}=await rpc.getLatestBlockhash('finalized');
  const transaction=new Transaction({feePayer:FOUNDER,recentBlockhash:blockhash});
  transaction.add(...instructions);
  const bytes=transaction.serialize({requireAllSignatures:false,verifySignatures:false});
  if(bytes.length>1232) throw Error('Prepared transaction exceeds Solana packet limit');
  return {transaction:bytes.toString('base64'),blockhash,lastValidBlockHeight,
    accounts:Object.fromEntries(Object.entries(a).map(([k,v])=>[k,v.toBase58()])),
    programs:[x.PROOF.toBase58(),x.CONSUMER.toBase58()]};
}
module.exports={prepare,fields};
