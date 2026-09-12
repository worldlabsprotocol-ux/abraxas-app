// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Decoder for the transaction envelope returned by the Attestcoin proof builder.
/// @dev The envelope is abi.encode(uint8 txType, bytes[] chunks). The final chunk
/// contains the source-chain receipt, including status and logs.
library EvmV1Decoder {
    struct LogEntry {
        address emitter;
        bytes32[] topics;
        bytes data;
    }

    struct CommonTxFields {
        uint64 nonce;
        uint64 gasLimit;
        address from;
        bool toIsNull;
        address to;
        uint256 value;
        bytes data;
    }

    struct ReceiptFields {
        uint8 status;
        uint64 gasUsed;
        LogEntry[] logs;
        bytes logsBloom;
    }

    function decodeCommon(bytes memory encodedTx) internal pure returns (CommonTxFields memory common) {
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTx, (uint8, bytes[]));
        require(txType <= 4, "unsupported tx type");
        require(chunks.length == 3 || chunks.length == 4, "invalid chunk count");
        (
            common.nonce,
            common.gasLimit,
            common.from,
            common.toIsNull,
            common.to,
            common.value,
            common.data
        ) = abi.decode(chunks[0], (uint64, uint64, address, bool, address, uint256, bytes));
    }

    function decodeReceipt(bytes memory encodedTx) internal pure returns (ReceiptFields memory receipt) {
        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTx, (uint8, bytes[]));
        require(txType <= 4, "unsupported tx type");
        uint256 receiptIndex = txType <= 2 ? 2 : 3;
        require(chunks.length == receiptIndex + 1, "invalid chunk count");
        (receipt.status, receipt.gasUsed, receipt.logs, receipt.logsBloom) = abi.decode(
            chunks[receiptIndex],
            (uint8, uint64, LogEntry[], bytes)
        );
    }
}
