// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Abraxas source-chain eligibility registry
/// @notice Publishes privacy-minimized Abraxas receipt commitments for Attestcoin verification.
contract SourceEligibilityRegistry {
    address public owner;
    mapping(address => bool) public issuers;
    mapping(bytes32 => bool) public publishedReceipts;

    event IssuerUpdated(address indexed issuer, bool allowed);
    event EligibilityPublished(
        bytes32 indexed receiptHash,
        bytes32 indexed subjectHash,
        bytes32 indexed policyHash,
        uint64 expiresAt,
        bool approved
    );

    error Unauthorized();
    error InvalidCommitment();
    error InvalidExpiry();
    error AlreadyPublished();

    constructor(address initialIssuer) {
        if (initialIssuer == address(0)) revert InvalidCommitment();
        owner = msg.sender;
        issuers[initialIssuer] = true;
        emit IssuerUpdated(initialIssuer, true);
    }

    function setIssuer(address issuer, bool allowed) external {
        if (msg.sender != owner) revert Unauthorized();
        if (issuer == address(0)) revert InvalidCommitment();
        issuers[issuer] = allowed;
        emit IssuerUpdated(issuer, allowed);
    }

    function publishEligibility(
        bytes32 receiptHash,
        bytes32 subjectHash,
        bytes32 policyHash,
        uint64 expiresAt,
        bool approved
    ) external {
        if (!issuers[msg.sender]) revert Unauthorized();
        if (receiptHash == bytes32(0) || subjectHash == bytes32(0) || policyHash == bytes32(0)) {
            revert InvalidCommitment();
        }
        if (expiresAt <= block.timestamp) revert InvalidExpiry();
        if (publishedReceipts[receiptHash]) revert AlreadyPublished();

        publishedReceipts[receiptHash] = true;
        emit EligibilityPublished(receiptHash, subjectHash, policyHash, expiresAt, approved);
    }
}
