/**
 * BrowserFS's main entry point.
 * It installs all of the needed polyfills, and requires() the main module.
 */
import global = require('./core/global');

// IE < 9 does not define this function.
if (!Date.now) {
  Date.now = function now() {
    return new Date().getTime();
  };
}

// IE < 9 does not define this function.
if(!Array.isArray) {
  Array.isArray = function (vArg): vArg is any[] {
    return Object.prototype.toString.call(vArg) === "[object Array]";
  };
}

// IE < 9 does not define this function.
// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function () {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj: any) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result: string[] = [], prop: string, i: number;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

// IE substr does not support negative indices
if ('ab'.substr(-1) !== 'b') {
  String.prototype.substr = function(substr: (start: number, length?: number) => string) {
    return function(start: number, length?: number): string {
      // did we get a negative start, calculate how much it is from the
      // beginning of the string
      if (start < 0) start = this.length + start;
      // call the original function
      return substr.call(this, start, length);
    }
  }(String.prototype.substr);
}

// IE < 9 does not support forEach
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function(fn: (value: string, index: number, array: string[]) => void, scope?: any): void {
    for (var i = 0; i < this.length; ++i) {
      if (i in this) {
        fn.call(scope, this[i], i, this);
      }
    }
  };
}

// IE < 9 does not support filter
// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
if (!Array.prototype.filter) {
  Array.prototype.filter = function(fun/*, thisArg*/) {
    'use strict';

    if (this === void 0 || this === null) {
      throw new TypeError();
    }

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun !== 'function') {
      throw new TypeError();
    }

    var res = [];
    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++) {
      if (i in t) {
        var val = t[i];

        // NOTE: Technically this should Object.defineProperty at
        //       the next index, as push can be affected by
        //       properties on Object.prototype and Array.prototype.
        //       But that method's new, and collisions should be
        //       rare, so use the more-compatible alternative.
        if (fun.call(thisArg, val, i, t)) {
          res.push(val);
        }
      }
    }

    return res;
  };
}

// Only IE10 has setImmediate.
// @todo: Determine viability of switching to the 'proper' polyfill for this.
if (typeof setImmediate === 'undefined') {
  var gScope = global;
  var timeouts: (() => void)[] = [];
  var messageName = "zero-timeout-message";
  var canUsePostMessage = function() {
    if (typeof gScope.importScripts !== 'undefined' || !gScope.postMessage) {
      return false;
    }
    var postMessageIsAsync = true;
    var oldOnMessage = gScope.onmessage;
    gScope.onmessage = function() {
      postMessageIsAsync = false;
    };
    gScope.postMessage('', '*');
    gScope.onmessage = oldOnMessage;
    return postMessageIsAsync;
  };
  if (canUsePostMessage()) {
    gScope.setImmediate = function(fn: () => void) {
      timeouts.push(fn);
      gScope.postMessage(messageName, "*");
    };
    var handleMessage = function(event: MessageEvent) {
      if (event.source === self && event.data === messageName) {
        if (event.stopPropagation) {
          event.stopPropagation();
        } else {
          event.cancelBubble = true;
        }
        if (timeouts.length > 0) {
          var fn = timeouts.shift();
          return fn();
        }
      }
    };
    if (gScope.addEventListener) {
      gScope.addEventListener('message', handleMessage, true);
    } else {
      gScope.attachEvent('onmessage', handleMessage);
    }
  } else if (gScope.MessageChannel) {
    // WebWorker MessageChannel
    var channel = new gScope.MessageChannel();
    channel.port1.onmessage = (event: any) => {
      if (timeouts.length > 0) {
        return timeouts.shift()();
      }
    };
    gScope.setImmediate = (fn: () => void) => {
      timeouts.push(fn);
      channel.port2.postMessage('');
    };
  } else {
    gScope.setImmediate = function(fn: () => void) {
      return setTimeout(fn, 0);
    };
  }
}

// IE<9 does not define indexOf.
// From: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(searchElement: any, fromIndex: number = 0): number {
    if (!this) {
      throw new TypeError();
    }

    var length = this.length;
    if (length === 0 || pivot >= length) {
      return -1;
    }

    var pivot = fromIndex;
    if (pivot < 0) {
      pivot = length + pivot;
    }

    for (var i = pivot; i < length; i++) {
      if (this[i] === searchElement) {
        return i;
      }
    }
    return -1;
  };
}

// IE<9 does not support forEach
// From: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function(fn: (value: string, index: number, array: string[]) => void, scope?: any) {
    var i: number, len: number;
    for (i = 0, len = this.length; i < len; ++i) {
      if (i in this) {
        fn.call(scope, this[i], i, this);
      }
    }
  };
}

// IE<9 does not support map
// From: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
if (!Array.prototype.map) {
  Array.prototype.map = function(callback: (value: string, index: number, array: string[]) => any, thisArg?: any): any[] {
    var T: any, A: any, k: any;
    if (this == null) {
      throw new TypeError(" this is null or not defined");
    }
    // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
    var O = Object(this);
    // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0;
    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }
    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if (thisArg) {
      T = thisArg;
    }
    // 6. Let A be a new array created as if by the expression new Array(len) where Array is
    // the standard built-in constructor with that name and len is the value of len.
    A = new Array(len);
    // 7. Let k be 0
    k = 0;
    // 8. Repeat, while k < len
    while(k < len) {
      var kValue: any, mappedValue: any;
      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if (k in O) {
        // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
        kValue = O[k];
        // ii. Let mappedValue be the result of calling the Call internal method of callback
        // with T as the this value and argument list containing kValue, k, and O.
        mappedValue = callback.call(T, kValue, k, O);
        // iii. Call the DefineOwnProperty internal method of A with arguments
        // Pk, Property Descriptor {Value: mappedValue, : true, Enumerable: true, Configurable: true},
        // and false.
        // In browsers that support Object.defineProperty, use the following:
        // Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });
        // For best browser support, use the following:
        A[k] = mappedValue;
      }
      // d. Increase k by 1.
      k++;
    }
    // 9. return A
    return A;
  };
}

/**
 * IE9 and below only: Injects a VBScript function that converts the
 * 'responseBody' attribute of an XMLHttpRequest into a bytestring.
 * From: http://miskun.com/javascript/internet-explorer-and-binary-files-data-access/#comment-17
 *
 * This must be performed *before* the page finishes loading, otherwise
 * document.write will refresh the page. :(
 *
 * This is harmless to inject into non-IE browsers.
 */
if (typeof(document) !== 'undefined' && typeof(window) !== 'undefined' && (<any> window)['chrome'] === undefined) {
  document.write("<!-- IEBinaryToArray_ByteStr -->\r\n"+
    "<script type='text/vbscript'>\r\n"+
    "Function IEBinaryToArray_ByteStr(Binary)\r\n"+
    " IEBinaryToArray_ByteStr = CStr(Binary)\r\n"+
    "End Function\r\n"+
    "Function IEBinaryToArray_ByteStr_Last(Binary)\r\n"+
    " Dim lastIndex\r\n"+
    " lastIndex = LenB(Binary)\r\n"+
    " if lastIndex mod 2 Then\r\n"+
    " IEBinaryToArray_ByteStr_Last = Chr( AscB( MidB( Binary, lastIndex, 1 ) ) )\r\n"+
    " Else\r\n"+
    " IEBinaryToArray_ByteStr_Last = "+'""'+"\r\n"+
    " End If\r\n"+
    "End Function\r\n"+
    "</script>\r\n");
}

import bfs = require('./core/browserfs');
export = bfs;
