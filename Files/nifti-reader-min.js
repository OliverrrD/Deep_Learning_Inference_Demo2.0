(function(f) { if (typeof exports === "object" && typeof module !== "undefined") { module.exports = f() } else if (typeof define === "function" && define.amd) { define([], f) } else { var g; if (typeof window !== "undefined") { g = window } else if (typeof global !== "undefined") { g = global } else if (typeof self !== "undefined") { g = self } else { g = this }
        g.nifti = f() } })(function() {
    var define, module, exports;
    return function e(t, n, r) {
        function s(o, u) { if (!n[o]) { if (!t[o]) { var a = typeof require == "function" && require; if (!u && a) return a(o, !0); if (i) return i(o, !0); var f = new Error("Cannot find module '" + o + "'"); throw f.code = "MODULE_NOT_FOUND", f } var l = n[o] = { exports: {} };
                t[o][0].call(l.exports, function(e) { var n = t[o][1][e]; return s(n ? n : e) }, l, l.exports, e, t, n, r) } return n[o].exports } var i = typeof require == "function" && require; for (var o = 0; o < r.length; o++) s(r[o]); return s }({
        1: [function(require, module, exports) { "use strict"; var assign = require("./lib/utils/common").assign; var deflate = require("./lib/deflate"); var inflate = require("./lib/inflate"); var constants = require("./lib/zlib/constants"); var pako = {};
            assign(pako, deflate, inflate, constants);
            module.exports = pako }, { "./lib/deflate": 2, "./lib/inflate": 3, "./lib/utils/common": 4, "./lib/zlib/constants": 7 }],
        2: [function(require, module, exports) { "use strict"; var zlib_deflate = require("./zlib/deflate.js"); var utils = require("./utils/common"); var strings = require("./utils/strings"); var msg = require("./zlib/messages"); var zstream = require("./zlib/zstream"); var toString = Object.prototype.toString; var Z_NO_FLUSH = 0; var Z_FINISH = 4; var Z_OK = 0; var Z_STREAM_END = 1; var Z_SYNC_FLUSH = 2; var Z_DEFAULT_COMPRESSION = -1; var Z_DEFAULT_STRATEGY = 0; var Z_DEFLATED = 8; var Deflate = function(options) { this.options = utils.assign({ level: Z_DEFAULT_COMPRESSION, method: Z_DEFLATED, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: Z_DEFAULT_STRATEGY, to: "" }, options || {}); var opt = this.options; if (opt.raw && opt.windowBits > 0) { opt.windowBits = -opt.windowBits } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) { opt.windowBits += 16 }
                this.err = 0;
                this.msg = "";
                this.ended = false;
                this.chunks = [];
                this.strm = new zstream;
                this.strm.avail_out = 0; var status = zlib_deflate.deflateInit2(this.strm, opt.level, opt.method, opt.windowBits, opt.memLevel, opt.strategy); if (status !== Z_OK) { throw new Error(msg[status]) } if (opt.header) { zlib_deflate.deflateSetHeader(this.strm, opt.header) } };
            Deflate.prototype.push = function(data, mode) { var strm = this.strm; var chunkSize = this.options.chunkSize; var status, _mode; if (this.ended) { return false }
                _mode = mode === ~~mode ? mode : mode === true ? Z_FINISH : Z_NO_FLUSH; if (typeof data === "string") { strm.input = strings.string2buf(data) } else if (toString.call(data) === "[object ArrayBuffer]") { strm.input = new Uint8Array(data) } else { strm.input = data }
                strm.next_in = 0;
                strm.avail_in = strm.input.length;
                do { if (strm.avail_out === 0) { strm.output = new utils.Buf8(chunkSize);
                        strm.next_out = 0;
                        strm.avail_out = chunkSize }
                    status = zlib_deflate.deflate(strm, _mode); if (status !== Z_STREAM_END && status !== Z_OK) { this.onEnd(status);
                        this.ended = true; return false } if (strm.avail_out === 0 || strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH)) { if (this.options.to === "string") { this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out))) } else { this.onData(utils.shrinkBuf(strm.output, strm.next_out)) } } } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END); if (_mode === Z_FINISH) { status = zlib_deflate.deflateEnd(this.strm);
                    this.onEnd(status);
                    this.ended = true; return status === Z_OK } if (_mode === Z_SYNC_FLUSH) { this.onEnd(Z_OK);
                    strm.avail_out = 0; return true } return true };
            Deflate.prototype.onData = function(chunk) { this.chunks.push(chunk) };
            Deflate.prototype.onEnd = function(status) { if (status === Z_OK) { if (this.options.to === "string") { this.result = this.chunks.join("") } else { this.result = utils.flattenChunks(this.chunks) } }
                this.chunks = [];
                this.err = status;
                this.msg = this.strm.msg };

            function deflate(input, options) { var deflator = new Deflate(options);
                deflator.push(input, true); if (deflator.err) { throw deflator.msg } return deflator.result }

            function deflateRaw(input, options) { options = options || {};
                options.raw = true; return deflate(input, options) }

            function gzip(input, options) { options = options || {};
                options.gzip = true; return deflate(input, options) }
            exports.Deflate = Deflate;
            exports.deflate = deflate;
            exports.deflateRaw = deflateRaw;
            exports.gzip = gzip }, { "./utils/common": 4, "./utils/strings": 5, "./zlib/deflate.js": 9, "./zlib/messages": 14, "./zlib/zstream": 16 }],
        3: [function(require, module, exports) { "use strict"; var zlib_inflate = require("./zlib/inflate.js"); var utils = require("./utils/common"); var strings = require("./utils/strings"); var c = require("./zlib/constants"); var msg = require("./zlib/messages"); var zstream = require("./zlib/zstream"); var gzheader = require("./zlib/gzheader"); var toString = Object.prototype.toString; var Inflate = function(options) { this.options = utils.assign({ chunkSize: 16384, windowBits: 0, to: "" }, options || {}); var opt = this.options; if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) { opt.windowBits = -opt.windowBits; if (opt.windowBits === 0) { opt.windowBits = -15 } } if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) { opt.windowBits += 32 } if (opt.windowBits > 15 && opt.windowBits < 48) { if ((opt.windowBits & 15) === 0) { opt.windowBits |= 15 } }
                this.err = 0;
                this.msg = "";
                this.ended = false;
                this.chunks = [];
                this.strm = new zstream;
                this.strm.avail_out = 0; var status = zlib_inflate.inflateInit2(this.strm, opt.windowBits); if (status !== c.Z_OK) { throw new Error(msg[status]) }
                this.header = new gzheader;
                zlib_inflate.inflateGetHeader(this.strm, this.header) };
            Inflate.prototype.push = function(data, mode) { var strm = this.strm; var chunkSize = this.options.chunkSize; var status, _mode; var next_out_utf8, tail, utf8str; var allowBufError = false; if (this.ended) { return false }
                _mode = mode === ~~mode ? mode : mode === true ? c.Z_FINISH : c.Z_NO_FLUSH; if (typeof data === "string") { strm.input = strings.binstring2buf(data) } else if (toString.call(data) === "[object ArrayBuffer]") { strm.input = new Uint8Array(data) } else { strm.input = data }
                strm.next_in = 0;
                strm.avail_in = strm.input.length;
                do { if (strm.avail_out === 0) { strm.output = new utils.Buf8(chunkSize);
                        strm.next_out = 0;
                        strm.avail_out = chunkSize }
                    status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH); if (status === c.Z_BUF_ERROR && allowBufError === true) { status = c.Z_OK;
                        allowBufError = false } if (status !== c.Z_STREAM_END && status !== c.Z_OK) { this.onEnd(status);
                        this.ended = true; return false } if (strm.next_out) { if (strm.avail_out === 0 || status === c.Z_STREAM_END || strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH)) { if (this.options.to === "string") { next_out_utf8 = strings.utf8border(strm.output, strm.next_out);
                                tail = strm.next_out - next_out_utf8;
                                utf8str = strings.buf2string(strm.output, next_out_utf8);
                                strm.next_out = tail;
                                strm.avail_out = chunkSize - tail; if (tail) { utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0) }
                                this.onData(utf8str) } else { this.onData(utils.shrinkBuf(strm.output, strm.next_out)) } } } if (strm.avail_in === 0 && strm.avail_out === 0) { allowBufError = true } } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END); if (status === c.Z_STREAM_END) { _mode = c.Z_FINISH } if (_mode === c.Z_FINISH) { status = zlib_inflate.inflateEnd(this.strm);
                    this.onEnd(status);
                    this.ended = true; return status === c.Z_OK } if (_mode === c.Z_SYNC_FLUSH) { this.onEnd(c.Z_OK);
                    strm.avail_out = 0; return true } return true };
            Inflate.prototype.onData = function(chunk) { this.chunks.push(chunk) };
            Inflate.prototype.onEnd = function(status) { if (status === c.Z_OK) { if (this.options.to === "string") { this.result = this.chunks.join("") } else { this.result = utils.flattenChunks(this.chunks) } }
                this.chunks = [];
                this.err = status;
                this.msg = this.strm.msg };

            function inflate(input, options) { var inflator = new Inflate(options);
                inflator.push(input, true); if (inflator.err) { throw inflator.msg } return inflator.result }

            function inflateRaw(input, options) { options = options || {};
                options.raw = true; return inflate(input, options) }
            exports.Inflate = Inflate;
            exports.inflate = inflate;
            exports.inflateRaw = inflateRaw;
            exports.ungzip = inflate }, { "./utils/common": 4, "./utils/strings": 5, "./zlib/constants": 7, "./zlib/gzheader": 10, "./zlib/inflate.js": 12, "./zlib/messages": 14, "./zlib/zstream": 16 }],
        4: [function(require, module, exports) { "use strict"; var TYPED_OK = typeof Uint8Array !== "undefined" && typeof Uint16Array !== "undefined" && typeof Int32Array !== "undefined";
            exports.assign = function(obj) { var sources = Array.prototype.slice.call(arguments, 1); while (sources.length) { var source = sources.shift(); if (!source) { continue } if (typeof source !== "object") { throw new TypeError(source + "must be non-object") } for (var p in source) { if (source.hasOwnProperty(p)) { obj[p] = source[p] } } } return obj };
            exports.shrinkBuf = function(buf, size) { if (buf.length === size) { return buf } if (buf.subarray) { return buf.subarray(0, size) }
                buf.length = size; return buf }; var fnTyped = { arraySet: function(dest, src, src_offs, len, dest_offs) { if (src.subarray && dest.subarray) { dest.set(src.subarray(src_offs, src_offs + len), dest_offs); return } for (var i = 0; i < len; i++) { dest[dest_offs + i] = src[src_offs + i] } }, flattenChunks: function(chunks) { var i, l, len, pos, chunk, result;
                    len = 0; for (i = 0, l = chunks.length; i < l; i++) { len += chunks[i].length }
                    result = new Uint8Array(len);
                    pos = 0; for (i = 0, l = chunks.length; i < l; i++) { chunk = chunks[i];
                        result.set(chunk, pos);
                        pos += chunk.length } return result } }; var fnUntyped = { arraySet: function(dest, src, src_offs, len, dest_offs) { for (var i = 0; i < len; i++) { dest[dest_offs + i] = src[src_offs + i] } }, flattenChunks: function(chunks) { return [].concat.apply([], chunks) } };
            exports.setTyped = function(on) { if (on) { exports.Buf8 = Uint8Array;
                    exports.Buf16 = Uint16Array;
                    exports.Buf32 = Int32Array;
                    exports.assign(exports, fnTyped) } else { exports.Buf8 = Array;
                    exports.Buf16 = Array;
                    exports.Buf32 = Array;
                    exports.assign(exports, fnUntyped) } };
            exports.setTyped(TYPED_OK) }, {}],
        5: [function(require, module, exports) { "use strict"; var utils = require("./common"); var STR_APPLY_OK = true; var STR_APPLY_UIA_OK = true; try { String.fromCharCode.apply(null, [0]) } catch (__) { STR_APPLY_OK = false } try { String.fromCharCode.apply(null, new Uint8Array(1)) } catch (__) { STR_APPLY_UIA_OK = false } var _utf8len = new utils.Buf8(256); for (var q = 0; q < 256; q++) { _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1 }
            _utf8len[254] = _utf8len[254] = 1;
            exports.string2buf = function(str) { var buf, c, c2, m_pos, i, str_len = str.length,
                    buf_len = 0; for (m_pos = 0; m_pos < str_len; m_pos++) { c = str.charCodeAt(m_pos); if ((c & 64512) === 55296 && m_pos + 1 < str_len) { c2 = str.charCodeAt(m_pos + 1); if ((c2 & 64512) === 56320) { c = 65536 + (c - 55296 << 10) + (c2 - 56320);
                            m_pos++ } }
                    buf_len += c < 128 ? 1 : c < 2048 ? 2 : c < 65536 ? 3 : 4 }
                buf = new utils.Buf8(buf_len); for (i = 0, m_pos = 0; i < buf_len; m_pos++) { c = str.charCodeAt(m_pos); if ((c & 64512) === 55296 && m_pos + 1 < str_len) { c2 = str.charCodeAt(m_pos + 1); if ((c2 & 64512) === 56320) { c = 65536 + (c - 55296 << 10) + (c2 - 56320);
                            m_pos++ } } if (c < 128) { buf[i++] = c } else if (c < 2048) { buf[i++] = 192 | c >>> 6;
                        buf[i++] = 128 | c & 63 } else if (c < 65536) { buf[i++] = 224 | c >>> 12;
                        buf[i++] = 128 | c >>> 6 & 63;
                        buf[i++] = 128 | c & 63 } else { buf[i++] = 240 | c >>> 18;
                        buf[i++] = 128 | c >>> 12 & 63;
                        buf[i++] = 128 | c >>> 6 & 63;
                        buf[i++] = 128 | c & 63 } } return buf };

            function buf2binstring(buf, len) { if (len < 65537) { if (buf.subarray && STR_APPLY_UIA_OK || !buf.subarray && STR_APPLY_OK) { return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len)) } } var result = ""; for (var i = 0; i < len; i++) { result += String.fromCharCode(buf[i]) } return result }
            exports.buf2binstring = function(buf) { return buf2binstring(buf, buf.length) };
            exports.binstring2buf = function(str) { var buf = new utils.Buf8(str.length); for (var i = 0, len = buf.length; i < len; i++) { buf[i] = str.charCodeAt(i) } return buf };
            exports.buf2string = function(buf, max) { var i, out, c, c_len; var len = max || buf.length; var utf16buf = new Array(len * 2); for (out = 0, i = 0; i < len;) { c = buf[i++]; if (c < 128) { utf16buf[out++] = c; continue }
                    c_len = _utf8len[c]; if (c_len > 4) { utf16buf[out++] = 65533;
                        i += c_len - 1; continue }
                    c &= c_len === 2 ? 31 : c_len === 3 ? 15 : 7; while (c_len > 1 && i < len) { c = c << 6 | buf[i++] & 63;
                        c_len-- } if (c_len > 1) { utf16buf[out++] = 65533; continue } if (c < 65536) { utf16buf[out++] = c } else { c -= 65536;
                        utf16buf[out++] = 55296 | c >> 10 & 1023;
                        utf16buf[out++] = 56320 | c & 1023 } } return buf2binstring(utf16buf, out) };
            exports.utf8border = function(buf, max) { var pos;
                max = max || buf.length; if (max > buf.length) { max = buf.length }
                pos = max - 1; while (pos >= 0 && (buf[pos] & 192) === 128) { pos-- } if (pos < 0) { return max } if (pos === 0) { return max } return pos + _utf8len[buf[pos]] > max ? pos : max } }, { "./common": 4 }],
        6: [function(require, module, exports) { "use strict";

            function adler32(adler, buf, len, pos) { var s1 = adler & 65535 | 0,
                    s2 = adler >>> 16 & 65535 | 0,
                    n = 0; while (len !== 0) { n = len > 2e3 ? 2e3 : len;
                    len -= n;
                    do { s1 = s1 + buf[pos++] | 0;
                        s2 = s2 + s1 | 0 } while (--n);
                    s1 %= 65521;
                    s2 %= 65521 } return s1 | s2 << 16 | 0 }
            module.exports = adler32 }, {}],
        7: [function(require, module, exports) { module.exports = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 } }, {}],
        8: [function(require, module, exports) { "use strict";

            function makeTable() { var c, table = []; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) { c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1 }
                    table[n] = c } return table } var crcTable = makeTable();

            function crc32(crc, buf, len, pos) { var t = crcTable,
                    end = pos + len;
                crc = crc ^ -1; for (var i = pos; i < end; i++) { crc = crc >>> 8 ^ t[(crc ^ buf[i]) & 255] } return crc ^ -1 }
            module.exports = crc32 }, {}],
        9: [function(require, module, exports) {
            "use strict";
            var utils = require("../utils/common");
            var trees = require("./trees");
            var adler32 = require("./adler32");
            var crc32 = require("./crc32");
            var msg = require("./messages");
            var Z_NO_FLUSH = 0;
            var Z_PARTIAL_FLUSH = 1;
            var Z_FULL_FLUSH = 3;
            var Z_FINISH = 4;
            var Z_BLOCK = 5;
            var Z_OK = 0;
            var Z_STREAM_END = 1;
            var Z_STREAM_ERROR = -2;
            var Z_DATA_ERROR = -3;
            var Z_BUF_ERROR = -5;
            var Z_DEFAULT_COMPRESSION = -1;
            var Z_FILTERED = 1;
            var Z_HUFFMAN_ONLY = 2;
            var Z_RLE = 3;
            var Z_FIXED = 4;
            var Z_DEFAULT_STRATEGY = 0;
            var Z_UNKNOWN = 2;
            var Z_DEFLATED = 8;
            var MAX_MEM_LEVEL = 9;
            var MAX_WBITS = 15;
            var DEF_MEM_LEVEL = 8;
            var LENGTH_CODES = 29;
            var LITERALS = 256;
            var L_CODES = LITERALS + 1 + LENGTH_CODES;
            var D_CODES = 30;
            var BL_CODES = 19;
            var HEAP_SIZE = 2 * L_CODES + 1;
            var MAX_BITS = 15;
            var MIN_MATCH = 3;
            var MAX_MATCH = 258;
            var MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1;
            var PRESET_DICT = 32;
            var INIT_STATE = 42;
            var EXTRA_STATE = 69;
            var NAME_STATE = 73;
            var COMMENT_STATE = 91;
            var HCRC_STATE = 103;
            var BUSY_STATE = 113;
            var FINISH_STATE = 666;
            var BS_NEED_MORE = 1;
            var BS_BLOCK_DONE = 2;
            var BS_FINISH_STARTED = 3;
            var BS_FINISH_DONE = 4;
            var OS_CODE = 3;

            function err(strm, errorCode) { strm.msg = msg[errorCode]; return errorCode }

            function rank(f) { return (f << 1) - (f > 4 ? 9 : 0) }

            function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0 } }

            function flush_pending(strm) { var s = strm.state; var len = s.pending; if (len > strm.avail_out) { len = strm.avail_out } if (len === 0) { return }
                utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
                strm.next_out += len;
                s.pending_out += len;
                strm.total_out += len;
                strm.avail_out -= len;
                s.pending -= len; if (s.pending === 0) { s.pending_out = 0 } }

            function flush_block_only(s, last) { trees._tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
                s.block_start = s.strstart;
                flush_pending(s.strm) }

            function put_byte(s, b) { s.pending_buf[s.pending++] = b }

            function putShortMSB(s, b) { s.pending_buf[s.pending++] = b >>> 8 & 255;
                s.pending_buf[s.pending++] = b & 255 }

            function read_buf(strm, buf, start, size) { var len = strm.avail_in; if (len > size) { len = size } if (len === 0) { return 0 }
                strm.avail_in -= len;
                utils.arraySet(buf, strm.input, strm.next_in, len, start); if (strm.state.wrap === 1) { strm.adler = adler32(strm.adler, buf, len, start) } else if (strm.state.wrap === 2) { strm.adler = crc32(strm.adler, buf, len, start) }
                strm.next_in += len;
                strm.total_in += len; return len }

            function longest_match(s, cur_match) { var chain_length = s.max_chain_length; var scan = s.strstart; var match; var len; var best_len = s.prev_length; var nice_match = s.nice_match; var limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0; var _win = s.window; var wmask = s.w_mask; var prev = s.prev; var strend = s.strstart + MAX_MATCH; var scan_end1 = _win[scan + best_len - 1]; var scan_end = _win[scan + best_len]; if (s.prev_length >= s.good_match) { chain_length >>= 2 } if (nice_match > s.lookahead) { nice_match = s.lookahead }
                do { match = cur_match; if (_win[match + best_len] !== scan_end || _win[match + best_len - 1] !== scan_end1 || _win[match] !== _win[scan] || _win[++match] !== _win[scan + 1]) { continue }
                    scan += 2;
                    match++;
                    do {} while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && _win[++scan] === _win[++match] && scan < strend);
                    len = MAX_MATCH - (strend - scan);
                    scan = strend - MAX_MATCH; if (len > best_len) { s.match_start = cur_match;
                        best_len = len; if (len >= nice_match) { break }
                        scan_end1 = _win[scan + best_len - 1];
                        scan_end = _win[scan + best_len] } } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0); if (best_len <= s.lookahead) { return best_len } return s.lookahead }

            function fill_window(s) { var _w_size = s.w_size; var p, n, m, more, str;
                do { more = s.window_size - s.lookahead - s.strstart; if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) { utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
                        s.match_start -= _w_size;
                        s.strstart -= _w_size;
                        s.block_start -= _w_size;
                        n = s.hash_size;
                        p = n;
                        do { m = s.head[--p];
                            s.head[p] = m >= _w_size ? m - _w_size : 0 } while (--n);
                        n = _w_size;
                        p = n;
                        do { m = s.prev[--p];
                            s.prev[p] = m >= _w_size ? m - _w_size : 0 } while (--n);
                        more += _w_size } if (s.strm.avail_in === 0) { break }
                    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
                    s.lookahead += n; if (s.lookahead + s.insert >= MIN_MATCH) { str = s.strstart - s.insert;
                        s.ins_h = s.window[str];
                        s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + 1]) & s.hash_mask; while (s.insert) { s.ins_h = (s.ins_h << s.hash_shift ^ s.window[str + MIN_MATCH - 1]) & s.hash_mask;
                            s.prev[str & s.w_mask] = s.head[s.ins_h];
                            s.head[s.ins_h] = str;
                            str++;
                            s.insert--; if (s.lookahead + s.insert < MIN_MATCH) { break } } } } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0) }

            function deflate_stored(s, flush) { var max_block_size = 65535; if (max_block_size > s.pending_buf_size - 5) { max_block_size = s.pending_buf_size - 5 } for (;;) { if (s.lookahead <= 1) { fill_window(s); if (s.lookahead === 0 && flush === Z_NO_FLUSH) { return BS_NEED_MORE } if (s.lookahead === 0) { break } }
                    s.strstart += s.lookahead;
                    s.lookahead = 0; var max_start = s.block_start + max_block_size; if (s.strstart === 0 || s.strstart >= max_start) { s.lookahead = s.strstart - max_start;
                        s.strstart = max_start;
                        flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } if (s.strstart - s.block_start >= s.w_size - MIN_LOOKAHEAD) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } }
                s.insert = 0; if (flush === Z_FINISH) { flush_block_only(s, true); if (s.strm.avail_out === 0) { return BS_FINISH_STARTED } return BS_FINISH_DONE } if (s.strstart > s.block_start) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } return BS_NEED_MORE }

            function deflate_fast(s, flush) { var hash_head; var bflush; for (;;) { if (s.lookahead < MIN_LOOKAHEAD) { fill_window(s); if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) { return BS_NEED_MORE } if (s.lookahead === 0) { break } }
                    hash_head = 0; if (s.lookahead >= MIN_MATCH) { s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
                        hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
                        s.head[s.ins_h] = s.strstart } if (hash_head !== 0 && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) { s.match_length = longest_match(s, hash_head) } if (s.match_length >= MIN_MATCH) { bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);
                        s.lookahead -= s.match_length; if (s.match_length <= s.max_lazy_match && s.lookahead >= MIN_MATCH) { s.match_length--;
                            do { s.strstart++;
                                s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
                                hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
                                s.head[s.ins_h] = s.strstart } while (--s.match_length !== 0);
                            s.strstart++ } else { s.strstart += s.match_length;
                            s.match_length = 0;
                            s.ins_h = s.window[s.strstart];
                            s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + 1]) & s.hash_mask } } else { bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
                        s.lookahead--;
                        s.strstart++ } if (bflush) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } }
                s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1; if (flush === Z_FINISH) { flush_block_only(s, true); if (s.strm.avail_out === 0) { return BS_FINISH_STARTED } return BS_FINISH_DONE } if (s.last_lit) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } return BS_BLOCK_DONE }

            function deflate_slow(s, flush) { var hash_head; var bflush; var max_insert; for (;;) { if (s.lookahead < MIN_LOOKAHEAD) { fill_window(s); if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) { return BS_NEED_MORE } if (s.lookahead === 0) { break } }
                    hash_head = 0; if (s.lookahead >= MIN_MATCH) { s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
                        hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
                        s.head[s.ins_h] = s.strstart }
                    s.prev_length = s.match_length;
                    s.prev_match = s.match_start;
                    s.match_length = MIN_MATCH - 1; if (hash_head !== 0 && s.prev_length < s.max_lazy_match && s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD) { s.match_length = longest_match(s, hash_head); if (s.match_length <= 5 && (s.strategy === Z_FILTERED || s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096)) { s.match_length = MIN_MATCH - 1 } } if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) { max_insert = s.strstart + s.lookahead - MIN_MATCH;
                        bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH);
                        s.lookahead -= s.prev_length - 1;
                        s.prev_length -= 2;
                        do { if (++s.strstart <= max_insert) { s.ins_h = (s.ins_h << s.hash_shift ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
                                hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
                                s.head[s.ins_h] = s.strstart } } while (--s.prev_length !== 0);
                        s.match_available = 0;
                        s.match_length = MIN_MATCH - 1;
                        s.strstart++; if (bflush) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } } else if (s.match_available) { bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]); if (bflush) { flush_block_only(s, false) }
                        s.strstart++;
                        s.lookahead--; if (s.strm.avail_out === 0) { return BS_NEED_MORE } } else { s.match_available = 1;
                        s.strstart++;
                        s.lookahead-- } } if (s.match_available) { bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);
                    s.match_available = 0 }
                s.insert = s.strstart < MIN_MATCH - 1 ? s.strstart : MIN_MATCH - 1; if (flush === Z_FINISH) { flush_block_only(s, true); if (s.strm.avail_out === 0) { return BS_FINISH_STARTED } return BS_FINISH_DONE } if (s.last_lit) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } return BS_BLOCK_DONE }

            function deflate_rle(s, flush) { var bflush; var prev; var scan, strend; var _win = s.window; for (;;) { if (s.lookahead <= MAX_MATCH) { fill_window(s); if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) { return BS_NEED_MORE } if (s.lookahead === 0) { break } }
                    s.match_length = 0; if (s.lookahead >= MIN_MATCH && s.strstart > 0) { scan = s.strstart - 1;
                        prev = _win[scan]; if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) { strend = s.strstart + MAX_MATCH;
                            do {} while (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan] && scan < strend);
                            s.match_length = MAX_MATCH - (strend - scan); if (s.match_length > s.lookahead) { s.match_length = s.lookahead } } } if (s.match_length >= MIN_MATCH) { bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);
                        s.lookahead -= s.match_length;
                        s.strstart += s.match_length;
                        s.match_length = 0 } else { bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
                        s.lookahead--;
                        s.strstart++ } if (bflush) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } }
                s.insert = 0; if (flush === Z_FINISH) { flush_block_only(s, true); if (s.strm.avail_out === 0) { return BS_FINISH_STARTED } return BS_FINISH_DONE } if (s.last_lit) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } return BS_BLOCK_DONE }

            function deflate_huff(s, flush) { var bflush; for (;;) { if (s.lookahead === 0) { fill_window(s); if (s.lookahead === 0) { if (flush === Z_NO_FLUSH) { return BS_NEED_MORE } break } }
                    s.match_length = 0;
                    bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
                    s.lookahead--;
                    s.strstart++; if (bflush) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } }
                s.insert = 0; if (flush === Z_FINISH) { flush_block_only(s, true); if (s.strm.avail_out === 0) { return BS_FINISH_STARTED } return BS_FINISH_DONE } if (s.last_lit) { flush_block_only(s, false); if (s.strm.avail_out === 0) { return BS_NEED_MORE } } return BS_BLOCK_DONE }
            var Config = function(good_length, max_lazy, nice_length, max_chain, func) { this.good_length = good_length;
                this.max_lazy = max_lazy;
                this.nice_length = nice_length;
                this.max_chain = max_chain;
                this.func = func };
            var configuration_table;
            configuration_table = [new Config(0, 0, 0, 0, deflate_stored), new Config(4, 4, 8, 4, deflate_fast), new Config(4, 5, 16, 8, deflate_fast), new Config(4, 6, 32, 32, deflate_fast), new Config(4, 4, 16, 16, deflate_slow), new Config(8, 16, 32, 32, deflate_slow), new Config(8, 16, 128, 128, deflate_slow), new Config(8, 32, 128, 256, deflate_slow), new Config(32, 128, 258, 1024, deflate_slow), new Config(32, 258, 258, 4096, deflate_slow)];

            function lm_init(s) { s.window_size = 2 * s.w_size;
                zero(s.head);
                s.max_lazy_match = configuration_table[s.level].max_lazy;
                s.good_match = configuration_table[s.level].good_length;
                s.nice_match = configuration_table[s.level].nice_length;
                s.max_chain_length = configuration_table[s.level].max_chain;
                s.strstart = 0;
                s.block_start = 0;
                s.lookahead = 0;
                s.insert = 0;
                s.match_length = s.prev_length = MIN_MATCH - 1;
                s.match_available = 0;
                s.ins_h = 0 }

            function DeflateState() { this.strm = null;
                this.status = 0;
                this.pending_buf = null;
                this.pending_buf_size = 0;
                this.pending_out = 0;
                this.pending = 0;
                this.wrap = 0;
                this.gzhead = null;
                this.gzindex = 0;
                this.method = Z_DEFLATED;
                this.last_flush = -1;
                this.w_size = 0;
                this.w_bits = 0;
                this.w_mask = 0;
                this.window = null;
                this.window_size = 0;
                this.prev = null;
                this.head = null;
                this.ins_h = 0;
                this.hash_size = 0;
                this.hash_bits = 0;
                this.hash_mask = 0;
                this.hash_shift = 0;
                this.block_start = 0;
                this.match_length = 0;
                this.prev_match = 0;
                this.match_available = 0;
                this.strstart = 0;
                this.match_start = 0;
                this.lookahead = 0;
                this.prev_length = 0;
                this.max_chain_length = 0;
                this.max_lazy_match = 0;
                this.level = 0;
                this.strategy = 0;
                this.good_match = 0;
                this.nice_match = 0;
                this.dyn_ltree = new utils.Buf16(HEAP_SIZE * 2);
                this.dyn_dtree = new utils.Buf16((2 * D_CODES + 1) * 2);
                this.bl_tree = new utils.Buf16((2 * BL_CODES + 1) * 2);
                zero(this.dyn_ltree);
                zero(this.dyn_dtree);
                zero(this.bl_tree);
                this.l_desc = null;
                this.d_desc = null;
                this.bl_desc = null;
                this.bl_count = new utils.Buf16(MAX_BITS + 1);
                this.heap = new utils.Buf16(2 * L_CODES + 1);
                zero(this.heap);
                this.heap_len = 0;
                this.heap_max = 0;
                this.depth = new utils.Buf16(2 * L_CODES + 1);
                zero(this.depth);
                this.l_buf = 0;
                this.lit_bufsize = 0;
                this.last_lit = 0;
                this.d_buf = 0;
                this.opt_len = 0;
                this.static_len = 0;
                this.matches = 0;
                this.insert = 0;
                this.bi_buf = 0;
                this.bi_valid = 0 }

            function deflateResetKeep(strm) { var s; if (!strm || !strm.state) { return err(strm, Z_STREAM_ERROR) }
                strm.total_in = strm.total_out = 0;
                strm.data_type = Z_UNKNOWN;
                s = strm.state;
                s.pending = 0;
                s.pending_out = 0; if (s.wrap < 0) { s.wrap = -s.wrap }
                s.status = s.wrap ? INIT_STATE : BUSY_STATE;
                strm.adler = s.wrap === 2 ? 0 : 1;
                s.last_flush = Z_NO_FLUSH;
                trees._tr_init(s); return Z_OK }

            function deflateReset(strm) { var ret = deflateResetKeep(strm); if (ret === Z_OK) { lm_init(strm.state) } return ret }

            function deflateSetHeader(strm, head) { if (!strm || !strm.state) { return Z_STREAM_ERROR } if (strm.state.wrap !== 2) { return Z_STREAM_ERROR }
                strm.state.gzhead = head; return Z_OK }

            function deflateInit2(strm, level, method, windowBits, memLevel, strategy) { if (!strm) { return Z_STREAM_ERROR } var wrap = 1; if (level === Z_DEFAULT_COMPRESSION) { level = 6 } if (windowBits < 0) { wrap = 0;
                    windowBits = -windowBits } else if (windowBits > 15) { wrap = 2;
                    windowBits -= 16 } if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED || windowBits < 8 || windowBits > 15 || level < 0 || level > 9 || strategy < 0 || strategy > Z_FIXED) { return err(strm, Z_STREAM_ERROR) } if (windowBits === 8) { windowBits = 9 } var s = new DeflateState;
                strm.state = s;
                s.strm = strm;
                s.wrap = wrap;
                s.gzhead = null;
                s.w_bits = windowBits;
                s.w_size = 1 << s.w_bits;
                s.w_mask = s.w_size - 1;
                s.hash_bits = memLevel + 7;
                s.hash_size = 1 << s.hash_bits;
                s.hash_mask = s.hash_size - 1;
                s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);
                s.window = new utils.Buf8(s.w_size * 2);
                s.head = new utils.Buf16(s.hash_size);
                s.prev = new utils.Buf16(s.w_size);
                s.lit_bufsize = 1 << memLevel + 6;
                s.pending_buf_size = s.lit_bufsize * 4;
                s.pending_buf = new utils.Buf8(s.pending_buf_size);
                s.d_buf = s.lit_bufsize >> 1;
                s.l_buf = (1 + 2) * s.lit_bufsize;
                s.level = level;
                s.strategy = strategy;
                s.method = method; return deflateReset(strm) }

            function deflateInit(strm, level) { return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY) }

            function deflate(strm, flush) {
                var old_flush, s;
                var beg, val;
                if (!strm || !strm.state || flush > Z_BLOCK || flush < 0) { return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR }
                s = strm.state;
                if (!strm.output || !strm.input && strm.avail_in !== 0 || s.status === FINISH_STATE && flush !== Z_FINISH) { return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR) }
                s.strm = strm;
                old_flush = s.last_flush;
                s.last_flush = flush;
                if (s.status === INIT_STATE) { if (s.wrap === 2) { strm.adler = 0;
                        put_byte(s, 31);
                        put_byte(s, 139);
                        put_byte(s, 8); if (!s.gzhead) { put_byte(s, 0);
                            put_byte(s, 0);
                            put_byte(s, 0);
                            put_byte(s, 0);
                            put_byte(s, 0);
                            put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
                            put_byte(s, OS_CODE);
                            s.status = BUSY_STATE } else { put_byte(s, (s.gzhead.text ? 1 : 0) + (s.gzhead.hcrc ? 2 : 0) + (!s.gzhead.extra ? 0 : 4) + (!s.gzhead.name ? 0 : 8) + (!s.gzhead.comment ? 0 : 16));
                            put_byte(s, s.gzhead.time & 255);
                            put_byte(s, s.gzhead.time >> 8 & 255);
                            put_byte(s, s.gzhead.time >> 16 & 255);
                            put_byte(s, s.gzhead.time >> 24 & 255);
                            put_byte(s, s.level === 9 ? 2 : s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ? 4 : 0);
                            put_byte(s, s.gzhead.os & 255); if (s.gzhead.extra && s.gzhead.extra.length) { put_byte(s, s.gzhead.extra.length & 255);
                                put_byte(s, s.gzhead.extra.length >> 8 & 255) } if (s.gzhead.hcrc) { strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0) }
                            s.gzindex = 0;
                            s.status = EXTRA_STATE } } else { var header = Z_DEFLATED + (s.w_bits - 8 << 4) << 8; var level_flags = -1; if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) { level_flags = 0 } else if (s.level < 6) { level_flags = 1 } else if (s.level === 6) { level_flags = 2 } else { level_flags = 3 }
                        header |= level_flags << 6; if (s.strstart !== 0) { header |= PRESET_DICT }
                        header += 31 - header % 31;
                        s.status = BUSY_STATE;
                        putShortMSB(s, header); if (s.strstart !== 0) { putShortMSB(s, strm.adler >>> 16);
                            putShortMSB(s, strm.adler & 65535) }
                        strm.adler = 1 } }
                if (s.status === EXTRA_STATE) { if (s.gzhead.extra) { beg = s.pending; while (s.gzindex < (s.gzhead.extra.length & 65535)) { if (s.pending === s.pending_buf_size) { if (s.gzhead.hcrc && s.pending > beg) { strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg) }
                                flush_pending(strm);
                                beg = s.pending; if (s.pending === s.pending_buf_size) { break } }
                            put_byte(s, s.gzhead.extra[s.gzindex] & 255);
                            s.gzindex++ } if (s.gzhead.hcrc && s.pending > beg) { strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg) } if (s.gzindex === s.gzhead.extra.length) { s.gzindex = 0;
                            s.status = NAME_STATE } } else { s.status = NAME_STATE } }
                if (s.status === NAME_STATE) { if (s.gzhead.name) { beg = s.pending;
                        do { if (s.pending === s.pending_buf_size) { if (s.gzhead.hcrc && s.pending > beg) { strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg) }
                                flush_pending(strm);
                                beg = s.pending; if (s.pending === s.pending_buf_size) { val = 1; break } } if (s.gzindex < s.gzhead.name.length) { val = s.gzhead.name.charCodeAt(s.gzindex++) & 255 } else { val = 0 }
                            put_byte(s, val) } while (val !== 0); if (s.gzhead.hcrc && s.pending > beg) { strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg) } if (val === 0) { s.gzindex = 0;
                            s.status = COMMENT_STATE } } else { s.status = COMMENT_STATE } }
                if (s.status === COMMENT_STATE) { if (s.gzhead.comment) { beg = s.pending;
                        do { if (s.pending === s.pending_buf_size) { if (s.gzhead.hcrc && s.pending > beg) { strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg) }
                                flush_pending(strm);
                                beg = s.pending; if (s.pending === s.pending_buf_size) { val = 1; break } } if (s.gzindex < s.gzhead.comment.length) { val = s.gzhead.comment.charCodeAt(s.gzindex++) & 255 } else { val = 0 }
                            put_byte(s, val) } while (val !== 0); if (s.gzhead.hcrc && s.pending > beg) { strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg) } if (val === 0) { s.status = HCRC_STATE } } else { s.status = HCRC_STATE } }
                if (s.status === HCRC_STATE) { if (s.gzhead.hcrc) { if (s.pending + 2 > s.pending_buf_size) { flush_pending(strm) } if (s.pending + 2 <= s.pending_buf_size) { put_byte(s, strm.adler & 255);
                            put_byte(s, strm.adler >> 8 & 255);
                            strm.adler = 0;
                            s.status = BUSY_STATE } } else { s.status = BUSY_STATE } }
                if (s.pending !== 0) { flush_pending(strm); if (strm.avail_out === 0) { s.last_flush = -1; return Z_OK } } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) { return err(strm, Z_BUF_ERROR) }
                if (s.status === FINISH_STATE && strm.avail_in !== 0) { return err(strm, Z_BUF_ERROR) }
                if (strm.avail_in !== 0 || s.lookahead !== 0 || flush !== Z_NO_FLUSH && s.status !== FINISH_STATE) {
                    var bstate = s.strategy === Z_HUFFMAN_ONLY ? deflate_huff(s, flush) : s.strategy === Z_RLE ? deflate_rle(s, flush) : configuration_table[s.level].func(s, flush);
                    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) { s.status = FINISH_STATE }
                    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
                        if (strm.avail_out === 0) {
                            s.last_flush = -1
                        }
                        return Z_OK
                    }
                    if (bstate === BS_BLOCK_DONE) { if (flush === Z_PARTIAL_FLUSH) { trees._tr_align(s) } else if (flush !== Z_BLOCK) { trees._tr_stored_block(s, 0, 0, false); if (flush === Z_FULL_FLUSH) { zero(s.head); if (s.lookahead === 0) { s.strstart = 0;
                                    s.block_start = 0;
                                    s.insert = 0 } } }
                        flush_pending(strm); if (strm.avail_out === 0) { s.last_flush = -1; return Z_OK } }
                }
                if (flush !== Z_FINISH) { return Z_OK }
                if (s.wrap <= 0) { return Z_STREAM_END }
                if (s.wrap === 2) { put_byte(s, strm.adler & 255);
                    put_byte(s, strm.adler >> 8 & 255);
                    put_byte(s, strm.adler >> 16 & 255);
                    put_byte(s, strm.adler >> 24 & 255);
                    put_byte(s, strm.total_in & 255);
                    put_byte(s, strm.total_in >> 8 & 255);
                    put_byte(s, strm.total_in >> 16 & 255);
                    put_byte(s, strm.total_in >> 24 & 255) } else { putShortMSB(s, strm.adler >>> 16);
                    putShortMSB(s, strm.adler & 65535) }
                flush_pending(strm);
                if (s.wrap > 0) { s.wrap = -s.wrap }
                return s.pending !== 0 ? Z_OK : Z_STREAM_END
            }

            function deflateEnd(strm) { var status; if (!strm || !strm.state) { return Z_STREAM_ERROR }
                status = strm.state.status; if (status !== INIT_STATE && status !== EXTRA_STATE && status !== NAME_STATE && status !== COMMENT_STATE && status !== HCRC_STATE && status !== BUSY_STATE && status !== FINISH_STATE) { return err(strm, Z_STREAM_ERROR) }
                strm.state = null; return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK }
            exports.deflateInit = deflateInit;
            exports.deflateInit2 = deflateInit2;
            exports.deflateReset = deflateReset;
            exports.deflateResetKeep = deflateResetKeep;
            exports.deflateSetHeader = deflateSetHeader;
            exports.deflate = deflate;
            exports.deflateEnd = deflateEnd;
            exports.deflateInfo = "pako deflate (from Nodeca project)"
        }, { "../utils/common": 4, "./adler32": 6, "./crc32": 8, "./messages": 14, "./trees": 15 }],
        10: [function(require, module, exports) { "use strict";

            function GZheader() { this.text = 0;
                this.time = 0;
                this.xflags = 0;
                this.os = 0;
                this.extra = null;
                this.extra_len = 0;
                this.name = "";
                this.comment = "";
                this.hcrc = 0;
                this.done = false }
            module.exports = GZheader }, {}],
        11: [function(require, module, exports) { "use strict"; var BAD = 30; var TYPE = 12;
            module.exports = function inflate_fast(strm, start) { var state; var _in; var last; var _out; var beg; var end; var dmax; var wsize; var whave; var wnext; var s_window; var hold; var bits; var lcode; var dcode; var lmask; var dmask; var here; var op; var len; var dist; var from; var from_source; var input, output;
                state = strm.state;
                _in = strm.next_in;
                input = strm.input;
                last = _in + (strm.avail_in - 5);
                _out = strm.next_out;
                output = strm.output;
                beg = _out - (start - strm.avail_out);
                end = _out + (strm.avail_out - 257);
                dmax = state.dmax;
                wsize = state.wsize;
                whave = state.whave;
                wnext = state.wnext;
                s_window = state.window;
                hold = state.hold;
                bits = state.bits;
                lcode = state.lencode;
                dcode = state.distcode;
                lmask = (1 << state.lenbits) - 1;
                dmask = (1 << state.distbits) - 1;
                top: do { if (bits < 15) { hold += input[_in++] << bits;
                        bits += 8;
                        hold += input[_in++] << bits;
                        bits += 8 }
                    here = lcode[hold & lmask];
                    dolen: for (;;) { op = here >>> 24;
                        hold >>>= op;
                        bits -= op;
                        op = here >>> 16 & 255; if (op === 0) { output[_out++] = here & 65535 } else if (op & 16) { len = here & 65535;
                            op &= 15; if (op) { if (bits < op) { hold += input[_in++] << bits;
                                    bits += 8 }
                                len += hold & (1 << op) - 1;
                                hold >>>= op;
                                bits -= op } if (bits < 15) { hold += input[_in++] << bits;
                                bits += 8;
                                hold += input[_in++] << bits;
                                bits += 8 }
                            here = dcode[hold & dmask];
                            dodist: for (;;) { op = here >>> 24;
                                hold >>>= op;
                                bits -= op;
                                op = here >>> 16 & 255; if (op & 16) { dist = here & 65535;
                                    op &= 15; if (bits < op) { hold += input[_in++] << bits;
                                        bits += 8; if (bits < op) { hold += input[_in++] << bits;
                                            bits += 8 } }
                                    dist += hold & (1 << op) - 1; if (dist > dmax) { strm.msg = "invalid distance too far back";
                                        state.mode = BAD; break top }
                                    hold >>>= op;
                                    bits -= op;
                                    op = _out - beg; if (dist > op) { op = dist - op; if (op > whave) { if (state.sane) { strm.msg = "invalid distance too far back";
                                                state.mode = BAD; break top } }
                                        from = 0;
                                        from_source = s_window; if (wnext === 0) { from += wsize - op; if (op < len) { len -= op;
                                                do { output[_out++] = s_window[from++] } while (--op);
                                                from = _out - dist;
                                                from_source = output } } else if (wnext < op) { from += wsize + wnext - op;
                                            op -= wnext; if (op < len) { len -= op;
                                                do { output[_out++] = s_window[from++] } while (--op);
                                                from = 0; if (wnext < len) { op = wnext;
                                                    len -= op;
                                                    do { output[_out++] = s_window[from++] } while (--op);
                                                    from = _out - dist;
                                                    from_source = output } } } else { from += wnext - op; if (op < len) { len -= op;
                                                do { output[_out++] = s_window[from++] } while (--op);
                                                from = _out - dist;
                                                from_source = output } } while (len > 2) { output[_out++] = from_source[from++];
                                            output[_out++] = from_source[from++];
                                            output[_out++] = from_source[from++];
                                            len -= 3 } if (len) { output[_out++] = from_source[from++]; if (len > 1) { output[_out++] = from_source[from++] } } } else { from = _out - dist;
                                        do { output[_out++] = output[from++];
                                            output[_out++] = output[from++];
                                            output[_out++] = output[from++];
                                            len -= 3 } while (len > 2); if (len) { output[_out++] = output[from++]; if (len > 1) { output[_out++] = output[from++] } } } } else if ((op & 64) === 0) { here = dcode[(here & 65535) + (hold & (1 << op) - 1)]; continue dodist } else { strm.msg = "invalid distance code";
                                    state.mode = BAD; break top } break } } else if ((op & 64) === 0) { here = lcode[(here & 65535) + (hold & (1 << op) - 1)]; continue dolen } else if (op & 32) { state.mode = TYPE; break top } else { strm.msg = "invalid literal/length code";
                            state.mode = BAD; break top } break } } while (_in < last && _out < end);
                len = bits >> 3;
                _in -= len;
                bits -= len << 3;
                hold &= (1 << bits) - 1;
                strm.next_in = _in;
                strm.next_out = _out;
                strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
                strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
                state.hold = hold;
                state.bits = bits; return } }, {}],
        12: [function(require, module, exports) { "use strict"; var utils = require("../utils/common"); var adler32 = require("./adler32"); var crc32 = require("./crc32"); var inflate_fast = require("./inffast"); var inflate_table = require("./inftrees"); var CODES = 0; var LENS = 1; var DISTS = 2; var Z_FINISH = 4; var Z_BLOCK = 5; var Z_TREES = 6; var Z_OK = 0; var Z_STREAM_END = 1; var Z_NEED_DICT = 2; var Z_STREAM_ERROR = -2; var Z_DATA_ERROR = -3; var Z_MEM_ERROR = -4; var Z_BUF_ERROR = -5; var Z_DEFLATED = 8; var HEAD = 1; var FLAGS = 2; var TIME = 3; var OS = 4; var EXLEN = 5; var EXTRA = 6; var NAME = 7; var COMMENT = 8; var HCRC = 9; var DICTID = 10; var DICT = 11; var TYPE = 12; var TYPEDO = 13; var STORED = 14; var COPY_ = 15; var COPY = 16; var TABLE = 17; var LENLENS = 18; var CODELENS = 19; var LEN_ = 20; var LEN = 21; var LENEXT = 22; var DIST = 23; var DISTEXT = 24; var MATCH = 25; var LIT = 26; var CHECK = 27; var LENGTH = 28; var DONE = 29; var BAD = 30; var MEM = 31; var SYNC = 32; var ENOUGH_LENS = 852; var ENOUGH_DISTS = 592; var MAX_WBITS = 15; var DEF_WBITS = MAX_WBITS;

            function ZSWAP32(q) { return (q >>> 24 & 255) + (q >>> 8 & 65280) + ((q & 65280) << 8) + ((q & 255) << 24) }

            function InflateState() { this.mode = 0;
                this.last = false;
                this.wrap = 0;
                this.havedict = false;
                this.flags = 0;
                this.dmax = 0;
                this.check = 0;
                this.total = 0;
                this.head = null;
                this.wbits = 0;
                this.wsize = 0;
                this.whave = 0;
                this.wnext = 0;
                this.window = null;
                this.hold = 0;
                this.bits = 0;
                this.length = 0;
                this.offset = 0;
                this.extra = 0;
                this.lencode = null;
                this.distcode = null;
                this.lenbits = 0;
                this.distbits = 0;
                this.ncode = 0;
                this.nlen = 0;
                this.ndist = 0;
                this.have = 0;
                this.next = null;
                this.lens = new utils.Buf16(320);
                this.work = new utils.Buf16(288);
                this.lendyn = null;
                this.distdyn = null;
                this.sane = 0;
                this.back = 0;
                this.was = 0 }

            function inflateResetKeep(strm) { var state; if (!strm || !strm.state) { return Z_STREAM_ERROR }
                state = strm.state;
                strm.total_in = strm.total_out = state.total = 0;
                strm.msg = ""; if (state.wrap) { strm.adler = state.wrap & 1 }
                state.mode = HEAD;
                state.last = 0;
                state.havedict = 0;
                state.dmax = 32768;
                state.head = null;
                state.hold = 0;
                state.bits = 0;
                state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
                state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);
                state.sane = 1;
                state.back = -1; return Z_OK }

            function inflateReset(strm) { var state; if (!strm || !strm.state) { return Z_STREAM_ERROR }
                state = strm.state;
                state.wsize = 0;
                state.whave = 0;
                state.wnext = 0; return inflateResetKeep(strm) }

            function inflateReset2(strm, windowBits) { var wrap; var state; if (!strm || !strm.state) { return Z_STREAM_ERROR }
                state = strm.state; if (windowBits < 0) { wrap = 0;
                    windowBits = -windowBits } else { wrap = (windowBits >> 4) + 1; if (windowBits < 48) { windowBits &= 15 } } if (windowBits && (windowBits < 8 || windowBits > 15)) { return Z_STREAM_ERROR } if (state.window !== null && state.wbits !== windowBits) { state.window = null }
                state.wrap = wrap;
                state.wbits = windowBits; return inflateReset(strm) }

            function inflateInit2(strm, windowBits) { var ret; var state; if (!strm) { return Z_STREAM_ERROR }
                state = new InflateState;
                strm.state = state;
                state.window = null;
                ret = inflateReset2(strm, windowBits); if (ret !== Z_OK) { strm.state = null } return ret }

            function inflateInit(strm) { return inflateInit2(strm, DEF_WBITS) } var virgin = true; var lenfix, distfix;

            function fixedtables(state) { if (virgin) { var sym;
                    lenfix = new utils.Buf32(512);
                    distfix = new utils.Buf32(32);
                    sym = 0; while (sym < 144) { state.lens[sym++] = 8 } while (sym < 256) { state.lens[sym++] = 9 } while (sym < 280) { state.lens[sym++] = 7 } while (sym < 288) { state.lens[sym++] = 8 }
                    inflate_table(LENS, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });
                    sym = 0; while (sym < 32) { state.lens[sym++] = 5 }
                    inflate_table(DISTS, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });
                    virgin = false }
                state.lencode = lenfix;
                state.lenbits = 9;
                state.distcode = distfix;
                state.distbits = 5 }

            function updatewindow(strm, src, end, copy) { var dist; var state = strm.state; if (state.window === null) { state.wsize = 1 << state.wbits;
                    state.wnext = 0;
                    state.whave = 0;
                    state.window = new utils.Buf8(state.wsize) } if (copy >= state.wsize) { utils.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
                    state.wnext = 0;
                    state.whave = state.wsize } else { dist = state.wsize - state.wnext; if (dist > copy) { dist = copy }
                    utils.arraySet(state.window, src, end - copy, dist, state.wnext);
                    copy -= dist; if (copy) { utils.arraySet(state.window, src, end - copy, copy, 0);
                        state.wnext = copy;
                        state.whave = state.wsize } else { state.wnext += dist; if (state.wnext === state.wsize) { state.wnext = 0 } if (state.whave < state.wsize) { state.whave += dist } } } return 0 }

            function inflate(strm, flush) { var state; var input, output; var next; var put; var have, left; var hold; var bits; var _in, _out; var copy; var from; var from_source; var here = 0; var here_bits, here_op, here_val; var last_bits, last_op, last_val; var len; var ret; var hbuf = new utils.Buf8(4); var opts; var n; var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]; if (!strm || !strm.state || !strm.output || !strm.input && strm.avail_in !== 0) { return Z_STREAM_ERROR }
                state = strm.state; if (state.mode === TYPE) { state.mode = TYPEDO }
                put = strm.next_out;
                output = strm.output;
                left = strm.avail_out;
                next = strm.next_in;
                input = strm.input;
                have = strm.avail_in;
                hold = state.hold;
                bits = state.bits;
                _in = have;
                _out = left;
                ret = Z_OK;
                inf_leave: for (;;) { switch (state.mode) {
                        case HEAD:
                            if (state.wrap === 0) { state.mode = TYPEDO; break } while (bits < 16) { if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 } if (state.wrap & 2 && hold === 35615) { state.check = 0;
                                hbuf[0] = hold & 255;
                                hbuf[1] = hold >>> 8 & 255;
                                state.check = crc32(state.check, hbuf, 2, 0);
                                hold = 0;
                                bits = 0;
                                state.mode = FLAGS; break }
                            state.flags = 0; if (state.head) { state.head.done = false } if (!(state.wrap & 1) || (((hold & 255) << 8) + (hold >> 8)) % 31) { strm.msg = "incorrect header check";
                                state.mode = BAD; break } if ((hold & 15) !== Z_DEFLATED) { strm.msg = "unknown compression method";
                                state.mode = BAD; break }
                            hold >>>= 4;
                            bits -= 4;
                            len = (hold & 15) + 8; if (state.wbits === 0) { state.wbits = len } else if (len > state.wbits) { strm.msg = "invalid window size";
                                state.mode = BAD; break }
                            state.dmax = 1 << len;
                            strm.adler = state.check = 1;
                            state.mode = hold & 512 ? DICTID : TYPE;
                            hold = 0;
                            bits = 0; break;
                        case FLAGS:
                            while (bits < 16) { if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 }
                            state.flags = hold; if ((state.flags & 255) !== Z_DEFLATED) { strm.msg = "unknown compression method";
                                state.mode = BAD; break } if (state.flags & 57344) { strm.msg = "unknown header flags set";
                                state.mode = BAD; break } if (state.head) { state.head.text = hold >> 8 & 1 } if (state.flags & 512) { hbuf[0] = hold & 255;
                                hbuf[1] = hold >>> 8 & 255;
                                state.check = crc32(state.check, hbuf, 2, 0) }
                            hold = 0;
                            bits = 0;
                            state.mode = TIME;
                        case TIME:
                            while (bits < 32) { if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 } if (state.head) { state.head.time = hold } if (state.flags & 512) { hbuf[0] = hold & 255;
                                hbuf[1] = hold >>> 8 & 255;
                                hbuf[2] = hold >>> 16 & 255;
                                hbuf[3] = hold >>> 24 & 255;
                                state.check = crc32(state.check, hbuf, 4, 0) }
                            hold = 0;
                            bits = 0;
                            state.mode = OS;
                        case OS:
                            while (bits < 16) { if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 } if (state.head) { state.head.xflags = hold & 255;
                                state.head.os = hold >> 8 } if (state.flags & 512) { hbuf[0] = hold & 255;
                                hbuf[1] = hold >>> 8 & 255;
                                state.check = crc32(state.check, hbuf, 2, 0) }
                            hold = 0;
                            bits = 0;
                            state.mode = EXLEN;
                        case EXLEN:
                            if (state.flags & 1024) { while (bits < 16) { if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 }
                                state.length = hold; if (state.head) { state.head.extra_len = hold } if (state.flags & 512) { hbuf[0] = hold & 255;
                                    hbuf[1] = hold >>> 8 & 255;
                                    state.check = crc32(state.check, hbuf, 2, 0) }
                                hold = 0;
                                bits = 0 } else if (state.head) { state.head.extra = null }
                            state.mode = EXTRA;
                        case EXTRA:
                            if (state.flags & 1024) { copy = state.length; if (copy > have) { copy = have } if (copy) { if (state.head) { len = state.head.extra_len - state.length; if (!state.head.extra) { state.head.extra = new Array(state.head.extra_len) }
                                        utils.arraySet(state.head.extra, input, next, copy, len) } if (state.flags & 512) { state.check = crc32(state.check, input, copy, next) }
                                    have -= copy;
                                    next += copy;
                                    state.length -= copy } if (state.length) { break inf_leave } }
                            state.length = 0;
                            state.mode = NAME;
                        case NAME:
                            if (state.flags & 2048) { if (have === 0) { break inf_leave }
                                copy = 0;
                                do { len = input[next + copy++]; if (state.head && len && state.length < 65536) { state.head.name += String.fromCharCode(len) } } while (len && copy < have); if (state.flags & 512) { state.check = crc32(state.check, input, copy, next) }
                                have -= copy;
                                next += copy; if (len) { break inf_leave } } else if (state.head) { state.head.name = null }
                            state.length = 0;
                            state.mode = COMMENT;
                        case COMMENT:
                            if (state.flags & 4096) { if (have === 0) { break inf_leave }
                                copy = 0;
                                do { len = input[next + copy++]; if (state.head && len && state.length < 65536) { state.head.comment += String.fromCharCode(len) } } while (len && copy < have); if (state.flags & 512) { state.check = crc32(state.check, input, copy, next) }
                                have -= copy;
                                next += copy; if (len) { break inf_leave } } else if (state.head) { state.head.comment = null }
                            state.mode = HCRC;
                        case HCRC:
                            if (state.flags & 512) { while (bits < 16) { if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 } if (hold !== (state.check & 65535)) { strm.msg = "header crc mismatch";
                                    state.mode = BAD; break }
                                hold = 0;
                                bits = 0 } if (state.head) { state.head.hcrc = state.flags >> 9 & 1;
                                state.head.done = true }
                            strm.adler = state.check = 0;
                            state.mode = TYPE; break;
                        case DICTID:
                            while (bits < 32) { if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 }
                            strm.adler = state.check = ZSWAP32(hold);
                            hold = 0;
                            bits = 0;
                            state.mode = DICT;
                        case DICT:
                            if (state.havedict === 0) { strm.next_out = put;
                                strm.avail_out = left;
                                strm.next_in = next;
                                strm.avail_in = have;
                                state.hold = hold;
                                state.bits = bits; return Z_NEED_DICT }
                            strm.adler = state.check = 1;
                            state.mode = TYPE;
                        case TYPE:
                            if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave }
                        case TYPEDO:
                            if (state.last) { hold >>>= bits & 7;
                                bits -= bits & 7;
                                state.mode = CHECK; break } while (bits < 3) { if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 }
                            state.last = hold & 1;
                            hold >>>= 1;
                            bits -= 1; switch (hold & 3) {
                                case 0:
                                    state.mode = STORED; break;
                                case 1:
                                    fixedtables(state);
                                    state.mode = LEN_; if (flush === Z_TREES) { hold >>>= 2;
                                        bits -= 2; break inf_leave } break;
                                case 2:
                                    state.mode = TABLE; break;
                                case 3:
                                    strm.msg = "invalid block type";
                                    state.mode = BAD }
                            hold >>>= 2;
                            bits -= 2; break;
                        case STORED:
                            hold >>>= bits & 7;
                            bits -= bits & 7; while (bits < 32) { if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 } if ((hold & 65535) !== (hold >>> 16 ^ 65535)) { strm.msg = "invalid stored block lengths";
                                state.mode = BAD; break }
                            state.length = hold & 65535;
                            hold = 0;
                            bits = 0;
                            state.mode = COPY_; if (flush === Z_TREES) { break inf_leave }
                        case COPY_:
                            state.mode = COPY;
                        case COPY:
                            copy = state.length; if (copy) { if (copy > have) { copy = have } if (copy > left) { copy = left } if (copy === 0) { break inf_leave }
                                utils.arraySet(output, input, next, copy, put);
                                have -= copy;
                                next += copy;
                                left -= copy;
                                put += copy;
                                state.length -= copy; break }
                            state.mode = TYPE; break;
                        case TABLE:
                            while (bits < 14) { if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 }
                            state.nlen = (hold & 31) + 257;
                            hold >>>= 5;
                            bits -= 5;
                            state.ndist = (hold & 31) + 1;
                            hold >>>= 5;
                            bits -= 5;
                            state.ncode = (hold & 15) + 4;
                            hold >>>= 4;
                            bits -= 4; if (state.nlen > 286 || state.ndist > 30) { strm.msg = "too many length or distance symbols";
                                state.mode = BAD; break }
                            state.have = 0;
                            state.mode = LENLENS;
                        case LENLENS:
                            while (state.have < state.ncode) { while (bits < 3) { if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 }
                                state.lens[order[state.have++]] = hold & 7;
                                hold >>>= 3;
                                bits -= 3 } while (state.have < 19) { state.lens[order[state.have++]] = 0 }
                            state.lencode = state.lendyn;
                            state.lenbits = 7;
                            opts = { bits: state.lenbits };
                            ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
                            state.lenbits = opts.bits; if (ret) { strm.msg = "invalid code lengths set";
                                state.mode = BAD; break }
                            state.have = 0;
                            state.mode = CODELENS;
                        case CODELENS:
                            while (state.have < state.nlen + state.ndist) { for (;;) { here = state.lencode[hold & (1 << state.lenbits) - 1];
                                    here_bits = here >>> 24;
                                    here_op = here >>> 16 & 255;
                                    here_val = here & 65535; if (here_bits <= bits) { break } if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 } if (here_val < 16) { hold >>>= here_bits;
                                    bits -= here_bits;
                                    state.lens[state.have++] = here_val } else { if (here_val === 16) { n = here_bits + 2; while (bits < n) { if (have === 0) { break inf_leave }
                                            have--;
                                            hold += input[next++] << bits;
                                            bits += 8 }
                                        hold >>>= here_bits;
                                        bits -= here_bits; if (state.have === 0) { strm.msg = "invalid bit length repeat";
                                            state.mode = BAD; break }
                                        len = state.lens[state.have - 1];
                                        copy = 3 + (hold & 3);
                                        hold >>>= 2;
                                        bits -= 2 } else if (here_val === 17) { n = here_bits + 3; while (bits < n) { if (have === 0) { break inf_leave }
                                            have--;
                                            hold += input[next++] << bits;
                                            bits += 8 }
                                        hold >>>= here_bits;
                                        bits -= here_bits;
                                        len = 0;
                                        copy = 3 + (hold & 7);
                                        hold >>>= 3;
                                        bits -= 3 } else { n = here_bits + 7; while (bits < n) { if (have === 0) { break inf_leave }
                                            have--;
                                            hold += input[next++] << bits;
                                            bits += 8 }
                                        hold >>>= here_bits;
                                        bits -= here_bits;
                                        len = 0;
                                        copy = 11 + (hold & 127);
                                        hold >>>= 7;
                                        bits -= 7 } if (state.have + copy > state.nlen + state.ndist) { strm.msg = "invalid bit length repeat";
                                        state.mode = BAD; break } while (copy--) { state.lens[state.have++] = len } } } if (state.mode === BAD) { break } if (state.lens[256] === 0) { strm.msg = "invalid code -- missing end-of-block";
                                state.mode = BAD; break }
                            state.lenbits = 9;
                            opts = { bits: state.lenbits };
                            ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
                            state.lenbits = opts.bits; if (ret) { strm.msg = "invalid literal/lengths set";
                                state.mode = BAD; break }
                            state.distbits = 6;
                            state.distcode = state.distdyn;
                            opts = { bits: state.distbits };
                            ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
                            state.distbits = opts.bits; if (ret) { strm.msg = "invalid distances set";
                                state.mode = BAD; break }
                            state.mode = LEN_; if (flush === Z_TREES) { break inf_leave }
                        case LEN_:
                            state.mode = LEN;
                        case LEN:
                            if (have >= 6 && left >= 258) { strm.next_out = put;
                                strm.avail_out = left;
                                strm.next_in = next;
                                strm.avail_in = have;
                                state.hold = hold;
                                state.bits = bits;
                                inflate_fast(strm, _out);
                                put = strm.next_out;
                                output = strm.output;
                                left = strm.avail_out;
                                next = strm.next_in;
                                input = strm.input;
                                have = strm.avail_in;
                                hold = state.hold;
                                bits = state.bits; if (state.mode === TYPE) { state.back = -1 } break }
                            state.back = 0; for (;;) { here = state.lencode[hold & (1 << state.lenbits) - 1];
                                here_bits = here >>> 24;
                                here_op = here >>> 16 & 255;
                                here_val = here & 65535; if (here_bits <= bits) { break } if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 } if (here_op && (here_op & 240) === 0) { last_bits = here_bits;
                                last_op = here_op;
                                last_val = here_val; for (;;) { here = state.lencode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                                    here_bits = here >>> 24;
                                    here_op = here >>> 16 & 255;
                                    here_val = here & 65535; if (last_bits + here_bits <= bits) { break } if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 }
                                hold >>>= last_bits;
                                bits -= last_bits;
                                state.back += last_bits }
                            hold >>>= here_bits;
                            bits -= here_bits;
                            state.back += here_bits;
                            state.length = here_val; if (here_op === 0) { state.mode = LIT; break } if (here_op & 32) { state.back = -1;
                                state.mode = TYPE; break } if (here_op & 64) { strm.msg = "invalid literal/length code";
                                state.mode = BAD; break }
                            state.extra = here_op & 15;
                            state.mode = LENEXT;
                        case LENEXT:
                            if (state.extra) { n = state.extra; while (bits < n) { if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 }
                                state.length += hold & (1 << state.extra) - 1;
                                hold >>>= state.extra;
                                bits -= state.extra;
                                state.back += state.extra }
                            state.was = state.length;
                            state.mode = DIST;
                        case DIST:
                            for (;;) { here = state.distcode[hold & (1 << state.distbits) - 1];
                                here_bits = here >>> 24;
                                here_op = here >>> 16 & 255;
                                here_val = here & 65535; if (here_bits <= bits) { break } if (have === 0) { break inf_leave }
                                have--;
                                hold += input[next++] << bits;
                                bits += 8 } if ((here_op & 240) === 0) { last_bits = here_bits;
                                last_op = here_op;
                                last_val = here_val; for (;;) { here = state.distcode[last_val + ((hold & (1 << last_bits + last_op) - 1) >> last_bits)];
                                    here_bits = here >>> 24;
                                    here_op = here >>> 16 & 255;
                                    here_val = here & 65535; if (last_bits + here_bits <= bits) { break } if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 }
                                hold >>>= last_bits;
                                bits -= last_bits;
                                state.back += last_bits }
                            hold >>>= here_bits;
                            bits -= here_bits;
                            state.back += here_bits; if (here_op & 64) { strm.msg = "invalid distance code";
                                state.mode = BAD; break }
                            state.offset = here_val;
                            state.extra = here_op & 15;
                            state.mode = DISTEXT;
                        case DISTEXT:
                            if (state.extra) { n = state.extra; while (bits < n) { if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 }
                                state.offset += hold & (1 << state.extra) - 1;
                                hold >>>= state.extra;
                                bits -= state.extra;
                                state.back += state.extra } if (state.offset > state.dmax) { strm.msg = "invalid distance too far back";
                                state.mode = BAD; break }
                            state.mode = MATCH;
                        case MATCH:
                            if (left === 0) { break inf_leave }
                            copy = _out - left; if (state.offset > copy) { copy = state.offset - copy; if (copy > state.whave) { if (state.sane) { strm.msg = "invalid distance too far back";
                                        state.mode = BAD; break } } if (copy > state.wnext) { copy -= state.wnext;
                                    from = state.wsize - copy } else { from = state.wnext - copy } if (copy > state.length) { copy = state.length }
                                from_source = state.window } else { from_source = output;
                                from = put - state.offset;
                                copy = state.length } if (copy > left) { copy = left }
                            left -= copy;
                            state.length -= copy;
                            do { output[put++] = from_source[from++] } while (--copy); if (state.length === 0) { state.mode = LEN } break;
                        case LIT:
                            if (left === 0) { break inf_leave }
                            output[put++] = state.length;
                            left--;
                            state.mode = LEN; break;
                        case CHECK:
                            if (state.wrap) { while (bits < 32) { if (have === 0) { break inf_leave }
                                    have--;
                                    hold |= input[next++] << bits;
                                    bits += 8 }
                                _out -= left;
                                strm.total_out += _out;
                                state.total += _out; if (_out) { strm.adler = state.check = state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out) }
                                _out = left; if ((state.flags ? hold : ZSWAP32(hold)) !== state.check) { strm.msg = "incorrect data check";
                                    state.mode = BAD; break }
                                hold = 0;
                                bits = 0 }
                            state.mode = LENGTH;
                        case LENGTH:
                            if (state.wrap && state.flags) { while (bits < 32) { if (have === 0) { break inf_leave }
                                    have--;
                                    hold += input[next++] << bits;
                                    bits += 8 } if (hold !== (state.total & 4294967295)) { strm.msg = "incorrect length check";
                                    state.mode = BAD; break }
                                hold = 0;
                                bits = 0 }
                            state.mode = DONE;
                        case DONE:
                            ret = Z_STREAM_END; break inf_leave;
                        case BAD:
                            ret = Z_DATA_ERROR; break inf_leave;
                        case MEM:
                            return Z_MEM_ERROR;
                        case SYNC:
                        default:
                            return Z_STREAM_ERROR } }
                strm.next_out = put;
                strm.avail_out = left;
                strm.next_in = next;
                strm.avail_in = have;
                state.hold = hold;
                state.bits = bits; if (state.wsize || _out !== strm.avail_out && state.mode < BAD && (state.mode < CHECK || flush !== Z_FINISH)) { if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) { state.mode = MEM; return Z_MEM_ERROR } }
                _in -= strm.avail_in;
                _out -= strm.avail_out;
                strm.total_in += _in;
                strm.total_out += _out;
                state.total += _out; if (state.wrap && _out) { strm.adler = state.check = state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out) }
                strm.data_type = state.bits + (state.last ? 64 : 0) + (state.mode === TYPE ? 128 : 0) + (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0); if ((_in === 0 && _out === 0 || flush === Z_FINISH) && ret === Z_OK) { ret = Z_BUF_ERROR } return ret }

            function inflateEnd(strm) { if (!strm || !strm.state) { return Z_STREAM_ERROR } var state = strm.state; if (state.window) { state.window = null }
                strm.state = null; return Z_OK }

            function inflateGetHeader(strm, head) { var state; if (!strm || !strm.state) { return Z_STREAM_ERROR }
                state = strm.state; if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR }
                state.head = head;
                head.done = false; return Z_OK }
            exports.inflateReset = inflateReset;
            exports.inflateReset2 = inflateReset2;
            exports.inflateResetKeep = inflateResetKeep;
            exports.inflateInit = inflateInit;
            exports.inflateInit2 = inflateInit2;
            exports.inflate = inflate;
            exports.inflateEnd = inflateEnd;
            exports.inflateGetHeader = inflateGetHeader;
            exports.inflateInfo = "pako inflate (from Nodeca project)" }, { "../utils/common": 4, "./adler32": 6, "./crc32": 8, "./inffast": 11, "./inftrees": 13 }],
        13: [function(require, module, exports) { "use strict"; var utils = require("../utils/common"); var MAXBITS = 15; var ENOUGH_LENS = 852; var ENOUGH_DISTS = 592; var CODES = 0; var LENS = 1; var DISTS = 2; var lbase = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0]; var lext = [16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78]; var dbase = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0]; var dext = [16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64];
            module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) { var bits = opts.bits; var len = 0; var sym = 0; var min = 0,
                    max = 0; var root = 0; var curr = 0; var drop = 0; var left = 0; var used = 0; var huff = 0; var incr; var fill; var low; var mask; var next; var base = null; var base_index = 0; var end; var count = new utils.Buf16(MAXBITS + 1); var offs = new utils.Buf16(MAXBITS + 1); var extra = null; var extra_index = 0; var here_bits, here_op, here_val; for (len = 0; len <= MAXBITS; len++) { count[len] = 0 } for (sym = 0; sym < codes; sym++) { count[lens[lens_index + sym]]++ }
                root = bits; for (max = MAXBITS; max >= 1; max--) { if (count[max] !== 0) { break } } if (root > max) { root = max } if (max === 0) { table[table_index++] = 1 << 24 | 64 << 16 | 0;
                    table[table_index++] = 1 << 24 | 64 << 16 | 0;
                    opts.bits = 1; return 0 } for (min = 1; min < max; min++) { if (count[min] !== 0) { break } } if (root < min) { root = min }
                left = 1; for (len = 1; len <= MAXBITS; len++) { left <<= 1;
                    left -= count[len]; if (left < 0) { return -1 } } if (left > 0 && (type === CODES || max !== 1)) { return -1 }
                offs[1] = 0; for (len = 1; len < MAXBITS; len++) { offs[len + 1] = offs[len] + count[len] } for (sym = 0; sym < codes; sym++) { if (lens[lens_index + sym] !== 0) { work[offs[lens[lens_index + sym]]++] = sym } } if (type === CODES) { base = extra = work;
                    end = 19 } else if (type === LENS) { base = lbase;
                    base_index -= 257;
                    extra = lext;
                    extra_index -= 257;
                    end = 256 } else { base = dbase;
                    extra = dext;
                    end = -1 }
                huff = 0;
                sym = 0;
                len = min;
                next = table_index;
                curr = root;
                drop = 0;
                low = -1;
                used = 1 << root;
                mask = used - 1; if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) { return 1 } var i = 0; for (;;) { i++;
                    here_bits = len - drop; if (work[sym] < end) { here_op = 0;
                        here_val = work[sym] } else if (work[sym] > end) { here_op = extra[extra_index + work[sym]];
                        here_val = base[base_index + work[sym]] } else { here_op = 32 + 64;
                        here_val = 0 }
                    incr = 1 << len - drop;
                    fill = 1 << curr;
                    min = fill;
                    do { fill -= incr;
                        table[next + (huff >> drop) + fill] = here_bits << 24 | here_op << 16 | here_val | 0 } while (fill !== 0);
                    incr = 1 << len - 1; while (huff & incr) { incr >>= 1 } if (incr !== 0) { huff &= incr - 1;
                        huff += incr } else { huff = 0 }
                    sym++; if (--count[len] === 0) { if (len === max) { break }
                        len = lens[lens_index + work[sym]] } if (len > root && (huff & mask) !== low) { if (drop === 0) { drop = root }
                        next += min;
                        curr = len - drop;
                        left = 1 << curr; while (curr + drop < max) { left -= count[curr + drop]; if (left <= 0) { break }
                            curr++;
                            left <<= 1 }
                        used += 1 << curr; if (type === LENS && used > ENOUGH_LENS || type === DISTS && used > ENOUGH_DISTS) { return 1 }
                        low = huff & mask;
                        table[low] = root << 24 | curr << 16 | next - table_index | 0 } } if (huff !== 0) { table[next + huff] = len - drop << 24 | 64 << 16 | 0 }
                opts.bits = root; return 0 } }, { "../utils/common": 4 }],
        14: [function(require, module, exports) { "use strict";
            module.exports = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" } }, {}],
        15: [function(require, module, exports) {
            "use strict";
            var utils = require("../utils/common");
            var Z_FIXED = 4;
            var Z_BINARY = 0;
            var Z_TEXT = 1;
            var Z_UNKNOWN = 2;

            function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0 } }
            var STORED_BLOCK = 0;
            var STATIC_TREES = 1;
            var DYN_TREES = 2;
            var MIN_MATCH = 3;
            var MAX_MATCH = 258;
            var LENGTH_CODES = 29;
            var LITERALS = 256;
            var L_CODES = LITERALS + 1 + LENGTH_CODES;
            var D_CODES = 30;
            var BL_CODES = 19;
            var HEAP_SIZE = 2 * L_CODES + 1;
            var MAX_BITS = 15;
            var Buf_size = 16;
            var MAX_BL_BITS = 7;
            var END_BLOCK = 256;
            var REP_3_6 = 16;
            var REPZ_3_10 = 17;
            var REPZ_11_138 = 18;
            var extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
            var extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
            var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];
            var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
            var DIST_CODE_LEN = 512;
            var static_ltree = new Array((L_CODES + 2) * 2);
            zero(static_ltree);
            var static_dtree = new Array(D_CODES * 2);
            zero(static_dtree);
            var _dist_code = new Array(DIST_CODE_LEN);
            zero(_dist_code);
            var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
            zero(_length_code);
            var base_length = new Array(LENGTH_CODES);
            zero(base_length);
            var base_dist = new Array(D_CODES);
            zero(base_dist);
            var StaticTreeDesc = function(static_tree, extra_bits, extra_base, elems, max_length) { this.static_tree = static_tree;
                this.extra_bits = extra_bits;
                this.extra_base = extra_base;
                this.elems = elems;
                this.max_length = max_length;
                this.has_stree = static_tree && static_tree.length };
            var static_l_desc;
            var static_d_desc;
            var static_bl_desc;
            var TreeDesc = function(dyn_tree, stat_desc) { this.dyn_tree = dyn_tree;
                this.max_code = 0;
                this.stat_desc = stat_desc };

            function d_code(dist) { return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)] }

            function put_short(s, w) { s.pending_buf[s.pending++] = w & 255;
                s.pending_buf[s.pending++] = w >>> 8 & 255 }

            function send_bits(s, value, length) { if (s.bi_valid > Buf_size - length) { s.bi_buf |= value << s.bi_valid & 65535;
                    put_short(s, s.bi_buf);
                    s.bi_buf = value >> Buf_size - s.bi_valid;
                    s.bi_valid += length - Buf_size } else { s.bi_buf |= value << s.bi_valid & 65535;
                    s.bi_valid += length } }

            function send_code(s, c, tree) { send_bits(s, tree[c * 2], tree[c * 2 + 1]) }

            function bi_reverse(code, len) { var res = 0;
                do { res |= code & 1;
                    code >>>= 1;
                    res <<= 1 } while (--len > 0); return res >>> 1 }

            function bi_flush(s) { if (s.bi_valid === 16) { put_short(s, s.bi_buf);
                    s.bi_buf = 0;
                    s.bi_valid = 0 } else if (s.bi_valid >= 8) { s.pending_buf[s.pending++] = s.bi_buf & 255;
                    s.bi_buf >>= 8;
                    s.bi_valid -= 8 } }

            function gen_bitlen(s, desc) { var tree = desc.dyn_tree; var max_code = desc.max_code; var stree = desc.stat_desc.static_tree; var has_stree = desc.stat_desc.has_stree; var extra = desc.stat_desc.extra_bits; var base = desc.stat_desc.extra_base; var max_length = desc.stat_desc.max_length; var h; var n, m; var bits; var xbits; var f; var overflow = 0; for (bits = 0; bits <= MAX_BITS; bits++) { s.bl_count[bits] = 0 }
                tree[s.heap[s.heap_max] * 2 + 1] = 0; for (h = s.heap_max + 1; h < HEAP_SIZE; h++) { n = s.heap[h];
                    bits = tree[tree[n * 2 + 1] * 2 + 1] + 1; if (bits > max_length) { bits = max_length;
                        overflow++ }
                    tree[n * 2 + 1] = bits; if (n > max_code) { continue }
                    s.bl_count[bits]++;
                    xbits = 0; if (n >= base) { xbits = extra[n - base] }
                    f = tree[n * 2];
                    s.opt_len += f * (bits + xbits); if (has_stree) { s.static_len += f * (stree[n * 2 + 1] + xbits) } } if (overflow === 0) { return }
                do { bits = max_length - 1; while (s.bl_count[bits] === 0) { bits-- }
                    s.bl_count[bits]--;
                    s.bl_count[bits + 1] += 2;
                    s.bl_count[max_length]--;
                    overflow -= 2 } while (overflow > 0); for (bits = max_length; bits !== 0; bits--) { n = s.bl_count[bits]; while (n !== 0) { m = s.heap[--h]; if (m > max_code) { continue } if (tree[m * 2 + 1] !== bits) { s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
                            tree[m * 2 + 1] = bits }
                        n-- } } }

            function gen_codes(tree, max_code, bl_count) { var next_code = new Array(MAX_BITS + 1); var code = 0; var bits; var n; for (bits = 1; bits <= MAX_BITS; bits++) { next_code[bits] = code = code + bl_count[bits - 1] << 1 } for (n = 0; n <= max_code; n++) { var len = tree[n * 2 + 1]; if (len === 0) { continue }
                    tree[n * 2] = bi_reverse(next_code[len]++, len) } }

            function tr_static_init() { var n; var bits; var length; var code; var dist; var bl_count = new Array(MAX_BITS + 1);
                length = 0; for (code = 0; code < LENGTH_CODES - 1; code++) { base_length[code] = length; for (n = 0; n < 1 << extra_lbits[code]; n++) { _length_code[length++] = code } }
                _length_code[length - 1] = code;
                dist = 0; for (code = 0; code < 16; code++) { base_dist[code] = dist; for (n = 0; n < 1 << extra_dbits[code]; n++) { _dist_code[dist++] = code } }
                dist >>= 7; for (; code < D_CODES; code++) { base_dist[code] = dist << 7; for (n = 0; n < 1 << extra_dbits[code] - 7; n++) { _dist_code[256 + dist++] = code } } for (bits = 0; bits <= MAX_BITS; bits++) { bl_count[bits] = 0 }
                n = 0; while (n <= 143) { static_ltree[n * 2 + 1] = 8;
                    n++;
                    bl_count[8]++ } while (n <= 255) { static_ltree[n * 2 + 1] = 9;
                    n++;
                    bl_count[9]++ } while (n <= 279) { static_ltree[n * 2 + 1] = 7;
                    n++;
                    bl_count[7]++ } while (n <= 287) { static_ltree[n * 2 + 1] = 8;
                    n++;
                    bl_count[8]++ }
                gen_codes(static_ltree, L_CODES + 1, bl_count); for (n = 0; n < D_CODES; n++) { static_dtree[n * 2 + 1] = 5;
                    static_dtree[n * 2] = bi_reverse(n, 5) }
                static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
                static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
                static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS) }

            function init_block(s) { var n; for (n = 0; n < L_CODES; n++) { s.dyn_ltree[n * 2] = 0 } for (n = 0; n < D_CODES; n++) { s.dyn_dtree[n * 2] = 0 } for (n = 0; n < BL_CODES; n++) { s.bl_tree[n * 2] = 0 }
                s.dyn_ltree[END_BLOCK * 2] = 1;
                s.opt_len = s.static_len = 0;
                s.last_lit = s.matches = 0 }

            function bi_windup(s) { if (s.bi_valid > 8) { put_short(s, s.bi_buf) } else if (s.bi_valid > 0) { s.pending_buf[s.pending++] = s.bi_buf }
                s.bi_buf = 0;
                s.bi_valid = 0 }

            function copy_block(s, buf, len, header) { bi_windup(s); if (header) { put_short(s, len);
                    put_short(s, ~len) }
                utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
                s.pending += len }

            function smaller(tree, n, m, depth) {
                var _n2 = n * 2;
                var _m2 = m * 2;
                return tree[_n2] < tree[_m2] || tree[_n2] === tree[_m2] && depth[n] <= depth[m]
            }

            function pqdownheap(s, tree, k) { var v = s.heap[k]; var j = k << 1; while (j <= s.heap_len) { if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) { j++ } if (smaller(tree, v, s.heap[j], s.depth)) { break }
                    s.heap[k] = s.heap[j];
                    k = j;
                    j <<= 1 }
                s.heap[k] = v }

            function compress_block(s, ltree, dtree) { var dist; var lc; var lx = 0; var code; var extra; if (s.last_lit !== 0) { do { dist = s.pending_buf[s.d_buf + lx * 2] << 8 | s.pending_buf[s.d_buf + lx * 2 + 1];
                        lc = s.pending_buf[s.l_buf + lx];
                        lx++; if (dist === 0) { send_code(s, lc, ltree) } else { code = _length_code[lc];
                            send_code(s, code + LITERALS + 1, ltree);
                            extra = extra_lbits[code]; if (extra !== 0) { lc -= base_length[code];
                                send_bits(s, lc, extra) }
                            dist--;
                            code = d_code(dist);
                            send_code(s, code, dtree);
                            extra = extra_dbits[code]; if (extra !== 0) { dist -= base_dist[code];
                                send_bits(s, dist, extra) } } } while (lx < s.last_lit) }
                send_code(s, END_BLOCK, ltree) }

            function build_tree(s, desc) { var tree = desc.dyn_tree; var stree = desc.stat_desc.static_tree; var has_stree = desc.stat_desc.has_stree; var elems = desc.stat_desc.elems; var n, m; var max_code = -1; var node;
                s.heap_len = 0;
                s.heap_max = HEAP_SIZE; for (n = 0; n < elems; n++) { if (tree[n * 2] !== 0) { s.heap[++s.heap_len] = max_code = n;
                        s.depth[n] = 0 } else { tree[n * 2 + 1] = 0 } } while (s.heap_len < 2) { node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
                    tree[node * 2] = 1;
                    s.depth[node] = 0;
                    s.opt_len--; if (has_stree) { s.static_len -= stree[node * 2 + 1] } }
                desc.max_code = max_code; for (n = s.heap_len >> 1; n >= 1; n--) { pqdownheap(s, tree, n) }
                node = elems;
                do { n = s.heap[1];
                    s.heap[1] = s.heap[s.heap_len--];
                    pqdownheap(s, tree, 1);
                    m = s.heap[1];
                    s.heap[--s.heap_max] = n;
                    s.heap[--s.heap_max] = m;
                    tree[node * 2] = tree[n * 2] + tree[m * 2];
                    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
                    tree[n * 2 + 1] = tree[m * 2 + 1] = node;
                    s.heap[1] = node++;
                    pqdownheap(s, tree, 1) } while (s.heap_len >= 2);
                s.heap[--s.heap_max] = s.heap[1];
                gen_bitlen(s, desc);
                gen_codes(tree, max_code, s.bl_count) }

            function scan_tree(s, tree, max_code) { var n; var prevlen = -1; var curlen; var nextlen = tree[0 * 2 + 1]; var count = 0; var max_count = 7; var min_count = 4; if (nextlen === 0) { max_count = 138;
                    min_count = 3 }
                tree[(max_code + 1) * 2 + 1] = 65535; for (n = 0; n <= max_code; n++) { curlen = nextlen;
                    nextlen = tree[(n + 1) * 2 + 1]; if (++count < max_count && curlen === nextlen) { continue } else if (count < min_count) { s.bl_tree[curlen * 2] += count } else if (curlen !== 0) { if (curlen !== prevlen) { s.bl_tree[curlen * 2]++ }
                        s.bl_tree[REP_3_6 * 2]++ } else if (count <= 10) { s.bl_tree[REPZ_3_10 * 2]++ } else { s.bl_tree[REPZ_11_138 * 2]++ }
                    count = 0;
                    prevlen = curlen; if (nextlen === 0) { max_count = 138;
                        min_count = 3 } else if (curlen === nextlen) { max_count = 6;
                        min_count = 3 } else { max_count = 7;
                        min_count = 4 } } }

            function send_tree(s, tree, max_code) { var n; var prevlen = -1; var curlen; var nextlen = tree[0 * 2 + 1]; var count = 0; var max_count = 7; var min_count = 4; if (nextlen === 0) { max_count = 138;
                    min_count = 3 } for (n = 0; n <= max_code; n++) { curlen = nextlen;
                    nextlen = tree[(n + 1) * 2 + 1]; if (++count < max_count && curlen === nextlen) { continue } else if (count < min_count) { do { send_code(s, curlen, s.bl_tree) } while (--count !== 0) } else if (curlen !== 0) { if (curlen !== prevlen) { send_code(s, curlen, s.bl_tree);
                            count-- }
                        send_code(s, REP_3_6, s.bl_tree);
                        send_bits(s, count - 3, 2) } else if (count <= 10) { send_code(s, REPZ_3_10, s.bl_tree);
                        send_bits(s, count - 3, 3) } else { send_code(s, REPZ_11_138, s.bl_tree);
                        send_bits(s, count - 11, 7) }
                    count = 0;
                    prevlen = curlen; if (nextlen === 0) { max_count = 138;
                        min_count = 3 } else if (curlen === nextlen) { max_count = 6;
                        min_count = 3 } else { max_count = 7;
                        min_count = 4 } } }

            function build_bl_tree(s) { var max_blindex;
                scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
                scan_tree(s, s.dyn_dtree, s.d_desc.max_code);
                build_tree(s, s.bl_desc); for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) { if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) { break } }
                s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4; return max_blindex }

            function send_all_trees(s, lcodes, dcodes, blcodes) { var rank;
                send_bits(s, lcodes - 257, 5);
                send_bits(s, dcodes - 1, 5);
                send_bits(s, blcodes - 4, 4); for (rank = 0; rank < blcodes; rank++) { send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3) }
                send_tree(s, s.dyn_ltree, lcodes - 1);
                send_tree(s, s.dyn_dtree, dcodes - 1) }

            function detect_data_type(s) { var black_mask = 4093624447; var n; for (n = 0; n <= 31; n++, black_mask >>>= 1) { if (black_mask & 1 && s.dyn_ltree[n * 2] !== 0) { return Z_BINARY } } if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) { return Z_TEXT } for (n = 32; n < LITERALS; n++) { if (s.dyn_ltree[n * 2] !== 0) { return Z_TEXT } } return Z_BINARY }
            var static_init_done = false;

            function _tr_init(s) { if (!static_init_done) { tr_static_init();
                    static_init_done = true }
                s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
                s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
                s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);
                s.bi_buf = 0;
                s.bi_valid = 0;
                init_block(s) }

            function _tr_stored_block(s, buf, stored_len, last) { send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
                copy_block(s, buf, stored_len, true) }

            function _tr_align(s) { send_bits(s, STATIC_TREES << 1, 3);
                send_code(s, END_BLOCK, static_ltree);
                bi_flush(s) }

            function _tr_flush_block(s, buf, stored_len, last) { var opt_lenb, static_lenb; var max_blindex = 0; if (s.level > 0) { if (s.strm.data_type === Z_UNKNOWN) { s.strm.data_type = detect_data_type(s) }
                    build_tree(s, s.l_desc);
                    build_tree(s, s.d_desc);
                    max_blindex = build_bl_tree(s);
                    opt_lenb = s.opt_len + 3 + 7 >>> 3;
                    static_lenb = s.static_len + 3 + 7 >>> 3; if (static_lenb <= opt_lenb) { opt_lenb = static_lenb } } else { opt_lenb = static_lenb = stored_len + 5 } if (stored_len + 4 <= opt_lenb && buf !== -1) { _tr_stored_block(s, buf, stored_len, last) } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) { send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
                    compress_block(s, static_ltree, static_dtree) } else { send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
                    send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
                    compress_block(s, s.dyn_ltree, s.dyn_dtree) }
                init_block(s); if (last) { bi_windup(s) } }

            function _tr_tally(s, dist, lc) { s.pending_buf[s.d_buf + s.last_lit * 2] = dist >>> 8 & 255;
                s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 255;
                s.pending_buf[s.l_buf + s.last_lit] = lc & 255;
                s.last_lit++; if (dist === 0) { s.dyn_ltree[lc * 2]++ } else { s.matches++;
                    dist--;
                    s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
                    s.dyn_dtree[d_code(dist) * 2]++ } return s.last_lit === s.lit_bufsize - 1 }
            exports._tr_init = _tr_init;
            exports._tr_stored_block = _tr_stored_block;
            exports._tr_flush_block = _tr_flush_block;
            exports._tr_tally = _tr_tally;
            exports._tr_align = _tr_align
        }, { "../utils/common": 4 }],
        16: [function(require, module, exports) { "use strict";

            function ZStream() { this.input = null;
                this.next_in = 0;
                this.avail_in = 0;
                this.total_in = 0;
                this.output = null;
                this.next_out = 0;
                this.avail_out = 0;
                this.total_out = 0;
                this.msg = "";
                this.state = null;
                this.data_type = 2;
                this.adler = 0 }
            module.exports = ZStream }, {}],
        17: [function(require, module, exports) { "use strict"; var nifti = nifti || {};
            nifti.NIFTI1 = nifti.NIFTI1 || (typeof require !== "undefined" ? require("./nifti1.js") : null);
            nifti.NIFTI2 = nifti.NIFTI2 || (typeof require !== "undefined" ? require("./nifti2.js") : null);
            nifti.Utils = nifti.Utils || (typeof require !== "undefined" ? require("./utilities.js") : null); var pako = pako || (typeof require !== "undefined" ? require("pako") : null);
            nifti.isNIFTI1 = function(data) { var buf, mag1, mag2, mag3; if (data.byteLength < nifti.NIFTI1.STANDARD_HEADER_SIZE) { return false }
                buf = new DataView(data); if (buf) mag1 = buf.getUint8(nifti.NIFTI1.MAGIC_NUMBER_LOCATION);
                mag2 = buf.getUint8(nifti.NIFTI1.MAGIC_NUMBER_LOCATION + 1);
                mag3 = buf.getUint8(nifti.NIFTI1.MAGIC_NUMBER_LOCATION + 2); return !!(mag1 === nifti.NIFTI1.MAGIC_NUMBER[0] && mag2 === nifti.NIFTI1.MAGIC_NUMBER[1] && mag3 === nifti.NIFTI1.MAGIC_NUMBER[2]) };
            nifti.isNIFTI2 = function(data) { var buf, mag1, mag2, mag3; if (data.byteLength < nifti.NIFTI1.STANDARD_HEADER_SIZE) { return false }
                buf = new DataView(data);
                mag1 = buf.getUint8(nifti.NIFTI2.MAGIC_NUMBER_LOCATION);
                mag2 = buf.getUint8(nifti.NIFTI2.MAGIC_NUMBER_LOCATION + 1);
                mag3 = buf.getUint8(nifti.NIFTI2.MAGIC_NUMBER_LOCATION + 2); return !!(mag1 === nifti.NIFTI2.MAGIC_NUMBER[0] && mag2 === nifti.NIFTI2.MAGIC_NUMBER[1] && mag3 === nifti.NIFTI2.MAGIC_NUMBER[2]) };
            nifti.isNIFTI = function(data) { return nifti.isNIFTI1(data) || nifti.isNIFTI2(data) };
            nifti.isCompressed = function(data) { var buf, magicCookie1, magicCookie2; if (data) { buf = new DataView(data);
                    magicCookie1 = buf.getUint8(0);
                    magicCookie2 = buf.getUint8(1); if (magicCookie1 === nifti.Utils.GUNZIP_MAGIC_COOKIE1) { return true } if (magicCookie2 === nifti.Utils.GUNZIP_MAGIC_COOKIE2) { return true } } return false };
            nifti.decompress = function(data) { return pako.inflate(data).buffer };
            nifti.readHeader = function(data) { var header = null; if (nifti.isCompressed(data)) { data = nifti.decompress(data) } if (nifti.isNIFTI1(data)) { header = new nifti.NIFTI1 } else if (nifti.isNIFTI2(data)) { header = new nifti.NIFTI2 } if (header) { header.readHeader(data) } else { console.error("That file does not appear to be NIFTI!") } return header };
            nifti.hasExtension = function(header) { return header.extensionFlag[0] != 0 };
            nifti.readImage = function(header, data) { var imageOffset = header.vox_offset,
                    timeDim = 1,
                    statDim = 1; if (header.dims[4]) { timeDim = header.dims[4] } if (header.dims[5]) { statDim = header.dims[5] } var imageSize = header.dims[1] * header.dims[2] * header.dims[3] * timeDim * statDim * (header.numBitsPerVoxel / 8); return data.slice(imageOffset, imageOffset + imageSize) };
            nifti.readExtension = function(header, data) { var loc = header.getExtensionLocation(),
                    size = header.extensionSize; return data.slice(loc, loc + size) };
            nifti.readExtensionData = function(header, data) { var loc = header.getExtensionLocation(),
                    size = header.extensionSize; return data.slice(loc + 8, loc + size - 8) }; var moduleType = typeof module; if (moduleType !== "undefined" && module.exports) { module.exports = nifti } }, { "./nifti1.js": 18, "./nifti2.js": 19, "./utilities.js": 20, pako: 1 }],
        18: [function(require, module, exports) { "use strict"; var nifti = nifti || {};
            nifti.Utils = nifti.Utils || (typeof require !== "undefined" ? require("./utilities.js") : null);
            nifti.NIFTI1 = nifti.NIFTI1 || function() { this.littleEndian = false;
                this.dim_info = 0;
                this.dims = [];
                this.intent_p1 = 0;
                this.intent_p2 = 0;
                this.intent_p3 = 0;
                this.intent_code = 0;
                this.datatypeCode = 0;
                this.numBitsPerVoxel = 0;
                this.slice_start = 0;
                this.slice_end = 0;
                this.slice_code = 0;
                this.pixDims = [];
                this.vox_offset = 0;
                this.scl_slope = 1;
                this.scl_inter = 0;
                this.xyzt_units = 0;
                this.cal_max = 0;
                this.cal_min = 0;
                this.slice_duration = 0;
                this.toffset = 0;
                this.description = "";
                this.aux_file = "";
                this.intent_name = "";
                this.qform_code = 0;
                this.sform_code = 0;
                this.quatern_b = 0;
                this.quatern_c = 0;
                this.quatern_d = 0;
                this.qoffset_x = 0;
                this.qoffset_y = 0;
                this.qoffset_z = 0;
                this.affine = [
                    [1, 0, 0, 0],
                    [0, 1, 0, 0],
                    [0, 0, 1, 0],
                    [0, 0, 0, 1]
                ];
                this.magic = 0;
                this.isHDR = false;
                this.extensionFlag = [0, 0, 0, 0];
                this.extensionSize = 0;
                this.extensionCode = 0 };
            nifti.NIFTI1.TYPE_NONE = 0;
            nifti.NIFTI1.TYPE_BINARY = 1;
            nifti.NIFTI1.TYPE_UINT8 = 2;
            nifti.NIFTI1.TYPE_INT16 = 4;
            nifti.NIFTI1.TYPE_INT32 = 8;
            nifti.NIFTI1.TYPE_FLOAT32 = 16;
            nifti.NIFTI1.TYPE_COMPLEX64 = 32;
            nifti.NIFTI1.TYPE_FLOAT64 = 64;
            nifti.NIFTI1.TYPE_RGB24 = 128;
            nifti.NIFTI1.TYPE_INT8 = 256;
            nifti.NIFTI1.TYPE_UINT16 = 512;
            nifti.NIFTI1.TYPE_UINT32 = 768;
            nifti.NIFTI1.TYPE_INT64 = 1024;
            nifti.NIFTI1.TYPE_UINT64 = 1280;
            nifti.NIFTI1.TYPE_FLOAT128 = 1536;
            nifti.NIFTI1.TYPE_COMPLEX128 = 1792;
            nifti.NIFTI1.TYPE_COMPLEX256 = 2048;
            nifti.NIFTI1.XFORM_UNKNOWN = 0;
            nifti.NIFTI1.XFORM_SCANNER_ANAT = 1;
            nifti.NIFTI1.XFORM_ALIGNED_ANAT = 2;
            nifti.NIFTI1.XFORM_TALAIRACH = 3;
            nifti.NIFTI1.XFORM_MNI_152 = 4;
            nifti.NIFTI1.SPATIAL_UNITS_MASK = 7;
            nifti.NIFTI1.TEMPORAL_UNITS_MASK = 56;
            nifti.NIFTI1.UNITS_UNKNOWN = 0;
            nifti.NIFTI1.UNITS_METER = 1;
            nifti.NIFTI1.UNITS_MM = 2;
            nifti.NIFTI1.UNITS_MICRON = 3;
            nifti.NIFTI1.UNITS_SEC = 8;
            nifti.NIFTI1.UNITS_MSEC = 16;
            nifti.NIFTI1.UNITS_USEC = 24;
            nifti.NIFTI1.UNITS_HZ = 32;
            nifti.NIFTI1.UNITS_PPM = 40;
            nifti.NIFTI1.UNITS_RADS = 48;
            nifti.NIFTI1.MAGIC_COOKIE = 348;
            nifti.NIFTI1.STANDARD_HEADER_SIZE = 348;
            nifti.NIFTI1.MAGIC_NUMBER_LOCATION = 344;
            nifti.NIFTI1.MAGIC_NUMBER = [110, 43, 49];
            nifti.NIFTI1.MAGIC_NUMBER2 = [110, 105, 49];
            nifti.NIFTI1.EXTENSION_HEADER_SIZE = 8;
            nifti.NIFTI1.prototype.readHeader = function(data) { var rawData = new DataView(data),
                    magicCookieVal = nifti.Utils.getIntAt(rawData, 0, this.littleEndian),
                    ctr, ctrOut, ctrIn, index; if (magicCookieVal !== nifti.NIFTI1.MAGIC_COOKIE) { this.littleEndian = true;
                    magicCookieVal = nifti.Utils.getIntAt(rawData, 0, this.littleEndian) } if (magicCookieVal !== nifti.NIFTI1.MAGIC_COOKIE) { throw new Error("This does not appear to be a NIFTI file!") }
                this.dim_info = nifti.Utils.getByteAt(rawData, 39); for (ctr = 0; ctr < 8; ctr += 1) { index = 40 + ctr * 2;
                    this.dims[ctr] = nifti.Utils.getShortAt(rawData, index, this.littleEndian) }
                this.intent_p1 = nifti.Utils.getFloatAt(rawData, 56, this.littleEndian);
                this.intent_p2 = nifti.Utils.getFloatAt(rawData, 60, this.littleEndian);
                this.intent_p3 = nifti.Utils.getFloatAt(rawData, 64, this.littleEndian);
                this.intent_code = nifti.Utils.getShortAt(rawData, 68, this.littleEndian);
                this.datatypeCode = nifti.Utils.getShortAt(rawData, 70, this.littleEndian);
                this.numBitsPerVoxel = nifti.Utils.getShortAt(rawData, 72, this.littleEndian);
                this.slice_start = nifti.Utils.getShortAt(rawData, 74, this.littleEndian); for (ctr = 0; ctr < 8; ctr += 1) { index = 76 + ctr * 4;
                    this.pixDims[ctr] = nifti.Utils.getFloatAt(rawData, index, this.littleEndian) }
                this.vox_offset = nifti.Utils.getFloatAt(rawData, 108, this.littleEndian);
                this.scl_slope = nifti.Utils.getFloatAt(rawData, 112, this.littleEndian);
                this.scl_inter = nifti.Utils.getFloatAt(rawData, 116, this.littleEndian);
                this.slice_end = nifti.Utils.getShortAt(rawData, 120, this.littleEndian);
                this.slice_code = nifti.Utils.getByteAt(rawData, 122);
                this.xyzt_units = nifti.Utils.getByteAt(rawData, 123);
                this.cal_max = nifti.Utils.getFloatAt(rawData, 124, this.littleEndian);
                this.cal_min = nifti.Utils.getFloatAt(rawData, 128, this.littleEndian);
                this.slice_duration = nifti.Utils.getFloatAt(rawData, 132, this.littleEndian);
                this.toffset = nifti.Utils.getFloatAt(rawData, 136, this.littleEndian);
                this.description = nifti.Utils.getStringAt(rawData, 148, 228);
                this.aux_file = nifti.Utils.getStringAt(rawData, 228, 252);
                this.qform_code = nifti.Utils.getShortAt(rawData, 252, this.littleEndian);
                this.sform_code = nifti.Utils.getShortAt(rawData, 254, this.littleEndian);
                this.quatern_b = nifti.Utils.getFloatAt(rawData, 256, this.littleEndian);
                this.quatern_c = nifti.Utils.getFloatAt(rawData, 260, this.littleEndian);
                this.quatern_d = nifti.Utils.getFloatAt(rawData, 264, this.littleEndian);
                this.qoffset_x = nifti.Utils.getFloatAt(rawData, 268, this.littleEndian);
                this.qoffset_y = nifti.Utils.getFloatAt(rawData, 272, this.littleEndian);
                this.qoffset_z = nifti.Utils.getFloatAt(rawData, 276, this.littleEndian); for (ctrOut = 0; ctrOut < 3; ctrOut += 1) { for (ctrIn = 0; ctrIn < 4; ctrIn += 1) { index = 280 + (ctrOut * 4 + ctrIn) * 4;
                        this.affine[ctrOut][ctrIn] = nifti.Utils.getFloatAt(rawData, index, this.littleEndian) } }
                this.affine[3][0] = 0;
                this.affine[3][1] = 0;
                this.affine[3][2] = 0;
                this.affine[3][3] = 1;
                this.intent_name = nifti.Utils.getStringAt(rawData, 328, 344);
                this.magic = nifti.Utils.getStringAt(rawData, 344, 348);
                this.isHDR = this.magic === nifti.NIFTI1.MAGIC_NUMBER2; if (rawData.byteLength > nifti.NIFTI1.MAGIC_COOKIE) { this.extensionFlag[0] = nifti.Utils.getByteAt(rawData, 348);
                    this.extensionFlag[1] = nifti.Utils.getByteAt(rawData, 348 + 1);
                    this.extensionFlag[2] = nifti.Utils.getByteAt(rawData, 348 + 2);
                    this.extensionFlag[3] = nifti.Utils.getByteAt(rawData, 348 + 3); if (this.extensionFlag[0]) { this.extensionSize = this.getExtensionSize(rawData);
                        this.extensionCode = this.getExtensionCode(rawData) } } };
            nifti.NIFTI1.prototype.toFormattedString = function() { var fmt = nifti.Utils.formatNumber,
                    string = "";
                string += "Dim Info = " + this.dim_info + "\n";
                string += "Image Dimensions (1-8): " + this.dims[0] + ", " + this.dims[1] + ", " + this.dims[2] + ", " + this.dims[3] + ", " + this.dims[4] + ", " + this.dims[5] + ", " + this.dims[6] + ", " + this.dims[7] + "\n";
                string += "Intent Parameters (1-3): " + this.intent_p1 + ", " + this.intent_p2 + ", " + this.intent_p3 + "\n";
                string += "Intent Code = " + this.intent_code + "\n";
                string += "Datatype = " + this.datatypeCode + " (" + this.getDatatypeCodeString(this.datatypeCode) + ")\n";
                string += "Bits Per Voxel = " + this.numBitsPerVoxel + "\n";
                string += "Slice Start = " + this.slice_start + "\n";
                string += "Voxel Dimensions (1-8): " + fmt(this.pixDims[0]) + ", " + fmt(this.pixDims[1]) + ", " + fmt(this.pixDims[2]) + ", " + fmt(this.pixDims[3]) + ", " + fmt(this.pixDims[4]) + ", " + fmt(this.pixDims[5]) + ", " + fmt(this.pixDims[6]) + ", " + fmt(this.pixDims[7]) + "\n";
                string += "Image Offset = " + this.vox_offset + "\n";
                string += "Data Scale:  Slope = " + fmt(this.scl_slope) + "  Intercept = " + fmt(this.scl_inter) + "\n";
                string += "Slice End = " + this.slice_end + "\n";
                string += "Slice Code = " + this.slice_code + "\n";
                string += "Units Code = " + this.xyzt_units + " (" + this.getUnitsCodeString(nifti.NIFTI1.SPATIAL_UNITS_MASK & this.xyzt_units) + ", " + this.getUnitsCodeString(nifti.NIFTI1.TEMPORAL_UNITS_MASK & this.xyzt_units) + ")\n";
                string += "Display Range:  Max = " + fmt(this.cal_max) + "  Min = " + fmt(this.cal_min) + "\n";
                string += "Slice Duration = " + this.slice_duration + "\n";
                string += "Time Axis Shift = " + this.toffset + "\n";
                string += 'Description: "' + this.description + '"\n';
                string += 'Auxiliary File: "' + this.aux_file + '"\n';
                string += "Q-Form Code = " + this.qform_code + " (" + this.getTransformCodeString(this.qform_code) + ")\n";
                string += "S-Form Code = " + this.sform_code + " (" + this.getTransformCodeString(this.sform_code) + ")\n";
                string += "Quaternion Parameters:  " + "b = " + fmt(this.quatern_b) + "  " + "c = " + fmt(this.quatern_c) + "  " + "d = " + fmt(this.quatern_d) + "\n";
                string += "Quaternion Offsets:  " + "x = " + this.qoffset_x + "  " + "y = " + this.qoffset_y + "  " + "z = " + this.qoffset_z + "\n";
                string += "S-Form Parameters X: " + fmt(this.affine[0][0]) + ", " + fmt(this.affine[0][1]) + ", " + fmt(this.affine[0][2]) + ", " + fmt(this.affine[0][3]) + "\n";
                string += "S-Form Parameters Y: " + fmt(this.affine[1][0]) + ", " + fmt(this.affine[1][1]) + ", " + fmt(this.affine[1][2]) + ", " + fmt(this.affine[1][3]) + "\n";
                string += "S-Form Parameters Z: " + fmt(this.affine[2][0]) + ", " + fmt(this.affine[2][1]) + ", " + fmt(this.affine[2][2]) + ", " + fmt(this.affine[2][3]) + "\n";
                string += 'Intent Name: "' + this.intent_name + '"\n'; if (this.extensionFlag[0]) { string += "Extension: Size = " + this.extensionSize + "  Code = " + this.extensionCode + "\n" } return string };
            nifti.NIFTI1.prototype.getDatatypeCodeString = function(code) { if (code === nifti.NIFTI1.TYPE_UINT8) { return "1-Byte Unsigned Integer" } else if (code === nifti.NIFTI1.TYPE_INT16) { return "2-Byte Signed Integer" } else if (code === nifti.NIFTI1.TYPE_INT32) { return "4-Byte Signed Integer" } else if (code === nifti.NIFTI1.TYPE_FLOAT32) { return "4-Byte Float" } else if (code === nifti.NIFTI1.TYPE_FLOAT64) { return "8-Byte Float" } else if (code === nifti.NIFTI1.TYPE_RGB24) { return "RGB" } else if (code === nifti.NIFTI1.TYPE_INT8) { return "1-Byte Signed Integer" } else if (code === nifti.NIFTI1.TYPE_UINT16) { return "2-Byte Unsigned Integer" } else if (code === nifti.NIFTI1.TYPE_UINT32) { return "4-Byte Unsigned Integer" } else if (code === nifti.NIFTI1.TYPE_INT64) { return "8-Byte Signed Integer" } else if (code === nifti.NIFTI1.TYPE_UINT64) { return "8-Byte Unsigned Integer" } else { return "Unknown" } };
            nifti.NIFTI1.prototype.getTransformCodeString = function(code) { if (code === nifti.NIFTI1.XFORM_SCANNER_ANAT) { return "Scanner" } else if (code === nifti.NIFTI1.XFORM_ALIGNED_ANAT) { return "Aligned" } else if (code === nifti.NIFTI1.XFORM_TALAIRACH) { return "Talairach" } else if (code === nifti.NIFTI1.XFORM_MNI_152) { return "MNI" } else { return "Unknown" } };
            nifti.NIFTI1.prototype.getUnitsCodeString = function(code) { if (code === nifti.NIFTI1.UNITS_METER) { return "Meters" } else if (code === nifti.NIFTI1.UNITS_MM) { return "Millimeters" } else if (code === nifti.NIFTI1.UNITS_MICRON) { return "Microns" } else if (code === nifti.NIFTI1.UNITS_SEC) { return "Seconds" } else if (code === nifti.NIFTI1.UNITS_MSEC) { return "Milliseconds" } else if (code === nifti.NIFTI1.UNITS_USEC) { return "Microseconds" } else if (code === nifti.NIFTI1.UNITS_HZ) { return "Hz" } else if (code === nifti.NIFTI1.UNITS_PPM) { return "PPM" } else if (code === nifti.NIFTI1.UNITS_RADS) { return "Rads" } else { return "Unknown" } };
            nifti.NIFTI1.prototype.getQformMat = function() { return this.convertNiftiQFormToNiftiSForm(this.quatern_b, this.quatern_c, this.quatern_d, this.qoffset_x, this.qoffset_y, this.qoffset_z, this.pixDims[1], this.pixDims[2], this.pixDims[3], this.pixDims[0]) };
            nifti.NIFTI1.prototype.convertNiftiQFormToNiftiSForm = function(qb, qc, qd, qx, qy, qz, dx, dy, dz, qfac) { var R = [
                        [0, 0, 0, 0],
                        [0, 0, 0, 0],
                        [0, 0, 0, 0],
                        [0, 0, 0, 0]
                    ],
                    a, b = qb,
                    c = qc,
                    d = qd,
                    xd, yd, zd;
                R[3][0] = R[3][1] = R[3][2] = 0;
                R[3][3] = 1;
                a = 1 - (b * b + c * c + d * d); if (a < 1e-7) { a = 1 / Math.sqrt(b * b + c * c + d * d);
                    b *= a;
                    c *= a;
                    d *= a;
                    a = 0 } else { a = Math.sqrt(a) }
                xd = dx > 0 ? dx : 1;
                yd = dy > 0 ? dy : 1;
                zd = dz > 0 ? dz : 1; if (qfac < 0) { zd = -zd }
                R[0][0] = (a * a + b * b - c * c - d * d) * xd;
                R[0][1] = 2 * (b * c - a * d) * yd;
                R[0][2] = 2 * (b * d + a * c) * zd;
                R[1][0] = 2 * (b * c + a * d) * xd;
                R[1][1] = (a * a + c * c - b * b - d * d) * yd;
                R[1][2] = 2 * (c * d - a * b) * zd;
                R[2][0] = 2 * (b * d - a * c) * xd;
                R[2][1] = 2 * (c * d + a * b) * yd;
                R[2][2] = (a * a + d * d - c * c - b * b) * zd;
                R[0][3] = qx;
                R[1][3] = qy;
                R[2][3] = qz; return R };
            nifti.NIFTI1.prototype.convertNiftiSFormToNEMA = function(R) { var xi, xj, xk, yi, yj, yk, zi, zj, zk, val, detQ, detP, i, j, k, p, q, r, ibest, jbest, kbest, pbest, qbest, rbest, M, vbest, Q, P, iChar, jChar, kChar, iSense, jSense, kSense;
                k = 0;
                Q = [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0]
                ];
                P = [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0]
                ];
                xi = R[0][0];
                xj = R[0][1];
                xk = R[0][2];
                yi = R[1][0];
                yj = R[1][1];
                yk = R[1][2];
                zi = R[2][0];
                zj = R[2][1];
                zk = R[2][2];
                val = Math.sqrt(xi * xi + yi * yi + zi * zi); if (val === 0) { return null }
                xi /= val;
                yi /= val;
                zi /= val;
                val = Math.sqrt(xj * xj + yj * yj + zj * zj); if (val === 0) { return null }
                xj /= val;
                yj /= val;
                zj /= val;
                val = xi * xj + yi * yj + zi * zj; if (Math.abs(val) > 1e-4) { xj -= val * xi;
                    yj -= val * yi;
                    zj -= val * zi;
                    val = Math.sqrt(xj * xj + yj * yj + zj * zj); if (val === 0) { return null }
                    xj /= val;
                    yj /= val;
                    zj /= val }
                val = Math.sqrt(xk * xk + yk * yk + zk * zk); if (val === 0) { xk = yi * zj - zi * yj;
                    yk = zi * xj - zj * xi;
                    zk = xi * yj - yi * xj } else { xk /= val;
                    yk /= val;
                    zk /= val }
                val = xi * xk + yi * yk + zi * zk; if (Math.abs(val) > 1e-4) { xk -= val * xi;
                    yk -= val * yi;
                    zk -= val * zi;
                    val = Math.sqrt(xk * xk + yk * yk + zk * zk); if (val === 0) { return null }
                    xk /= val;
                    yk /= val;
                    zk /= val }
                val = xj * xk + yj * yk + zj * zk; if (Math.abs(val) > 1e-4) { xk -= val * xj;
                    yk -= val * yj;
                    zk -= val * zj;
                    val = Math.sqrt(xk * xk + yk * yk + zk * zk); if (val === 0) { return null }
                    xk /= val;
                    yk /= val;
                    zk /= val }
                Q[0][0] = xi;
                Q[0][1] = xj;
                Q[0][2] = xk;
                Q[1][0] = yi;
                Q[1][1] = yj;
                Q[1][2] = yk;
                Q[2][0] = zi;
                Q[2][1] = zj;
                Q[2][2] = zk;
                detQ = this.nifti_mat33_determ(Q); if (detQ === 0) { return null }
                vbest = -666;
                ibest = pbest = qbest = rbest = 1;
                jbest = 2;
                kbest = 3; for (i = 1; i <= 3; i += 1) { for (j = 1; j <= 3; j += 1) { if (i !== j) { for (k = 1; k <= 3; k += 1) { if (!(i === k || j === k)) { P[0][0] = P[0][1] = P[0][2] = P[1][0] = P[1][1] = P[1][2] = P[2][0] = P[2][1] = P[2][2] = 0; for (p = -1; p <= 1; p += 2) { for (q = -1; q <= 1; q += 2) { for (r = -1; r <= 1; r += 2) { P[0][i - 1] = p;
                                                P[1][j - 1] = q;
                                                P[2][k - 1] = r;
                                                detP = this.nifti_mat33_determ(P); if (detP * detQ > 0) { M = this.nifti_mat33_mul(P, Q);
                                                    val = M[0][0] + M[1][1] + M[2][2]; if (val > vbest) { vbest = val;
                                                        ibest = i;
                                                        jbest = j;
                                                        kbest = k;
                                                        pbest = p;
                                                        qbest = q;
                                                        rbest = r } } } } } } } } } }
                iChar = jChar = kChar = iSense = jSense = kSense = 0; switch (ibest * pbest) {
                    case 1:
                        iChar = "X";
                        iSense = "+"; break;
                    case -1:
                        iChar = "X";
                        iSense = "-"; break;
                    case 2:
                        iChar = "Y";
                        iSense = "+"; break;
                    case -2:
                        iChar = "Y";
                        iSense = "-"; break;
                    case 3:
                        iChar = "Z";
                        iSense = "+"; break;
                    case -3:
                        iChar = "Z";
                        iSense = "-"; break } switch (jbest * qbest) {
                    case 1:
                        jChar = "X";
                        jSense = "+"; break;
                    case -1:
                        jChar = "X";
                        jSense = "-"; break;
                    case 2:
                        jChar = "Y";
                        jSense = "+"; break;
                    case -2:
                        jChar = "Y";
                        jSense = "-"; break;
                    case 3:
                        jChar = "Z";
                        jSense = "+"; break;
                    case -3:
                        jChar = "Z";
                        jSense = "-"; break } switch (kbest * rbest) {
                    case 1:
                        kChar = "X";
                        kSense = "+"; break;
                    case -1:
                        kChar = "X";
                        kSense = "-"; break;
                    case 2:
                        kChar = "Y";
                        kSense = "+"; break;
                    case -2:
                        kChar = "Y";
                        kSense = "-"; break;
                    case 3:
                        kChar = "Z";
                        kSense = "+"; break;
                    case -3:
                        kChar = "Z";
                        kSense = "-"; break } return iChar + jChar + kChar + iSense + jSense + kSense };
            nifti.NIFTI1.prototype.nifti_mat33_mul = function(A, B) { var C = [
                        [0, 0, 0],
                        [0, 0, 0],
                        [0, 0, 0]
                    ],
                    i, j; for (i = 0; i < 3; i += 1) { for (j = 0; j < 3; j += 1) { C[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j] } } return C };
            nifti.NIFTI1.prototype.nifti_mat33_determ = function(R) { var r11, r12, r13, r21, r22, r23, r31, r32, r33;
                r11 = R[0][0];
                r12 = R[0][1];
                r13 = R[0][2];
                r21 = R[1][0];
                r22 = R[1][1];
                r23 = R[1][2];
                r31 = R[2][0];
                r32 = R[2][1];
                r33 = R[2][2]; return r11 * r22 * r33 - r11 * r32 * r23 - r21 * r12 * r33 + r21 * r32 * r13 + r31 * r12 * r23 - r31 * r22 * r13 };
            nifti.NIFTI1.prototype.getExtensionLocation = function() { return nifti.NIFTI1.MAGIC_COOKIE + 4 };
            nifti.NIFTI1.prototype.getExtensionSize = function(data) { return nifti.Utils.getIntAt(data, this.getExtensionLocation(), this.littleEndian) };
            nifti.NIFTI1.prototype.getExtensionCode = function(data) { return nifti.Utils.getIntAt(data, this.getExtensionLocation() + 4, this.littleEndian) }; var moduleType = typeof module; if (moduleType !== "undefined" && module.exports) { module.exports = nifti.NIFTI1 } }, { "./utilities.js": 20 }],
        19: [function(require, module, exports) { "use strict"; var nifti = nifti || {};
            nifti.Utils = nifti.Utils || (typeof require !== "undefined" ? require("./utilities.js") : null);
            nifti.NIFTI1 = nifti.NIFTI1 || (typeof require !== "undefined" ? require("./nifti1.js") : null);
            nifti.NIFTI2 = nifti.NIFTI2 || function() { this.littleEndian = false;
                this.dim_info = 0;
                this.dims = [];
                this.intent_p1 = 0;
                this.intent_p2 = 0;
                this.intent_p3 = 0;
                this.intent_code = 0;
                this.datatypeCode = 0;
                this.numBitsPerVoxel = 0;
                this.slice_start = 0;
                this.slice_end = 0;
                this.slice_code = 0;
                this.pixDims = [];
                this.vox_offset = 0;
                this.scl_slope = 1;
                this.scl_inter = 0;
                this.xyzt_units = 0;
                this.cal_max = 0;
                this.cal_min = 0;
                this.slice_duration = 0;
                this.toffset = 0;
                this.description = "";
                this.aux_file = "";
                this.intent_name = "";
                this.qform_code = 0;
                this.sform_code = 0;
                this.quatern_b = 0;
                this.quatern_c = 0;
                this.quatern_d = 0;
                this.qoffset_x = 0;
                this.qoffset_y = 0;
                this.qoffset_z = 0;
                this.affine = [
                    [1, 0, 0, 0],
                    [0, 1, 0, 0],
                    [0, 0, 1, 0],
                    [0, 0, 0, 1]
                ];
                this.magic = 0;
                this.extensionFlag = [0, 0, 0, 0] };
            nifti.NIFTI2.MAGIC_COOKIE = 540;
            nifti.NIFTI2.MAGIC_NUMBER_LOCATION = 4;
            nifti.NIFTI2.MAGIC_NUMBER = [110, 43, 50, 0, 13, 10, 26, 10];
            nifti.NIFTI2.prototype.readHeader = function(data) { var rawData = new DataView(data),
                    magicCookieVal = nifti.Utils.getIntAt(rawData, 0, this.littleEndian),
                    ctr, ctrOut, ctrIn, index, array; if (magicCookieVal !== nifti.NIFTI2.MAGIC_COOKIE) { this.littleEndian = true;
                    magicCookieVal = nifti.Utils.getIntAt(rawData, 0, this.littleEndian) } if (magicCookieVal !== nifti.NIFTI2.MAGIC_COOKIE) { throw new Error("This does not appear to be a NIFTI file!") }
                this.datatypeCode = nifti.Utils.getShortAt(rawData, 12, this.littleEndian);
                this.numBitsPerVoxel = nifti.Utils.getShortAt(rawData, 14, this.littleEndian); for (ctr = 0; ctr < 8; ctr += 1) { index = 16 + ctr * 8;
                    this.dims[ctr] = nifti.Utils.getLongAt(rawData, index, this.littleEndian) }
                this.intent_p1 = nifti.Utils.getDoubleAt(rawData, 80, this.littleEndian);
                this.intent_p2 = nifti.Utils.getDoubleAt(rawData, 88, this.littleEndian);
                this.intent_p3 = nifti.Utils.getDoubleAt(rawData, 96, this.littleEndian); for (ctr = 0; ctr < 8; ctr += 1) { index = 104 + ctr * 8;
                    this.pixDims[ctr] = nifti.Utils.getDoubleAt(rawData, index, this.littleEndian) }
                this.vox_offset = nifti.Utils.getLongAt(rawData, 168, this.littleEndian);
                this.scl_slope = nifti.Utils.getDoubleAt(rawData, 176, this.littleEndian);
                this.scl_inter = nifti.Utils.getDoubleAt(rawData, 184, this.littleEndian);
                this.cal_max = nifti.Utils.getDoubleAt(rawData, 192, this.littleEndian);
                this.cal_min = nifti.Utils.getDoubleAt(rawData, 200, this.littleEndian);
                this.slice_duration = nifti.Utils.getDoubleAt(rawData, 208, this.littleEndian);
                this.toffset = nifti.Utils.getDoubleAt(rawData, 216, this.littleEndian);
                this.slice_start = nifti.Utils.getLongAt(rawData, 224, this.littleEndian);
                this.slice_end = nifti.Utils.getLongAt(rawData, 232, this.littleEndian);
                this.description = nifti.Utils.getStringAt(rawData, 240, 240 + 80);
                this.aux_file = nifti.Utils.getStringAt(rawData, 320, 320 + 24);
                this.qform_code = nifti.Utils.getIntAt(rawData, 344, this.littleEndian);
                this.sform_code = nifti.Utils.getIntAt(rawData, 348, this.littleEndian);
                this.quatern_b = nifti.Utils.getDoubleAt(rawData, 352, this.littleEndian);
                this.quatern_c = nifti.Utils.getDoubleAt(rawData, 360, this.littleEndian);
                this.quatern_d = nifti.Utils.getDoubleAt(rawData, 368, this.littleEndian);
                this.qoffset_x = nifti.Utils.getDoubleAt(rawData, 376, this.littleEndian);
                this.qoffset_y = nifti.Utils.getDoubleAt(rawData, 384, this.littleEndian);
                this.qoffset_z = nifti.Utils.getDoubleAt(rawData, 392, this.littleEndian); for (ctrOut = 0; ctrOut < 3; ctrOut += 1) { for (ctrIn = 0; ctrIn < 4; ctrIn += 1) { index = 400 + (ctrOut * 4 + ctrIn) * 8;
                        this.affine[ctrOut][ctrIn] = nifti.Utils.getDoubleAt(rawData, index, this.littleEndian) } }
                this.affine[3][0] = 0;
                this.affine[3][1] = 0;
                this.affine[3][2] = 0;
                this.affine[3][3] = 1;
                this.slice_code = nifti.Utils.getIntAt(rawData, 496, this.littleEndian);
                this.xyzt_units = nifti.Utils.getIntAt(rawData, 500, this.littleEndian);
                this.intent_code = nifti.Utils.getIntAt(rawData, 504, this.littleEndian);
                this.intent_name = nifti.Utils.getStringAt(rawData, 508, 508 + 16);
                this.dim_info = nifti.Utils.getByteAt(rawData, 524); if (rawData.byteLength > nifti.NIFTI2.MAGIC_COOKIE) { this.extensionFlag[0] = nifti.Utils.getByteAt(rawData, 540);
                    this.extensionFlag[1] = nifti.Utils.getByteAt(rawData, 540 + 1);
                    this.extensionFlag[2] = nifti.Utils.getByteAt(rawData, 540 + 2);
                    this.extensionFlag[3] = nifti.Utils.getByteAt(rawData, 540 + 3); if (this.extensionFlag[0]) { this.extensionSize = this.getExtensionSize(rawData);
                        this.extensionCode = this.getExtensionCode(rawData) } } };
            nifti.NIFTI2.prototype.toFormattedString = function() { var fmt = nifti.Utils.formatNumber,
                    string = "";
                string += "Datatype = " + +this.datatypeCode + " (" + this.getDatatypeCodeString(this.datatypeCode) + ")\n";
                string += "Bits Per Voxel = " + " = " + this.numBitsPerVoxel + "\n";
                string += "Image Dimensions" + " (1-8): " + this.dims[0] + ", " + this.dims[1] + ", " + this.dims[2] + ", " + this.dims[3] + ", " + this.dims[4] + ", " + this.dims[5] + ", " + this.dims[6] + ", " + this.dims[7] + "\n";
                string += "Intent Parameters (1-3): " + this.intent_p1 + ", " + this.intent_p2 + ", " + this.intent_p3 + "\n";
                string += "Voxel Dimensions (1-8): " + fmt(this.pixDims[0]) + ", " + fmt(this.pixDims[1]) + ", " + fmt(this.pixDims[2]) + ", " + fmt(this.pixDims[3]) + ", " + fmt(this.pixDims[4]) + ", " + fmt(this.pixDims[5]) + ", " + fmt(this.pixDims[6]) + ", " + fmt(this.pixDims[7]) + "\n";
                string += "Image Offset = " + this.vox_offset + "\n";
                string += "Data Scale:  Slope = " + fmt(this.scl_slope) + "  Intercept = " + fmt(this.scl_inter) + "\n";
                string += "Display Range:  Max = " + fmt(this.cal_max) + "  Min = " + fmt(this.cal_min) + "\n";
                string += "Slice Duration = " + this.slice_duration + "\n";
                string += "Time Axis Shift = " + this.toffset + "\n";
                string += "Slice Start = " + this.slice_start + "\n";
                string += "Slice End = " + this.slice_end + "\n";
                string += 'Description: "' + this.description + '"\n';
                string += 'Auxiliary File: "' + this.aux_file + '"\n';
                string += "Q-Form Code = " + this.qform_code + " (" + this.getTransformCodeString(this.qform_code) + ")\n";
                string += "S-Form Code = " + this.sform_code + " (" + this.getTransformCodeString(this.sform_code) + ")\n";
                string += "Quaternion Parameters:  " + "b = " + fmt(this.quatern_b) + "  " + "c = " + fmt(this.quatern_c) + "  " + "d = " + fmt(this.quatern_d) + "\n";
                string += "Quaternion Offsets:  " + "x = " + this.qoffset_x + "  " + "y = " + this.qoffset_y + "  " + "z = " + this.qoffset_z + "\n";
                string += "S-Form Parameters X: " + fmt(this.affine[0][0]) + ", " + fmt(this.affine[0][1]) + ", " + fmt(this.affine[0][2]) + ", " + fmt(this.affine[0][3]) + "\n";
                string += "S-Form Parameters Y: " + fmt(this.affine[1][0]) + ", " + fmt(this.affine[1][1]) + ", " + fmt(this.affine[1][2]) + ", " + fmt(this.affine[1][3]) + "\n";
                string += "S-Form Parameters Z: " + fmt(this.affine[2][0]) + ", " + fmt(this.affine[2][1]) + ", " + fmt(this.affine[2][2]) + ", " + fmt(this.affine[2][3]) + "\n";
                string += "Slice Code = " + this.slice_code + "\n";
                string += "Units Code = " + this.xyzt_units + " (" + this.getUnitsCodeString(nifti.NIFTI1.SPATIAL_UNITS_MASK & this.xyzt_units) + ", " + this.getUnitsCodeString(nifti.NIFTI1.TEMPORAL_UNITS_MASK & this.xyzt_units) + ")\n";
                string += "Intent Code = " + this.intent_code + "\n";
                string += 'Intent Name: "' + this.intent_name + '"\n';
                string += "Dim Info = " + this.dim_info + "\n"; return string };
            nifti.NIFTI2.prototype.getExtensionLocation = function() { return nifti.NIFTI2.MAGIC_COOKIE + 4 };
            nifti.NIFTI2.prototype.getExtensionSize = nifti.NIFTI1.prototype.getExtensionSize;
            nifti.NIFTI2.prototype.getExtensionCode = nifti.NIFTI1.prototype.getExtensionCode;
            nifti.NIFTI2.prototype.getDatatypeCodeString = nifti.NIFTI1.prototype.getDatatypeCodeString;
            nifti.NIFTI2.prototype.getTransformCodeString = nifti.NIFTI1.prototype.getTransformCodeString;
            nifti.NIFTI2.prototype.getUnitsCodeString = nifti.NIFTI1.prototype.getUnitsCodeString;
            nifti.NIFTI2.prototype.getQformMat = nifti.NIFTI1.prototype.getQformMat;
            nifti.NIFTI2.prototype.convertNiftiQFormToNiftiSForm = nifti.NIFTI1.prototype.convertNiftiQFormToNiftiSForm;
            nifti.NIFTI2.prototype.convertNiftiSFormToNEMA = nifti.NIFTI1.prototype.convertNiftiSFormToNEMA;
            nifti.NIFTI2.prototype.nifti_mat33_mul = nifti.NIFTI1.prototype.nifti_mat33_mul;
            nifti.NIFTI2.prototype.nifti_mat33_determ = nifti.NIFTI1.prototype.nifti_mat33_determ; var moduleType = typeof module; if (moduleType !== "undefined" && module.exports) { module.exports = nifti.NIFTI2 } }, { "./nifti1.js": 18, "./utilities.js": 20 }],
        20: [function(require, module, exports) {
            "use strict";
            var nifti = nifti || {};
            nifti.Utils = nifti.Utils || {};
            nifti.Utils.crcTable = null;
            nifti.Utils.GUNZIP_MAGIC_COOKIE1 = 31;
            nifti.Utils.GUNZIP_MAGIC_COOKIE2 = 139;
            nifti.Utils.getStringAt = function(data, start, end) { var str = "",
                    ctr, ch; for (ctr = start; ctr < end; ctr += 1) { ch = data.getUint8(ctr); if (ch !== 0) { str += String.fromCharCode(ch) } } return str };
            nifti.Utils.getByteAt = function(data, start) { return data.getInt8(start) };
            nifti.Utils.getShortAt = function(data, start, littleEndian) { return data.getInt16(start, littleEndian) };
            nifti.Utils.getIntAt = function(data, start, littleEndian) {
                return data.getInt32(start, littleEndian)
            };
            nifti.Utils.getFloatAt = function(data, start, littleEndian) { return data.getFloat32(start, littleEndian) };
            nifti.Utils.getDoubleAt = function(data, start, littleEndian) { return data.getFloat64(start, littleEndian) };
            nifti.Utils.getLongAt = function(data, start, littleEndian) { var ctr, array = [],
                    value = 0; for (ctr = 0; ctr < 8; ctr += 1) { array[ctr] = nifti.Utils.getByteAt(data, start + ctr, littleEndian) } for (ctr = array.length - 1; ctr >= 0; ctr--) { value = value * 256 + array[ctr] } return value };
            nifti.Utils.toArrayBuffer = function(buffer) { var ab, view, i;
                ab = new ArrayBuffer(buffer.length);
                view = new Uint8Array(ab); for (i = 0; i < buffer.length; i += 1) { view[i] = buffer[i] } return ab };
            nifti.Utils.isString = function(obj) { return typeof obj === "string" || obj instanceof String };
            nifti.Utils.formatNumber = function(num, shortFormat) { var val = 0; if (nifti.Utils.isString(num)) { val = Number(num) } else { val = num } if (shortFormat) { val = val.toPrecision(5) } else { val = val.toPrecision(7) } return parseFloat(val) };
            nifti.Utils.makeCRCTable = function() { var c; var crcTable = []; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) { c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1 }
                    crcTable[n] = c } return crcTable };
            nifti.Utils.crc32 = function(dataView) { var crcTable = nifti.Utils.crcTable || (nifti.Utils.crcTable = nifti.Utils.makeCRCTable()); var crc = 0 ^ -1; for (var i = 0; i < dataView.byteLength; i++) { crc = crc >>> 8 ^ crcTable[(crc ^ dataView.getUint8(i)) & 255] } return (crc ^ -1) >>> 0 };
            var moduleType = typeof module;
            if (moduleType !== "undefined" && module.exports) { module.exports = nifti.Utils }
        }, {}]
    }, {}, [17])(17)
});