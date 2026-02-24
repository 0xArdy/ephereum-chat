// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {MessageEnvelopeRegistry} from "../src/MessageEnvelopeRegistry.sol";

contract MessageEnvelopeRegistryTest is Test {
    MessageEnvelopeRegistry public registry;

    address public recipient = address(0x5678);
    bytes public ephemeralPubKey = hex"02abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab";
    bytes1 public viewTag = bytes1(0xab);
    bytes public metadata = hex"7b2276657273696f6e223a227631227d"; // {"version":"v1"} minimal on-chain metadata

    event MessageEnvelope(
        address indexed recipientStealthAddress,
        bytes ephemeralPubKey,
        bytes1 viewTag,
        bytes metadata
    );

    function setUp() public {
        registry = new MessageEnvelopeRegistry();
    }

    function test_announce_emits_event() public {
        vm.expectEmit(true, false, false, true);
        emit MessageEnvelope(
            recipient,
            ephemeralPubKey,
            viewTag,
            metadata
        );

        registry.announce(
            recipient,
            ephemeralPubKey,
            viewTag,
            metadata
        );
    }

    function test_announce_batch() public {
        MessageEnvelopeRegistry.Envelope[] memory envelopes = new MessageEnvelopeRegistry.Envelope[](2);

        envelopes[0] = MessageEnvelopeRegistry.Envelope({
            recipientStealthAddress: recipient,
            ephemeralPubKey: ephemeralPubKey,
            viewTag: viewTag,
            metadata: metadata
        });

        envelopes[1] = MessageEnvelopeRegistry.Envelope({
            recipientStealthAddress: address(0x9999),
            ephemeralPubKey: ephemeralPubKey,
            viewTag: bytes1(0xcd),
            metadata: metadata
        });

        registry.announceBatch(envelopes);
    }

    function test_fuzz_announce(
        address _recipient,
        bytes1 _viewTag
    ) public {
        bytes memory _ephemeralPubKey = abi.encodePacked(bytes1(0x02), bytes32(uint256(123)));
        bytes memory _metadata = hex"deadbeef";

        vm.expectEmit(true, false, false, true);
        emit MessageEnvelope(
            _recipient,
            _ephemeralPubKey,
            _viewTag,
            _metadata
        );

        registry.announce(
            _recipient,
            _ephemeralPubKey,
            _viewTag,
            _metadata
        );
    }
}
