// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AbraxasEligibilityVerifier
/// @notice Partner-owned EIP-712 eligibility verifier. Returns only an authorization outcome.
/// @dev Abraxas does not deploy this contract. Partners deploy and own it.
///      This contract never transfers tokens, approves ERC-20 spending, or executes partner actions.
contract AbraxasEligibilityVerifier {
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
    bytes32 public immutable partnerHash;
    address public trustedSigner;

    bytes32 public expectedNetworkId;
    bytes32 public expectedPolicyHash;
    bytes32 public expectedActionHash;
    bytes32 public expectedEnvironment;
    bool public requireSubjectBinding;

    mapping(bytes32 => bool) public consumedNonces;

    event TrustedSignerUpdated(address indexed signer);
    event ExpectedBindingsUpdated();
    event EligibilityAuthorized(bytes32 indexed nonce, bytes32 indexed attestationId, address indexed signer);

    error NotOwner();
    error UnknownSigner();
    error DomainMismatch();
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

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(bytes32 partnerHash_, address trustedSigner_) {
        owner = msg.sender;
        partnerHash = partnerHash_;
        trustedSigner = trustedSigner_;
    }

    function setTrustedSigner(address signer) external onlyOwner {
        if (signer == address(0)) revert UnknownSigner();
        trustedSigner = signer;
        emit TrustedSignerUpdated(signer);
    }

    function setExpectedBindings(
        bytes32 networkId_,
        bytes32 policyHash_,
        bytes32 actionHash_,
        bytes32 environment_,
        bool requireSubjectBinding_
    ) external onlyOwner {
        expectedNetworkId = networkId_;
        expectedPolicyHash = policyHash_;
        expectedActionHash = actionHash_;
        expectedEnvironment = environment_;
        requireSubjectBinding = requireSubjectBinding_;
        emit ExpectedBindingsUpdated();
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

    /// @return authorized True when the attestation is a valid eligibility authorization for this partner.
    function verifyEligibility(
        ChainEligibilityAttestation calldata att,
        bytes calldata signature
    ) external returns (bool authorized) {
        if (att.schemaVersion != SCHEMA_VERSION) revert SchemaMismatch();
        if (att.partnerHash != partnerHash) revert BindingMismatch();
        if (expectedNetworkId != bytes32(0) && att.networkId != expectedNetworkId) revert BindingMismatch();
        if (expectedPolicyHash != bytes32(0) && att.policyHash != expectedPolicyHash) revert BindingMismatch();
        if (expectedActionHash != bytes32(0) && att.actionHash != expectedActionHash) revert BindingMismatch();
        if (expectedEnvironment != bytes32(0) && att.environment != expectedEnvironment) revert BindingMismatch();
        if (requireSubjectBinding && att.subjectHash == bytes32(0)) revert SubjectRequired();
        if (att.expiresAt <= block.timestamp) revert Expired();
        if (consumedNonces[att.nonce]) revert Replayed();

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator(), hashAttestation(att)));
        address signer = _recover(digest, signature);
        if (signer == address(0) || signer != trustedSigner) revert UnknownSigner();

        consumedNonces[att.nonce] = true;
        emit EligibilityAuthorized(att.nonce, att.attestationId, signer);
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
