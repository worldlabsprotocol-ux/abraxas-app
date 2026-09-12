// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {INativeQueryVerifier} from "./interfaces/INativeQueryVerifier.sol";
import {EvmV1Decoder} from "./lib/EvmV1Decoder.sol";

/// @title Abraxas Eligibility USC
/// @notice Verifies an Abraxas source-chain receipt event with Creditcoin's Attestcoin precompile.
contract AbraxasEligibilityUSC {
    address public constant ATTESTCOIN_PRECOMPILE = 0x0000000000000000000000000000000000000FD2;
    bytes32 public constant ELIGIBILITY_EVENT_SIGNATURE = keccak256(
        "EligibilityPublished(bytes32,bytes32,bytes32,uint64,bool)"
    );

    INativeQueryVerifier public immutable verifier;
    uint64 public immutable sourceChainKey;
    address public immutable sourceRegistry;

    struct Eligibility {
        bytes32 receiptHash;
        uint64 expiresAt;
        uint64 sourceBlockHeight;
        uint64 sourceTransactionIndex;
        bool approved;
    }

    mapping(bytes32 => Eligibility) public eligibilityBySubjectAndPolicy;
    mapping(bytes32 => bool) public processedTransactions;

    event EligibilityRecorded(
        bytes32 indexed subjectHash,
        bytes32 indexed receiptHash,
        bytes32 indexed policyHash,
        uint64 expiresAt,
        bool approved,
        bytes32 transactionKey
    );

    error InvalidConfiguration();
    error InvalidSourceChain();
    error InvalidProof();
    error SourceTransactionFailed();
    error WrongSourceContract();
    error EligibilityEventMissing();
    error TransactionAlreadyProcessed();
    error OlderThanCurrentDecision();

    constructor(address verifierAddress, uint64 expectedSourceChainKey, address expectedSourceRegistry) {
        if (verifierAddress == address(0) || expectedSourceChainKey == 0 || expectedSourceRegistry == address(0)) {
            revert InvalidConfiguration();
        }
        verifier = INativeQueryVerifier(verifierAddress);
        sourceChainKey = expectedSourceChainKey;
        sourceRegistry = expectedSourceRegistry;
    }

    function verifyAndRecord(
        uint64 chainKey,
        uint64 blockHeight,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external returns (bytes32 subjectHash) {
        if (chainKey != sourceChainKey) revert InvalidSourceChain();

        uint64 txIndex = verifier.calculateTxIndex(merkleProof);
        bytes32 transactionKey = keccak256(abi.encode(chainKey, blockHeight, txIndex));
        if (processedTransactions[transactionKey]) revert TransactionAlreadyProcessed();

        if (!verifier.verifyAndEmit(
            chainKey,
            blockHeight,
            encodedTransaction,
            merkleProof,
            continuityProof
        )) revert InvalidProof();

        EvmV1Decoder.CommonTxFields memory common = EvmV1Decoder.decodeCommon(encodedTransaction);
        if (common.toIsNull || common.to != sourceRegistry) revert WrongSourceContract();

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceipt(encodedTransaction);
        if (receipt.status != 1) revert SourceTransactionFailed();

        (bytes32 receiptHash, bytes32 policyHash, uint64 expiresAt, bool approved, bytes32 foundSubject) =
            _findEligibility(receipt.logs);
        subjectHash = foundSubject;

        bytes32 eligibilityKey = keccak256(abi.encode(subjectHash, policyHash));
        Eligibility memory current = eligibilityBySubjectAndPolicy[eligibilityKey];
        if (
            current.receiptHash != bytes32(0) &&
            (blockHeight < current.sourceBlockHeight ||
                (blockHeight == current.sourceBlockHeight && txIndex <= current.sourceTransactionIndex))
        ) revert OlderThanCurrentDecision();

        processedTransactions[transactionKey] = true;
        eligibilityBySubjectAndPolicy[eligibilityKey] = Eligibility({
            receiptHash: receiptHash,
            expiresAt: expiresAt,
            sourceBlockHeight: blockHeight,
            sourceTransactionIndex: txIndex,
            approved: approved
        });

        emit EligibilityRecorded(
            subjectHash,
            receiptHash,
            policyHash,
            expiresAt,
            approved,
            transactionKey
        );
    }

    function isEligible(bytes32 subjectHash, bytes32 policyHash) external view returns (bool) {
        Eligibility memory record = eligibilityBySubjectAndPolicy[
            keccak256(abi.encode(subjectHash, policyHash))
        ];
        return record.approved && record.expiresAt > block.timestamp;
    }

    function _findEligibility(EvmV1Decoder.LogEntry[] memory logs)
        internal
        view
        returns (bytes32 receiptHash, bytes32 policyHash, uint64 expiresAt, bool approved, bytes32 subjectHash)
    {
        for (uint256 i = 0; i < logs.length; i++) {
            EvmV1Decoder.LogEntry memory entry = logs[i];
            if (
                entry.emitter == sourceRegistry &&
                entry.topics.length == 4 &&
                entry.topics[0] == ELIGIBILITY_EVENT_SIGNATURE
            ) {
                receiptHash = entry.topics[1];
                subjectHash = entry.topics[2];
                policyHash = entry.topics[3];
                (expiresAt, approved) = abi.decode(entry.data, (uint64, bool));
                return (receiptHash, policyHash, expiresAt, approved, subjectHash);
            }
        }
        revert EligibilityEventMissing();
    }
}
