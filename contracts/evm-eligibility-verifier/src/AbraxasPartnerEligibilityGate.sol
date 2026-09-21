// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AbraxasPartnerEligibilityGate
/// @notice Partner-owned EIP-712 eligibility gate with a bounded trusted-signer set.
/// @dev Abraxas does not deploy this contract. Partners deploy and own it.
///      Never transfers tokens, approves ERC-20 spending, accepts ETH, or executes partner actions.
contract AbraxasPartnerEligibilityGate {
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 partnerHash)"
    );
    bytes32 public constant ATTESTATION_TYPEHASH = keccak256(
        "ChainEligibilityAttestation(uint256 schemaVersion,bytes32 networkId,bytes32 partnerHash,bytes32 policyHash,bytes32 actionHash,bytes32 subjectHash,uint64 issuedAt,uint64 expiresAt,bytes32 nonce,bytes32 attestationId,bytes32 environment,bytes32 signerKeyId)"
    );

    string public constant EIP712_NAME = "AbraxasEligibilityVerifier";
    string public constant EIP712_VERSION = "1";
    uint256 public constant SCHEMA_VERSION = 1;
    uint256 public constant MAX_SIGNERS = 4;
    uint8 public constant SIGNER_EMPTY = 0;
    uint8 public constant SIGNER_ACTIVE = 1;
    uint8 public constant SIGNER_RETIRING = 2;
    uint8 public constant SIGNER_REVOKED = 3;

    address public owner;
    bytes32 public immutable partnerHash;
    bytes32 public immutable expectedNetworkId;
    bytes32 public immutable expectedPolicyHash;
    bytes32 public immutable expectedActionHash;
    bytes32 public immutable expectedEnvironment;
    bool public immutable requireSubjectBinding;

    struct TrustedSigner {
        bytes32 keyId;
        address account;
        uint8 status;
    }

    TrustedSigner[4] public trustedSigners;
    mapping(bytes32 => bool) public consumedNonces;

    event TrustedSignerAdded(bytes32 indexed keyId, address indexed account);
    event TrustedSignerRetired(bytes32 indexed keyId, address indexed account);
    event TrustedSignerRevoked(bytes32 indexed keyId, address indexed account);
    event AuthorizationConsumed(
        bytes32 indexed nonce,
        bytes32 indexed attestationId,
        bytes32 partnerHash,
        bytes32 policyHash,
        bytes32 actionHash
    );

    error NotOwner();
    error UnknownSigner();
    error InvalidConfig();
    error DuplicateSigner();
    error SchemaMismatch();
    error Expired();
    error Replayed();
    error BindingMismatch();
    error SubjectRequired();
    error MalformedSignature();
    error ExecutionRejected();

    struct ChainEligibilityAttestation {
        uint256 schemaVersion;
        bytes32 networkId;
        bytes32 partnerHash;
        bytes32 policyHash;
        bytes32 actionHash;
        bytes32 subjectHash;
        uint64 issuedAt;
        uint64 expiresAt;
        bytes32 nonce;
        bytes32 attestationId;
        bytes32 environment;
        bytes32 signerKeyId;
    }

    struct GateConfig {
        address trustedSigner;
        bytes32 trustedSignerKeyId;
        bytes32 partnerHash;
        bytes32 networkId;
        bytes32 policyHash;
        bytes32 actionHash;
        bytes32 environment;
        bool requireSubjectBinding;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(GateConfig memory config) {
        if (config.trustedSigner == address(0) || config.trustedSignerKeyId == bytes32(0)) revert InvalidConfig();
        if (config.partnerHash == bytes32(0)) revert InvalidConfig();
        if (config.networkId == bytes32(0)) revert InvalidConfig();
        if (config.policyHash == bytes32(0)) revert InvalidConfig();
        if (config.actionHash == bytes32(0)) revert InvalidConfig();
        if (config.environment == bytes32(0)) revert InvalidConfig();
        owner = msg.sender;
        partnerHash = config.partnerHash;
        expectedNetworkId = config.networkId;
        expectedPolicyHash = config.policyHash;
        expectedActionHash = config.actionHash;
        expectedEnvironment = config.environment;
        requireSubjectBinding = config.requireSubjectBinding;
        trustedSigners[0] = TrustedSigner({
            keyId: config.trustedSignerKeyId,
            account: config.trustedSigner,
            status: SIGNER_ACTIVE
        });
        emit TrustedSignerAdded(config.trustedSignerKeyId, config.trustedSigner);
    }

    function addTrustedSigner(bytes32 keyId, address account) external onlyOwner {
        if (account == address(0) || keyId == bytes32(0)) revert UnknownSigner();
        int256 empty = -1;
        for (uint256 i; i < MAX_SIGNERS; ++i) {
            TrustedSigner memory slot = trustedSigners[i];
            if (slot.status != SIGNER_EMPTY) {
                if (slot.keyId == keyId || slot.account == account) revert DuplicateSigner();
            } else if (empty < 0) {
                empty = int256(i);
            }
        }
        if (empty < 0) revert InvalidConfig();
        uint256 idx = uint256(empty);
        trustedSigners[idx] = TrustedSigner({ keyId: keyId, account: account, status: SIGNER_ACTIVE });
        emit TrustedSignerAdded(keyId, account);
    }

    function retireTrustedSigner(bytes32 keyId) external onlyOwner {
        uint256 idx = _indexOf(keyId);
        if (trustedSigners[idx].status != SIGNER_ACTIVE) revert UnknownSigner();
        trustedSigners[idx].status = SIGNER_RETIRING;
        emit TrustedSignerRetired(keyId, trustedSigners[idx].account);
    }

    function revokeTrustedSigner(bytes32 keyId) external onlyOwner {
        uint256 idx = _indexOf(keyId);
        if (trustedSigners[idx].status == SIGNER_EMPTY) revert UnknownSigner();
        trustedSigners[idx].status = SIGNER_REVOKED;
        emit TrustedSignerRevoked(keyId, trustedSigners[idx].account);
    }

    function domainSeparator() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(EIP712_NAME)),
                keccak256(bytes(EIP712_VERSION)),
                block.chainid,
                address(this),
                partnerHash
            )
        );
    }

    function hashAttestation(ChainEligibilityAttestation calldata att) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                att.schemaVersion,
                att.networkId,
                att.partnerHash,
                att.policyHash,
                att.actionHash,
                att.subjectHash,
                att.issuedAt,
                att.expiresAt,
                att.nonce,
                att.attestationId,
                att.environment,
                att.signerKeyId
            )
        );
    }

    /// @notice Verify the EIP-712 attestation and consume the nonce. Authorization only.
    function consumeEligibility(
        ChainEligibilityAttestation calldata att,
        bytes calldata signature
    ) external returns (bool authorized) {
        if (att.schemaVersion != SCHEMA_VERSION) revert SchemaMismatch();
        if (att.partnerHash != partnerHash) revert BindingMismatch();
        if (att.networkId != expectedNetworkId) revert BindingMismatch();
        if (att.policyHash != expectedPolicyHash) revert BindingMismatch();
        if (att.actionHash != expectedActionHash) revert BindingMismatch();
        if (att.environment != expectedEnvironment) revert BindingMismatch();
        if (requireSubjectBinding && att.subjectHash == bytes32(0)) revert SubjectRequired();
        if (att.expiresAt <= block.timestamp) revert Expired();
        if (consumedNonces[att.nonce]) revert Replayed();

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator(), hashAttestation(att)));
        address recovered = _recover(digest, signature);
        if (recovered == address(0) || !_allowed(att.signerKeyId, recovered)) revert UnknownSigner();

        consumedNonces[att.nonce] = true;
        emit AuthorizationConsumed(att.nonce, att.attestationId, att.partnerHash, att.policyHash, att.actionHash);
        return true;
    }

    function _indexOf(bytes32 keyId) internal view returns (uint256) {
        for (uint256 i; i < MAX_SIGNERS; ++i) {
            if (trustedSigners[i].status != SIGNER_EMPTY && trustedSigners[i].keyId == keyId) return i;
        }
        revert UnknownSigner();
    }

    function _allowed(bytes32 keyId, address account) internal view returns (bool) {
        for (uint256 i; i < MAX_SIGNERS; ++i) {
            TrustedSigner memory slot = trustedSigners[i];
            if (
                slot.keyId == keyId
                    && slot.account == account
                    && (slot.status == SIGNER_ACTIVE || slot.status == SIGNER_RETIRING)
            ) {
                return true;
            }
        }
        return false;
    }

    function _recover(bytes32 digest, bytes calldata signature) internal pure returns (address) {
        if (signature.length != 65) revert MalformedSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) revert MalformedSignature();
        return ecrecover(digest, v, r, s);
    }

    receive() external payable {
        revert ExecutionRejected();
    }

    fallback() external payable {
        revert ExecutionRejected();
    }
}
