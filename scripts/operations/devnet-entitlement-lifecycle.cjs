// One-run, test-only Devnet entitlement journey. Never import this from an app bundle.
const { addresses, canonical } = require('./devnet-entitlement-instructions.cjs');
const { quote } = require('./devnet-entitlement-quote.cjs');
const { execute } = require('./devnet-entitlement-execute.cjs');
module.exports = { addresses, canonical, quote };
if (require.main === module) {
  (async()=>{
    const plan=await quote();
    console.log(JSON.stringify(plan,null,2));
    if (process.argv[2]==='execute') await execute(plan);
    else if(process.argv[2]!=='quote') throw Error('Expected quote or execute');
  })().catch(e=>{console.error(e.message);process.exitCode=1;});
}

