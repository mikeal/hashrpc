# hashrpc

Hashrpc is a very simple stream protocol for hash based messages.

There are only three message types.

* get block
* send block
* control

All messages, including control messages, are hash addressed.

All hash addresses are either multihashes or CIDs.

# Protocol

Single byte Uint8 for each message type:

* get block `1`
* send block `2`
* control `3`

This specification does not define what a control message is or how it is used, that's up to the
application. Nor does this specification define any size limitation on blocks, a "block" could be an entire
CAR file reqested by its multihash.

All message types are bi-directional, any node can send any message type at any time.

## get block

```
[ 1, length, multihash || CID ]
```

## send block

```
[ 2, (multihash || CID)Length, blockLength, multihash || CID, block ]
```

## control

```
[ 3, (multihash || CID)Length, blockLength, multihash || CID, block ]
```
