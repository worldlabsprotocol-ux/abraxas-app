// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {INativeQueryVerifier} from "../interfaces/INativeQueryVerifier.sol";

contract MockNativeQueryVerifier is INativeQueryVerifier {
    bool public result = true;
    uint64 public txIndex = 7;

    function setResult(bool nextResult) external {
        result = nextResult;
    }

    function setTxIndex(uint64 nextIndex) external {
        txIndex = nextIndex;
    }

    function verifyAndEmit(
        uint64,
        uint64,
        bytes calldata,
        MerkleProof calldata,
        ContinuityProof calldata
    ) external view returns (bool) {
        return result;
    }

    function calculateTxIndex(MerkleProof calldata) external view returns (uint64) {
        return txIndex;
    }
}
