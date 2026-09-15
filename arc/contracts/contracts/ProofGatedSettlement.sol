// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ProofGatedSettlement
/// @notice Arc Testnet proof gated USDC settlement. Never stores private eligibility data.
contract ProofGatedSettlement is EIP712, ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    bytes32 private constant SETTLEMENT_AUTHORIZATION_TYPEHASH = keccak256(
        "SettlementAuthorization("
        "uint256 chainId,"
        "uint8 environment,"
        "bytes32 partnerApplicationId,"
        "bytes32 partnerIdHash,"
        "bytes32 policyIdHash,"
        "uint256 policyVersion,"
        "address eligibleWallet,"
        "address recipient,"
        "address token,"
        "uint256 amountMicroUsdc,"
        "uint8 amountKind,"
        "bytes32 actionType,"
        "bytes32 nonce,"
        "uint256 issuedAt,"
        "uint256 expiresAt,"
        "bytes32 receiptCommitment,"
        "bytes32 settlementReference"
        ")"
    );

    uint8 private constant AMOUNT_KIND_EXACT = 0;
    uint8 private constant AMOUNT_KIND_MAX = 1;
    uint8 private constant ENV_SANDBOX = 0;

    bool public immutable sandboxOnly;
    address public immutable approvedToken;
    address public immutable approvedRecipient;
    mapping(bytes32 => bool) public usedNonces;
    mapping(address => bool) public authorizedSigners;

    struct SettlementAuthorization {
        uint256 chainId;
        uint8 environment;
        bytes32 partnerApplicationId;
        bytes32 partnerIdHash;
        bytes32 policyIdHash;
        uint256 policyVersion;
        address eligibleWallet;
        address recipient;
        address token;
        uint256 amountMicroUsdc;
        uint8 amountKind;
        bytes32 actionType;
        bytes32 nonce;
        uint256 issuedAt;
        uint256 expiresAt;
        bytes32 receiptCommitment;
        bytes32 settlementReference;
    }

    event SettlementExecuted(
        address indexed payer,
        address indexed recipient,
        address indexed token,
        uint256 amountMicroUsdc,
        bytes32 nonce,
        bytes32 partnerApplicationId,
        bytes32 receiptCommitment,
        bytes32 settlementReference
    );

    event SignerAuthorized(address indexed signer);
    event SignerRevoked(address indexed signer);

    error AuthorizationExpired();
    error InvalidChain();
    error InvalidWallet();
    error InvalidAmount();
    error InvalidEnvironment();
    error InvalidSignature();
    error NonceAlreadyUsed();
    error SignerNotAuthorized();
    error TransferFailed();
    error InvalidToken();
    error InvalidRecipient();
    error ZeroAddress();

    constructor(
        bool sandboxOnlyMode,
        address initialSigner,
        address token,
        address recipient
    ) EIP712("AbraxasSettlement", "1") Ownable(msg.sender) {
        if (token == address(0) || recipient == address(0)) revert ZeroAddress();
        sandboxOnly = sandboxOnlyMode;
        approvedToken = token;
        approvedRecipient = recipient;
        if (initialSigner != address(0)) {
            authorizedSigners[initialSigner] = true;
            emit SignerAuthorized(initialSigner);
        }
    }

    function isSignerAuthorized(address signer) external view returns (bool) {
        return authorizedSigners[signer];
    }

    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }

    function authorizeSigner(address signer) external onlyOwner {
        authorizedSigners[signer] = true;
        emit SignerAuthorized(signer);
    }

    function revokeSigner(address signer) external onlyOwner {
        authorizedSigners[signer] = false;
        emit SignerRevoked(signer);
    }

    function pauseSettlement() external onlyOwner {
        _pause();
    }

    function unpauseSettlement() external onlyOwner {
        _unpause();
    }

    function settle(
        SettlementAuthorization calldata auth,
        bytes calldata signature,
        uint256 transferAmountMicroUsdc
    ) external nonReentrant whenNotPaused {
        if (block.timestamp > auth.expiresAt) revert AuthorizationExpired();
        if (auth.chainId != block.chainid) revert InvalidChain();
        if (auth.eligibleWallet != msg.sender) revert InvalidWallet();
        if (usedNonces[auth.nonce]) revert NonceAlreadyUsed();
        if (sandboxOnly && auth.environment != ENV_SANDBOX) revert InvalidEnvironment();
        if (auth.token != approvedToken) revert InvalidToken();
        if (auth.recipient != approvedRecipient) revert InvalidRecipient();
        if (auth.eligibleWallet == address(0) || auth.recipient == address(0) || auth.token == address(0)) {
            revert ZeroAddress();
        }

        if (auth.amountKind == AMOUNT_KIND_EXACT) {
            if (transferAmountMicroUsdc != auth.amountMicroUsdc) revert InvalidAmount();
        } else if (auth.amountKind == AMOUNT_KIND_MAX) {
            if (transferAmountMicroUsdc == 0 || transferAmountMicroUsdc > auth.amountMicroUsdc) revert InvalidAmount();
        } else {
            revert InvalidAmount();
        }

        bytes32 structHash = _hashAuthorization(auth);
        address signer = ECDSA.recover(_hashTypedDataV4(structHash), signature);
        if (!authorizedSigners[signer]) revert SignerNotAuthorized();

        usedNonces[auth.nonce] = true;

        IERC20(auth.token).safeTransferFrom(msg.sender, auth.recipient, transferAmountMicroUsdc);

        emit SettlementExecuted(
            msg.sender,
            auth.recipient,
            auth.token,
            transferAmountMicroUsdc,
            auth.nonce,
            auth.partnerApplicationId,
            auth.receiptCommitment,
            auth.settlementReference
        );
    }

    function _hashAuthorization(SettlementAuthorization calldata auth) private pure returns (bytes32) {
        return keccak256(
            abi.encode(
                SETTLEMENT_AUTHORIZATION_TYPEHASH,
                auth.chainId,
                auth.environment,
                auth.partnerApplicationId,
                auth.partnerIdHash,
                auth.policyIdHash,
                auth.policyVersion,
                auth.eligibleWallet,
                auth.recipient,
                auth.token,
                auth.amountMicroUsdc,
                auth.amountKind,
                auth.actionType,
                auth.nonce,
                auth.issuedAt,
                auth.expiresAt,
                auth.receiptCommitment,
                auth.settlementReference
            )
        );
    }
}
