import { Buffer } from 'buffer/';
import { Memo } from './types/Memo';

export function serializeMap<K extends string | number | symbol, T>(
    map: Record<K, T>,
    encodeSize: (size: number) => Buffer,
    encodeKey: (k: string) => Buffer,
    encodeValue: (t: T) => Buffer
): Buffer {
    const keys = Object.keys(map);
    const buffers = [encodeSize(keys.length)];
    keys.forEach((key) => {
        buffers.push(encodeKey(key));
        buffers.push(encodeValue(map[key as K]));
    });
    return Buffer.concat(buffers);
}

/**
 * Encodes a 64 bit unsigned integer to a Buffer using big endian.
 * @param value a 64 bit integer
 * @returns big endian serialization of the input
 */
export function encodeWord64(value: bigint): Buffer {
    if (value > 9223372036854775807n || value < 0n) {
        throw new Error(
            'The input has to be a 64 bit unsigned integer but it was: ' + value
        );
    }
    const arr = new ArrayBuffer(8);
    const view = new DataView(arr);
    view.setBigUint64(0, value, false);
    return Buffer.from(new Uint8Array(arr));
}

/**
 * Encodes a 32 bit unsigned integer to a Buffer using big endian.
 * @param value a 32 bit integer
 * @returns big endian serialization of the input
 */
export function encodeWord32(value: number): Buffer {
    if (value > 4294967295 || value < 0 || !Number.isInteger(value)) {
        throw new Error(
            'The input has to be a 32 bit unsigned integer but it was: ' + value
        );
    }
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setUint32(0, value, false);
    return Buffer.from(new Uint8Array(arr));
}

/**
 * Encodes a 16 bit unsigned integer to a Buffer using big endian.
 * @param value a 16 bit integer
 * @returns big endian serialization of the input
 */
export function encodeWord16(value: number): Buffer {
    if (value > 65535 || value < 0 || !Number.isInteger(value)) {
        throw new Error(
            'The input has to be a 16 bit unsigned integer but it was: ' + value
        );
    }
    const arr = new ArrayBuffer(2);
    const view = new DataView(arr);
    view.setUint16(0, value, false);
    return Buffer.from(new Uint8Array(arr));
}
/**
 * Encodes a 8 bit unsigned integer to a Buffer using big endian.
 * @param value a 8 bit integer
 * @returns big endian serialization of the input
 */
export function encodeWord8(value: number): Buffer {
    if (value > 255 || value < 0 || !Number.isInteger(value)) {
        throw new Error(
            'The input has to be a 16 bit unsigned integer but it was: ' + value
        );
    }
    return Buffer.from(Buffer.of(value));
}

export function encodeWord8FromString(value: string): Buffer {
    return encodeWord8(Number(value));
}

/**
 * Encodes a memo.
 * @param memo Memo containing the memo bytes.
 * @returns Buffer containing the length of the memo bytes and the memo bytes.
 */
export function encodeMemo(memo: Memo): Buffer {
    const length = encodeWord16(memo.memo.length);
    return Buffer.concat([length, memo.memo]);
}

/**
 * Packing a buffer along the with offset of 32 bit length 
 * @param buffer containing the buffer.
 * @returns Buffer containing the length of the buffer of 32 bit and buffer.
 */
export function packBufferWithWord32Offset(
    buffer: Buffer
): Buffer {
    const length = encodeWord32(buffer.length);
    return Buffer.concat([length, buffer]);
}

/**
 * Packing a buffer along the with offset of 16 bit length 
 * @param buffer containing the buffer
 * @returns Buffer containing the length of the buffer of 16 bit and buffer.
 */
export function packBufferWithWord16Offset(buffer: Buffer): Buffer {
    const length = encodeWord16(buffer.length);
    return Buffer.concat([length, buffer]);
}

/**
 * Convert string to byte array
 * @param string
 * @returns Buffer
 */
export function encodeStringToByteArray(str: string): Buffer {
    const buffer = new Buffer(str, 'utf8');
    const length = encodeWord16(buffer.length);
    return Buffer.concat([length, buffer]);
}
