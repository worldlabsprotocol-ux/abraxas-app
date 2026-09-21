// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AbraxasPartnerEligibilityGate
/// @notice Partner-owned EIP-712 eligibility gate. Configured at deployment. Consumes a nonce once.
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

    address public owner;
    address public trustedSigner;
    bytes32 public immutable partnerHash;
    bytes32 public immutable expectedNetworkId;
    bytes32 public immutable expectedPolicyHash;
    bytes32 public immutable expectedActionHash;
    bytes32 public immutable expectedEnvironment;
    bool public immutable requireSubjectBinding;

    mapping(bytes32 => bool) public consumedNonces;

    event TrustedSignerUpdated(address indexed signer);
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
        if (config.trustedSigner == address(0)) revert InvalidConfig();
        if (config.partnerHash == bytes32(0)) revert InvalidConfig();
        if (config.networkId == bytes32(0)) revert InvalidConfig();
        if (config.policyHash == bytes32(0)) revert InvalidConfig();
        if (config.actionHash == bytes32(0)) revert InvalidConfig();
        if (config.environment == bytes32(0)) revert InvalidConfig();
        owner = msg.sender;
        trustedSigner = config.trustedSigner;
        partnerHash = config.partnerHash;
        expectedNetworkId = config.networkId;
        expectedPolicyHash = config.policyHash;
        expectedActionHash = config.actionHash;
        expectedEnvironment = config.environment;
        requireSubjectBinding = config.requireSubjectBinding;
    }

    function setTrustedSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert UnknownSigner();
        trustedSigner = signer;
        emit TrustedSignerUpdated(signer);
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
        address signer = _recover(digest, signature);
        if (signer == address(0) || signer != trustedSigner) revert UnknownSigner();

        consumedNonces[att.nonce] = true;
        emit AuthorizationConsumed(att.nonce, att.attestationId, att.partnerHash, att.policyHash, att.actionHash);
        return true;
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
