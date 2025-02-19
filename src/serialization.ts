import { Buffer } from 'buffer/';
import { getAccountTransactionHandler } from './accountTransactions';
import {
    encodeWord8FromString,
    encodeWord8,
    encodeWord32,
    encodeWord64,
    serializeMap,
} from './serializationHelpers';
import {
    AccountTransactionHeader,
    AccountTransactionType,
    AccountTransaction,
    BlockItemKind,
    AccountTransactionSignature,
    CredentialSignature,
} from './types';
import { calculateEnergyCost } from './energyCost';
import { countSignatures } from './util';
import { sha256 } from './hash';

function serializeAccountTransactionType(type: AccountTransactionType): Buffer {
    return Buffer.from(Uint8Array.of(type));
}

/**
 * Serialization of an account transaction header. The payload size is a part of the header,
 * but is factored out of the type as it always has to be derived from the serialized
 * transaction payload, which cannot happen until the payload has been constructed.
 * @param header the account transaction header with metadata about the transaction
 * @param payloadSize the byte size of the serialized payload
 * @param energyAmount dedicated amount of energy for this transaction, if it is insufficient, the transaction will fail
 * @returns the serialized account transaction header
 */
function serializeAccountTransactionHeader(
    header: AccountTransactionHeader,
    payloadSize: number,
    energyAmount: bigint
) {
    const serializedSender = header.sender.decodedAddress;
    const serializedNonce = encodeWord64(header.nonce);
    const serializedEnergyAmount = encodeWord64(energyAmount);
    const serializedPayloadSize = encodeWord32(payloadSize);
    const serializedExpiry = encodeWord64(header.expiry.expiryEpochSeconds);
    return Buffer.concat([
        serializedSender,
        serializedNonce,
        serializedEnergyAmount,
        serializedPayloadSize,
        serializedExpiry,
    ]);
}

/**
 * Serializes a map of account transaction signatures. If no signatures are provided,
 * then an error is thrown.
 */
export function serializeAccountTransactionSignature(
    signatures: AccountTransactionSignature
): Buffer {
    if (Object.keys(signatures).length === 0) {
        throw new Error('No signatures were provided');
    }

    const putSignature = (signature: string) => {
        const signatureBytes = Buffer.from(signature, 'hex');
        const length = Buffer.alloc(2);
        length.writeUInt16BE(signatureBytes.length, 0);
        return Buffer.concat([length, signatureBytes]);
    };
    const putCredentialSignatures = (credSig: CredentialSignature) =>
        serializeMap(credSig, encodeWord8, encodeWord8FromString, putSignature);
    return serializeMap(
        signatures,
        encodeWord8,
        encodeWord8FromString,
        putCredentialSignatures
    );
}

/**
 * Serializes a transaction and its signatures. This serialization when sha256 hashed
 * is considered as the transaction hash, and is used to look up the status of a
 * submitted transaction.
 * @param accountTransaction the transaction to serialize
 * @param signatures signatures on the signed digest of the transaction
 * @returns the serialization of the account transaction, which is used to calculate the transaction hash
 */
export function serializeAccountTransaction(
    accountTransaction: AccountTransaction,
    signatures: AccountTransactionSignature
): Buffer {
    const serializedBlockItemKind = encodeWord8(
        BlockItemKind.AccountTransactionKind
    );
    const serializedAccountTransactionSignatures =
        serializeAccountTransactionSignature(signatures);

    const serializedType = serializeAccountTransactionType(
        accountTransaction.type
    );

    const accountTransactionHandler = getAccountTransactionHandler(
        accountTransaction.type
    );
    const serializedPayload = accountTransactionHandler.serialize(
        accountTransaction.payload
    );

    const baseEnergyCost = accountTransactionHandler.getBaseEnergyCost(
        accountTransaction.payload
    );
    const energyCost = calculateEnergyCost(
        countSignatures(signatures),
        BigInt(serializedPayload.length + 1),
        baseEnergyCost
    );
    const serializedHeader = serializeAccountTransactionHeader(
        accountTransaction.header,
        serializedPayload.length + 1,
        energyCost
    );

    return Buffer.concat([
        serializedBlockItemKind,
        serializedAccountTransactionSignatures,
        serializedHeader,
        serializedType,
        serializedPayload,
    ]);
}

/**
 * Gets the transaction hash that is used to look up the status of a transaction.
 * @param accountTransaction the transaction to hash
 * @param signatures the signatures that will also be part of the hash
 * @returns the sha256 hash of the serialized block item kind, signatures, header, type and payload
 */
export function getAccountTransactionHash(
    accountTransaction: AccountTransaction,
    signatures: AccountTransactionSignature
): string {
    const serializedAccountTransaction = serializeAccountTransaction(
        accountTransaction,
        signatures
    );
    return sha256([serializedAccountTransaction]).toString('hex');
}

/**
 * Returns the digest of the transaction that has to be signed.
 * @param accountTransaction the transaction to hash
 * @param signatureCount number of expected signatures
 * @returns the sha256 hash on the serialized header, type and payload
 */
export function getAccountTransactionSignDigest(
    accountTransaction: AccountTransaction,
    signatureCount = 1n
): Buffer {
    const accountTransactionHandler = getAccountTransactionHandler(
        accountTransaction.type
    );
    const serializedPayload = accountTransactionHandler.serialize(
        accountTransaction.payload
    );

    const baseEnergyCost = accountTransactionHandler.getBaseEnergyCost(
        accountTransaction.payload
    );
    const energyCost = calculateEnergyCost(
        signatureCount,
        BigInt(serializedPayload.length + 1),
        baseEnergyCost
    );
    const serializedHeader = serializeAccountTransactionHeader(
        accountTransaction.header,
        serializedPayload.length + 1,
        energyCost
    );

    return sha256([
        serializedHeader,
        serializeAccountTransactionType(accountTransaction.type),
        serializedPayload,
    ]);
}

/**
 * Serializes an account transaction so that it is ready for being submitted
 * to the node. This consists of the standard serialization of an account transaction
 * prefixed by a version byte.
 * @param accountTransaction the transaction to serialize
 * @param signatures the signatures on the hash of the account transaction
 * @returns the serialization of the account transaction ready for being submitted to a node
 */
export function serializeAccountTransactionForSubmission(
    accountTransaction: AccountTransaction,
    signatures: AccountTransactionSignature
): Buffer {
    const serializedAccountTransaction = serializeAccountTransaction(
        accountTransaction,
        signatures
    );

    const serializedVersion = encodeWord8(0);
    return Buffer.concat([serializedVersion, serializedAccountTransaction]);
}
