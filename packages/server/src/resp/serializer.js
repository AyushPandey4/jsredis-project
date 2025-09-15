const CRLF = "\r\n";

function serializeSimpleString(str) {
  return `+${str}${CRLF}`;
}

function serializeError(err) {
  return `-${err}${CRLF}`;
}

function serializeInteger(num) {
  return `:${num}${CRLF}`;
}

function serializeBulkString(str) {
  if (str === null) {
    return "$-1\r\n";
  }
  return `$${str.length}${CRLF}${str}${CRLF}`;
}

function serializeArray(arr) {
  if (arr === null) {
    return "*-1\r\n";
  }
  let result = `*${arr.length}${CRLF}`;
  for (const item of arr) {
    result += serializeBulkString(item);
  }
  return result;
}

// A special serializer for the null response, often used in RESP v2
function serializeNull() {
  return "$-1\r\n";
}

module.exports = {
  serializeSimpleString,
  serializeError,
  serializeInteger,
  serializeBulkString,
  serializeArray,
  serializeNull,
};
