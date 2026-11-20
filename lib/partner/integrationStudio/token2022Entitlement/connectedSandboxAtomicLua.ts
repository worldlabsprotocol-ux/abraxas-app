/** Redis Lua: atomically supersede preparation and clear signature binding (single bundle key). */
export const LUA_ATOMIC_PREPARE_TRANSITION = `
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local prepare_json = ARGV[2]
local generation = 1
local existing = redis.call('GET', key)
if existing then
  local bundle = cjson.decode(existing)
  generation = (bundle.generation or 0) + 1
end
local prepare = cjson.decode(prepare_json)
prepare.generation = generation
local bundle = {
  v = 2,
  generation = generation,
  prepare = prepare,
  bound_transaction_signature = cjson.null
}
redis.call('SET', key, cjson.encode(bundle), 'EX', ttl)
return generation
`;

/** Redis Lua: bind one signature to a preparation generation (idempotent on same signature). */
export const LUA_ATOMIC_BIND_SIGNATURE = `
local key = KEYS[1]
local expect_gen = tonumber(ARGV[1])
local sig = ARGV[2]
local ttl = tonumber(ARGV[3])
local raw = redis.call('GET', key)
if not raw then return -1 end
local bundle = cjson.decode(raw)
if bundle.generation ~= expect_gen then return -2 end
local bound = bundle.bound_transaction_signature
if type(bound) == "string" and bound ~= sig then return -3 end
bundle.bound_transaction_signature = sig
redis.call('SET', key, cjson.encode(bundle), 'EX', ttl)
return 1
`;

/** Redis Lua: commit confirm cache only when bundle generation and binding still match. */
export const LUA_ATOMIC_COMMIT_CONFIRM = `
local bundle_key = KEYS[1]
local confirm_key = KEYS[2]
local expect_gen = tonumber(ARGV[1])
local message_hash = ARGV[2]
local sig = ARGV[3]
local confirm_json = ARGV[4]
local ttl = tonumber(ARGV[5])
local raw = redis.call('GET', bundle_key)
if not raw then return -1 end
local bundle = cjson.decode(raw)
if bundle.generation ~= expect_gen then return -2 end
if bundle.prepare.message_hash_hex ~= message_hash then return -3 end
local bound = bundle.bound_transaction_signature
if type(bound) ~= "string" or bound ~= sig then return -4 end
redis.call('SET', confirm_key, confirm_json, 'EX', ttl)
return 1
`;