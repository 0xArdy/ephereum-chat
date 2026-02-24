// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

/// @title MessageEnvelopeRegistry
/// @notice A minimal event-only contract for announcing encrypted message envelopes
/// @dev No storage - only emits events for message discovery. Works with EIP-4844 blobs.
///      The blob data is included in the same transaction as the announcement.
contract MessageEnvelopeRegistry {
    /// @notice Emitted when a message envelope is announced
    /// @param recipientStealthAddress The recipient's stealth address (indexed for filtering)
    /// @param ephemeralPubKey The ephemeral public key used for key derivation (33 bytes compressed)
    /// @param viewTag The view tag for fast filtering (first byte of shared secret hash)
    /// @param metadata Application-specific metadata (minimal format: {"version":"v1","payloadHash?":"0x..."})
    event MessageEnvelope(
        address indexed recipientStealthAddress,
        bytes ephemeralPubKey,
        bytes1 viewTag,
        bytes metadata
    );

    /// @notice Announce a message envelope for discovery
    /// @dev Call this in the same transaction that includes the EIP-4844 blob with the encrypted payload
    /// @param recipientStealthAddress The recipient's stealth address
    /// @param ephemeralPubKey The ephemeral public key for decryption (33 bytes compressed)
    /// @param viewTag The view tag for recipient filtering
    /// @param metadata Application-specific metadata
    function announce(
        address recipientStealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes calldata metadata
    ) external {
        emit MessageEnvelope(
            recipientStealthAddress,
            ephemeralPubKey,
            viewTag,
            metadata
        );
    }

    /// @notice Batch announce multiple message envelopes in a single transaction
    /// @dev Useful for announcing to multiple recipients
    /// @param envelopes Array of envelope data to announce
    function announceBatch(Envelope[] calldata envelopes) external {
        for (uint256 i = 0; i < envelopes.length; i++) {
            emit MessageEnvelope(
                envelopes[i].recipientStealthAddress,
                envelopes[i].ephemeralPubKey,
                envelopes[i].viewTag,
                envelopes[i].metadata
            );
        }
    }

    /// @notice Envelope data structure for batch announcements
    struct Envelope {
        address recipientStealthAddress;
        bytes ephemeralPubKey;
        bytes1 viewTag;
        bytes metadata;
    }
}
