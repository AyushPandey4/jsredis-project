const CRLF = '\r\n';
const CRLF_BUFFER = Buffer.from(CRLF);

class RESPParser {
  constructor(onCommand) {
    this.buffer = Buffer.alloc(0);
    this.onCommand = onCommand;
  }

  feed(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length > 0) {
      const result = this._parse();
      if (result === null) {
        break;
      }
      this.onCommand(result.value);
      this.buffer = this.buffer.slice(result.consumed);
    }
  }

  _parse() {
    if (this.buffer.length === 0) {
      return null;
    }

    const firstByte = this.buffer[0];
    if (firstByte === 42) { // '*' for Array
      return this._parseArray();
    }
    // Note: A full implementation would handle other types here too.
    // For our Redis command server, we only expect arrays.
    return null;
  }

  /**
   * Parses a RESP Array from the current buffer.
   */
  _parseArray() {
    const crlfIndex = this.buffer.indexOf(CRLF_BUFFER);
    if (crlfIndex === -1) return null; // <-- This was the line with the typo

    const arrayLength = parseInt(this.buffer.slice(1, crlfIndex).toString(), 10);
    if (isNaN(arrayLength)) throw new Error('Invalid array length');

    if (arrayLength < 0) {
      // Handle null arrays if necessary, for now we treat as an error or empty
      return { value: null, consumed: crlfIndex + CRLF.length };
    }

    const elements = [];
    let offset = crlfIndex + CRLF.length;

    for (let i = 0; i < arrayLength; i++) {
      if (offset >= this.buffer.length) {
        // Not enough data for the next element in the array
        return null;
      }
      
      // We only expect Bulk Strings in our command arrays
      if (this.buffer[offset] !== 36) { // '$'
        throw new Error('Array elements must be Bulk Strings for commands');
      }

      const result = this._parseBulkString(offset);
      if (result === null) {
        // The element is incomplete, so the array is incomplete
        return null;
      }

      elements.push(result.value);
      offset += result.consumed;
    }

    return { value: elements, consumed: offset };
  }

  /**
   * Parses a RESP Bulk String from the buffer, starting at a given offset.
   * @param {number} offset - The starting position in this.buffer to parse from.
   */
  _parseBulkString(offset) {
    const crlfIndex = this.buffer.indexOf(CRLF_BUFFER, offset);
    if (crlfIndex === -1) return null;

    const lengthPrefix = this.buffer.slice(offset + 1, crlfIndex).toString();
    const stringLength = parseInt(lengthPrefix, 10);
    if (isNaN(stringLength)) throw new Error('Invalid bulk string length');

    if (stringLength === -1) {
      // Null bulk string "$-1\r\n"
      return { value: null, consumed: 5 };
    }

    const endOfData = crlfIndex + CRLF.length + stringLength + CRLF.length;
    if (this.buffer.length < endOfData) {
      // Not enough data for the full string content and its trailing CRLF
      return null;
    }

    const value = this.buffer.slice(crlfIndex + CRLF.length, crlfIndex + CRLF.length + stringLength).toString();
    const consumed = endOfData - offset;

    return { value, consumed };
  }
}

module.exports = { RESPParser };